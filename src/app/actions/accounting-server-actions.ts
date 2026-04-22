'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { FinancialRecord, FiscalRegime } from '@/types/accounting'
import { revalidatePath } from 'next/cache'
import { getReserveFundData, recordFundTransaction } from './reserve-fund-actions'

export async function updateFiscalRegime(regime: FiscalRegime, condominiumId?: string | null) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    try {
        console.log('Action: updateFiscalRegime started', { regime, condominiumId })
        
        // Get current org (needed for check)
        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!orgUser) {
            return { success: false, error: 'No tienes una organización vinculada.' }
        }

        if (condominiumId) {
            // Update specific condominium
            const { error: updateError } = await supabase
                .from('condominiums')
                .update({ fiscal_regime: regime })
                .eq('id', condominiumId)
                .eq('organization_id', orgUser.organization_id) // Security: check org ownership

            if (updateError) {
                console.error('Action: Condominium update error', updateError)
                return { success: false, error: `Error al actualizar condominio: ${updateError.message}` }
            }
        } else {
            // Fallback: Update organization-level regime
            const { error: updateError } = await supabase
                .from('organizations')
                .update({ fiscal_regime: regime })
                .eq('id', orgUser.organization_id)

            if (updateError) {
                console.error('Action: Organization update error', updateError)
                return { success: false, error: `Error al actualizar organización: ${updateError.message}` }
            }
        }
        
        revalidatePath('/dashboard/contabilidad-inteligente')
        return { success: true }
    } catch (e: any) {
        console.error('Action: Critical system error', e)
        return { success: false, error: `Error de sistema: ${e.message}` }
    }
}

export async function getAccountingData(condominiumId: string = 'all') {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // 1. Resolve Organization ID explicitly
    let organizationId: string | null = user.user_metadata?.organization_id || null

    if (!organizationId) {
        const { data: orgUser } = await supabase.from('organization_users').select('organization_id').eq('user_id', user.id).maybeSingle()
        organizationId = orgUser?.organization_id || null
    }

    if (!organizationId) {
        const { data: ownerOrg } = await supabase.from('organizations').select('id').eq('owner_id', user.id).maybeSingle()
        organizationId = ownerOrg?.id || null
    }

    if (!organizationId) {
        const { data: resUser } = await supabase.from('residents').select('condominiums(organization_id)').eq('user_id', user.id).maybeSingle()
        organizationId = (resUser?.condominiums as any)?.organization_id || null
    }

    if (!organizationId) {
        console.error('[AccountingServerAction] Critical: No organization resolved for user', user.id)
        return { success: false, error: 'No se encontró tu organización. Contacta a soporte.' }
    }

    // 2. Fetch accessible condominiums using the resolved organization
    const { data: allCondos, error: condoError } = await supabase
        .from('condominiums')
        .select('id, name, fiscal_regime, status, organization_id')
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })

    if (condoError) console.error('[AccountingAction] Error fetching condos:', condoError)

    const condominiums = allCondos || []
    
    // 3. Resolve Regime (From selected condo OR from Organization if 'all')
    let regime: FiscalRegime = null
    if (condominiumId && condominiumId !== 'all') {
        const selectedCondo = condominiums.find(c => c.id === condominiumId)
        regime = (selectedCondo?.fiscal_regime || null) as FiscalRegime
    } else {
        // Fallback to Org-level regime for consolidated view
        const { data: orgData } = await supabase
            .from('organizations')
            .select('fiscal_regime')
            .eq('id', organizationId)
            .single()
        regime = (orgData?.fiscal_regime || null) as FiscalRegime
    }

    // 2. DISCOVERY PHASE: Fetch all accessible Invoices (Incomes/Billing)
    let billingQuery = supabase
        .from('invoices')
        .select(`
            id, amount, status, created_at, folio, description,
            condominium_id,
            condominiums (name),
            units (unit_number)
        `)
    
    // Only filter by condo if one is selected, otherwise fetch all accessible
    if (condominiumId && condominiumId !== 'all') {
        billingQuery = billingQuery.eq('condominium_id', condominiumId)
    }

    const { data: billingData, error: billingError } = await billingQuery.order('created_at', { ascending: false })
    const billing = billingData || []

    if (billingError) console.error('[AccountingAction] Error fetching billing:', billingError)

    // 3. DISCOVERY PHASE: Fetch all accessible Manual Expenses from clean table
    let expensesQuery = supabase.from('condo_expenses').select('*, condominiums(name)')
    
    if (condominiumId && condominiumId !== 'all') {
        expensesQuery = expensesQuery.eq('condominium_id', condominiumId)
    } else if (organizationId) {
        expensesQuery = expensesQuery.eq('organization_id', organizationId)
    }

    const { data: expensesData, error: expError } = await expensesQuery.order('date', { ascending: false })
    if (expError && expError.code !== '42P01') console.error('Error fetching condo_expenses:', expError)
    const expenses = (expensesData || []).map((e: any) => ({
        ...e,
        iva_amount: Number(e.iva_amount) || 0
    }))

    const normalizeStatus = (s: string) => s?.toLowerCase() || ''

    // 4. Calculate Metrics (User Formulas)
    // Ingresos: SUM(billing.amount WHERE status = 'pagado')
    const totalCollected = billing
        .filter(b => normalizeStatus(b.status) === 'pagado' || normalizeStatus(b.status) === 'paid')
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

    // Cuentas por cobrar: SUM(billing.amount WHERE status != 'pagado')
    const totalReceivable = billing
        .filter(b => normalizeStatus(b.status) !== 'pagado' && normalizeStatus(b.status) !== 'paid')
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

    // Egresos: SUM(expenses.amount)
    const totalExpenses = expenses
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    // Total Facturado (Helper metric)
    const totalInvoiced = billing.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

    // Balance: ingresos - egresos
    const utilidad = totalCollected - totalExpenses
    const isrEstimado = regime ? Math.max(0, utilidad * 0.30) : 0

    // 5. Fetch Reserve Fund Data
    const fundData = condominiumId !== 'all' ? await getReserveFundData(condominiumId) : { exists: false, fund: null, transactions: [] }

    return {
        success: true,
        organizationId,
        condominiums: condominiums || [],
        selectedCondoId: condominiumId,
        regime,
        metrics: {
            totalCollected,
            totalReceivable,
            totalInvoiced,
            totalExpenses,
            utilidad,
            isrEstimado
        },
        // Combined Movements with Source Labels
        movements: [
            ...billing.map(inv => ({
                id: inv.id,
                type: 'ingreso',
                amount: inv.amount,
                category: 'Ingreso (facturación)',
                description: `${inv.folio || 'INV'} - ${inv.description || 'Consulta de pago'}`,
                date: inv.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                status: normalizeStatus(inv.status) === 'pagado' || normalizeStatus(inv.status) === 'paid' ? 'pagado' : 'pendiente',
                is_invoice: true,
                unit_number: (inv.units as any)?.unit_number,
                condominium_id: inv.condominium_id,
                condominium_name: (inv.condominiums as any)?.name
            })),
            ...expenses.map(e => ({
                ...e,
                type: 'egreso',
                status: 'pagado',
                category: e.category || 'Egreso',
                is_invoice: false,
                condominium_id: e.condominium_id,
                condominium_name: (e.condominiums as any)?.name
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        fundData,
        unitsInRange: [] // Not strictly needed for the manual expenses simplified model but keeping compatibility
    }
}

export async function createFinancialRecord(data: any) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    if (data.condominium_id === 'all' || !data.condominium_id) {
        throw new Error('Debes seleccionar una propiedad específica en el menú superior antes de registrar un gasto.')
    }

    // 1. Resolve Organization ID (Robust Multi-level Fallback)
    let organizationId: string | null = user.user_metadata?.organization_id || null

    if (!organizationId) {
        const { data: orgUser } = await supabase.from('organization_users').select('organization_id').eq('user_id', user.id).maybeSingle()
        organizationId = orgUser?.organization_id || null
    }

    if (!organizationId) {
        const { data: ownerOrg } = await supabase.from('organizations').select('id').eq('owner_id', user.id).maybeSingle()
        organizationId = ownerOrg?.id || null
    }

    if (!organizationId) {
        throw new Error('Organization not found')
    }

    // Ensure iva_amount is a number
    const iva_amount = Number(data.iva_amount) || 0;

    // 2. Handle Reserve Fund Usage Logic
    const useReserveFund = data.use_reserve_fund
    const reserveReason = data.reserve_reason
    
    // Remove fund-only fields before inserting into condo_expenses table
    const { use_reserve_fund, reserve_reason, ...expenseData } = data

    const { data: record, error } = await supabase
        .from('condo_expenses')
        .insert({
            ...expenseData,
            iva_amount,
            organization_id: organizationId,
            user_id: user.id
        })
        .select()
        .single()

    if (error) {
        console.error('Error in createFinancialRecord:', error)
        if (error.code === '42P01') {
            throw new Error('ATENCIÓN: Falta ejecutar el script SQL "condo_expenses_schema.sql" en Supabase para crear la base de datos.')
        }
        throw new Error(`Error en base de datos: ${error.message} (Code: ${error.code})`)
    }

    // 3. If fund was used, record the withdrawal
    if (useReserveFund && record) {
        await recordFundTransaction(expenseData.condominium_id, {
            type: 'withdrawal',
            amount: expenseData.amount,
            reason: reserveReason || 'Gasto operativo',
            description: `Vinculado a gasto: ${expenseData.description || expenseData.category}`,
            expense_id: record.id
        })
    }
    
    revalidatePath('/dashboard/contabilidad-inteligente')
    return record
}

export async function deleteFinancialRecord(id: string) {
    const supabase = await createClient()
    
    const { error } = await supabase
        .from('condo_expenses')
        .delete()
        .eq('id', id)

    if (error) throw error
    
    revalidatePath('/dashboard/contabilidad-inteligente')
    return { success: true }
}

export async function getTransparencyData(condominiumId: string) {
    const supabase = await createClient()
    const adminClient = createAdminClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // 1. SECURITY CHECK: Verify user is a resident or admin of this condo
    // We check using the standard user-session client first (respecting RLS)
    const { data: isResident } = await supabase
        .from('residents')
        .select('id')
        .eq('user_id', user.id)
        .eq('condominium_id', condominiumId)
        .maybeSingle()

    const { data: isAdmin } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!isResident && !isAdmin) {
        throw new Error('No tienes permiso para ver los datos de esta propiedad.')
    }

    // 2. FETCH DATA USING ADMIN CLIENT (Bypassing RLS for aggregate visibility)
    // We fetch everything for this specific condo
    
    // Resolve organization_id to get the fiscal regime correctly
    const { data: condo } = await adminClient
        .from('condominiums')
        .select('organization_id, fiscal_regime, name')
        .eq('id', condominiumId)
        .single()

    if (!condo) throw new Error('Condominio no encontrado')
    const organizationId = condo.organization_id
    const regime = condo.fiscal_regime as FiscalRegime

    // 2.a Invoices (Income)
    const { data: billing, error: billingError } = await adminClient
        .from('invoices')
        .select(`
            id, amount, status, created_at, folio, description,
            condominium_id,
            condominiums (name),
            units (unit_number)
        `)
        .eq('condominium_id', condominiumId)
        .order('created_at', { ascending: false })

    if (billingError) console.error('[TransparencyAction] Error fetching billing:', billingError)

    // 2.b Manual Expenses
    const { data: expenses, error: expError } = await adminClient
        .from('condo_expenses')
        .select('*, condominiums(name)')
        .eq('condominium_id', condominiumId)
        .order('date', { ascending: false })

    if (expError) console.error('[TransparencyAction] Error fetching expenses:', expError)

    const billingData = billing || []
    const expensesData = (expenses || []).map((e: any) => ({
        ...e,
        iva_amount: Number(e.iva_amount) || 0
    }))

    const normalizeStatus = (s: string) => s?.toLowerCase() || ''

    // 4. Calculate Metrics (Same logic as getAccountingData)
    const totalCollected = billingData
        .filter(b => normalizeStatus(b.status) === 'pagado' || normalizeStatus(b.status) === 'paid')
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

    const totalReceivable = billingData
        .filter(b => normalizeStatus(b.status) !== 'pagado' && normalizeStatus(b.status) !== 'paid')
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

    const totalExpenses = expensesData
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const totalInvoiced = billingData.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
    const utilidad = totalCollected - totalExpenses

    // 5. Fetch Reserve Fund Data (Read-only for transparency)
    const fundData = await getReserveFundData(condominiumId)

    return {
        success: true,
        metrics: {
            totalCollected,
            totalReceivable,
            totalInvoiced,
            totalExpenses,
            utilidad
        },
        movements: [
            ...billingData.map(inv => ({
                id: inv.id,
                type: 'ingreso',
                amount: inv.amount,
                category: 'Ingreso (facturación)',
                description: `${inv.folio || 'INV'} - ${inv.description || 'Consulta de pago'}`,
                date: inv.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                status: normalizeStatus(inv.status) === 'pagado' || normalizeStatus(inv.status) === 'paid' ? 'pagado' : 'pendiente',
                is_invoice: true,
                unit_number: (inv.units as any)?.unit_number,
                condominium_name: (inv.condominiums as any)?.name
            })),
            ...expensesData.map(e => ({
                ...e,
                type: 'egreso',
                status: 'pagado',
                category: e.category || 'Egreso',
                is_invoice: false,
                condominium_name: (e.condominiums as any)?.name
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        fundData
    }
}

