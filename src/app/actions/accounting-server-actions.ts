'use server'

import { createClient } from '@/utils/supabase/server'
import { FinancialRecord, FiscalRegime } from '@/types/accounting'
import { revalidatePath } from 'next/cache'

export async function updateFiscalRegime(regime: FiscalRegime) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get current org
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser) {
        return { success: false, error: 'No tienes una organización vinculada. Contacta al administrador.' }
    }

    try {
        console.log('Action: updateFiscalRegime started', { regime })
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.error('Action: No user found')
            return { success: false, error: 'Usuario no autenticado' }
        }
        console.log('Action: User identified', user.id)

        // Get current org
        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!orgUser) {
            console.error('Action: No org entry found for user', user.id)
            return { success: false, error: 'No tienes una organización vinculada. Contacta al administrador.' }
        }
        console.log('Action: Org found', orgUser.organization_id)

        const { error: updateError } = await supabase
            .from('organizations')
            .update({ fiscal_regime: regime })
            .eq('id', orgUser.organization_id)

        if (updateError) {
            console.error('Action: Database update error', updateError)
            return { success: false, error: `Error de base de datos: ${updateError.message}. ¿Ejecutaste el script SQL?` }
        }
        
        console.log('Action: Update successful, revalidating...')
        revalidatePath('/dashboard/contabilidad-inteligente')
        console.log('Action: Success!')
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
    
    const selectedCondo = condominiums.find(c => c.id === condominiumId)
    const regime = (selectedCondo?.fiscal_regime || null) as FiscalRegime

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
    const expenses = expensesData || []

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
            ...billing.filter(inv => normalizeStatus(inv.status) === 'pagado' || normalizeStatus(inv.status) === 'paid').map(inv => ({
                id: inv.id,
                type: 'ingreso',
                amount: inv.amount,
                category: 'Ingreso (facturación)',
                description: `${inv.folio || 'INV'} - ${inv.description || 'Consulta de pago'}`,
                date: inv.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                status: 'pagado',
                is_invoice: true,
                unit_number: (inv.units as any)?.unit_number,
                condominium_name: (inv.condominiums as any)?.name
            })),
            ...expenses.map(e => ({
                ...e,
                type: 'egreso',
                category: e.category || 'Egreso',
                is_invoice: false,
                condominium_name: (e.condominiums as any)?.name
            }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
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

    const { data: record, error } = await supabase
        .from('condo_expenses')
        .insert({
            ...data,
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

