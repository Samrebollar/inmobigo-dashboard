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

    // 2. DISCOVERY PHASE: Fetch all accessible Invoices — MIGRADO: usa resident_invoices
    // folio se construye dinámicamente: FAC-{id[0..8].toUpperCase()}
    let billingQuery = supabase
        .from('resident_invoices')
        .select(`
            id, amount, balance_due, status, created_at, description,
            condominium_id, invoice_type,
            condominiums (name),
            residents (unit_number)
        `)

    // Fetch Expected Income from Units
    let unitsQuery = supabase.from('units').select('monto_mensual, billing_status')
    if (condominiumId && condominiumId !== 'all') {
        unitsQuery = unitsQuery.eq('condominium_id', condominiumId)
    } else {
        const condoIds = condominiums.map(c => c.id)
        unitsQuery = unitsQuery.in('condominium_id', condoIds)
    }

    const { data: unitsForIncome } = await unitsQuery
    const expected_monthly_income = (unitsForIncome || [])
        .filter(u => u.billing_status !== 'suspended')
        .reduce((sum, u) => sum + (Number(u.monto_mensual) || 0), 0)

    if (condominiumId && condominiumId !== 'all') {
        billingQuery = billingQuery.eq('condominium_id', condominiumId)
    }

    const { data: billingData, error: billingError } = await billingQuery.order('created_at', { ascending: false })
    // Normalizar: agregar folio dinámico
    const billing = (billingData || []).map((inv: any) => ({
        ...inv,
        folio: `FAC-${inv.id.substring(0, 8).toUpperCase()}`,
        unit_number: (inv.residents as any)?.unit_number,
    }))

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
            totalInvoiced: expected_monthly_income, // Now showing Expected Monthly Income from Units
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
                payment_deadline: (inv.units as any)?.payment_deadline,
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
    const { data: condo } = await adminClient
        .from('condominiums')
        .select('organization_id, fiscal_regime, name')
        .eq('id', condominiumId)
        .single()

    if (!condo) throw new Error('Condominio no encontrado')
    const organizationId = condo.organization_id
    const regime = condo.fiscal_regime as FiscalRegime

    // ─── FILTRO: SOLO EL MES EN CURSO ─────────────────────────────────────────
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed
    // Primer día del mes actual (UTC)
    const monthStart = new Date(Date.UTC(currentYear, currentMonth, 1)).toISOString()
    // Primer día del mes SIGUIENTE (para filtro exclusivo con .lt)
    const monthEnd = new Date(Date.UTC(currentYear, currentMonth + 1, 1)).toISOString()
    // Nombre del mes para exponerlo al cliente
    const monthName = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    // ──────────────────────────────────────────────────────────────────────────

    // 2.a Invoices (Income) — MIGRADO: usa resident_invoices, solo del mes en curso
    const { data: billingRaw, error: billingError } = await adminClient
        .from('resident_invoices')
        .select(`
            id, amount, balance_due, status, created_at, description,
            condominium_id, invoice_type,
            condominiums (name),
            residents (unit_number)
        `)
        .eq('condominium_id', condominiumId)
        .gte('created_at', monthStart)
        .lt('created_at', monthEnd)
        .order('created_at', { ascending: false })
    const billing = (billingRaw || []).map((inv: any) => ({
        ...inv,
        folio: `FAC-${inv.id.substring(0, 8).toUpperCase()}`,
        unit_number: (inv.residents as any)?.unit_number,
    }))

    if (billingError) console.error('[TransparencyAction] Error fetching billing:', billingError)

    // 2.b Manual Expenses — solo del mes en curso
    const { data: expenses, error: expError } = await adminClient
        .from('condo_expenses')
        .select('*, condominiums(name)')
        .eq('condominium_id', condominiumId)
        .gte('date', monthStart.split('T')[0])  // date es DATE en Postgres
        .lt('date', monthEnd.split('T')[0])
        .order('date', { ascending: false })

    if (expError) console.error('[TransparencyAction] Error fetching expenses:', expError)

    // 2.c Expected monthly income from active units (Cobranza esperada del periodo)
    const { data: unitsData } = await adminClient
        .from('units')
        .select('monto_mensual, billing_status')
        .eq('condominium_id', condominiumId)
        .neq('billing_status', 'suspended')

    const expectedMonthlyIncome = (unitsData || [])
        .reduce((sum: number, u: any) => sum + (Number(u.monto_mensual) || 0), 0)

    const billingData = billing || []
    const expensesData = (expenses || []).map((e: any) => ({
        ...e,
        iva_amount: Number(e.iva_amount) || 0
    }))

    const normalizeStatus = (s: string) => s?.toLowerCase() || ''

    // isPaid: acepta 'paid' (inglés, tabla invoices) y 'pagado' (español, tabla condo_expenses)
    const isPaid = (s: string) => normalizeStatus(s) === 'paid' || normalizeStatus(s) === 'pagado'
    // isPending: acepta 'pending' (inglés) y 'pendiente' (español)
    const isPending = (s: string) => normalizeStatus(s) === 'pending' || normalizeStatus(s) === 'pendiente'
    // isOverdue: acepta 'overdue' (inglés) y 'vencido'/'moroso' (español)
    const isOverdue = (s: string) => normalizeStatus(s) === 'overdue' || normalizeStatus(s) === 'vencido' || normalizeStatus(s) === 'moroso'

    // 3. Calcular métricas — solo del mes en curso
    const totalCollected = billingData
        .filter(b => isPaid(b.status))
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

    const totalReceivable = billingData
        .filter(b => !isPaid(b.status))
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0)

    // totalInvoiced = cobranza esperada del periodo (suma de monto_mensual de unidades activas)
    const totalInvoiced = expectedMonthlyIncome

    // Diferencia no cobrada = Total esperado − Lo ya cobrado
    const uncollected = Math.max(0, totalInvoiced - totalCollected)

    // Regla de negocio: 
    //   - Días 1–10 del mes → la diferencia es "Pendiente" (dentro de plazo)
    //   - Día 11 en adelante → la diferencia es "Morosidad" (fuera de plazo)
    const todayDay = now.getDate()
    const totalPending = todayDay <= 10 ? uncollected : 0
    const totalOverdue = todayDay > 10 ? uncollected : 0

    const totalExpenses = expensesData
        .reduce((sum, e) => sum + (Number(e.amount) || 0), 0)

    const utilidad = totalCollected - totalExpenses

    // 4. Fetch Reserve Fund Data (Read-only for transparency)
    const fundData = await getReserveFundData(condominiumId)

    return {
        success: true,
        currentMonth: monthName,  // exponer el nombre del mes al cliente
        metrics: {
            totalCollected,
            totalReceivable,
            totalPending,
            totalOverdue,
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
                status: isPaid(inv.status) ? 'pagado' : isOverdue(inv.status) ? 'vencido' : 'pendiente',
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

