import type { SupabaseClient } from '@supabase/supabase-js'
import { getCondominiumAccess } from '@/lib/subscription-access'

/**
 * Regla de morosidad del residente (solo aplica si la suscripción del
 * administrador está activa; con la suscripción vencida ya se bloquea todo):
 * - Moroso = al menos una cuota de mantenimiento, multa, cuota extraordinaria
 *   o saldo inicial vencido y sin pagar.
 * - Con un convenio APROBADO, los cargos vencidos antes de su aprobación
 *   quedan cubiertos por el convenio; sigue moroso si una parcialidad del
 *   convenio se vence sin pagar, o si se vence un cargo nuevo.
 * - Moroso: sin Amenidades, Servicios ni Contacto (web y WhatsApp); solo
 *   puede consultar su saldo, pagar y solicitar un convenio.
 */
export const DELINQUENT_INVOICE_TYPES = ['maintenance', 'fine', 'special_assessment', 'initial_balance']

export const DELINQUENT_RESIDENT_MESSAGE =
    'Tienes pagos vencidos, por eso Amenidades, Servicios y Contacto están bloqueados. ' +
    'Ponte al corriente o solicita un convenio de pago para volver a usarlos.'

export interface ResidentDelinquency {
    delinquent: boolean
    overdueAmount: number
    overdueCount: number
    hasOverdueInstallment: boolean
}

const NOT_DELINQUENT: ResidentDelinquency = { delinquent: false, overdueAmount: 0, overdueCount: 0, hasOverdueInstallment: false }

const todayMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

export async function getResidentDelinquency(admin: SupabaseClient, residentId?: string | null): Promise<ResidentDelinquency> {
    if (!residentId) return NOT_DELINQUENT
    const today = todayMx()

    const { data: agreement } = await admin
        .from('payment_agreements')
        .select('id, approved_at')
        .eq('resident_id', residentId)
        .eq('status', 'approved')
        .order('approved_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()

    let invoiceQuery = admin
        .from('invoices')
        .select('amount, paid_amount, balance_due, due_date')
        .eq('resident_id', residentId)
        .in('invoice_type', DELINQUENT_INVOICE_TYPES)
        .not('status', 'in', '(paid,cancelled,refunded)')
        .lt('due_date', today)
    // Lo vencido antes del convenio aprobado queda cubierto por el convenio
    if (agreement?.approved_at) {
        invoiceQuery = invoiceQuery.gt('due_date', String(agreement.approved_at).slice(0, 10))
    }
    const { data: invoices } = await invoiceQuery

    const overdue = (invoices || [])
        .map((i: { amount: number | null; paid_amount: number | null; balance_due: number | null }) => Number(i.balance_due ?? (Number(i.amount || 0) - Number(i.paid_amount || 0))))
        .filter((balance) => balance > 0)

    let hasOverdueInstallment = false
    if (agreement) {
        const { data: installments } = await admin
            .from('agreement_installments')
            .select('id')
            .eq('agreement_id', agreement.id)
            .neq('status', 'paid')
            .lt('due_date', today)
            .limit(1)
        hasOverdueInstallment = (installments || []).length > 0
    }

    return {
        delinquent: overdue.length > 0 || hasOverdueInstallment,
        overdueAmount: overdue.reduce((sum, b) => sum + b, 0),
        overdueCount: overdue.length,
        hasOverdueInstallment,
    }
}

/**
 * Morosidad efectiva de un residente: si la suscripción de su condominio
 * está suspendida no se evalúa (ese bloqueo general ya aplica).
 */
export async function getEffectiveResidentDelinquency(
    admin: SupabaseClient,
    resident?: { id: string; condominium_id?: string | null } | null
): Promise<ResidentDelinquency> {
    if (!resident?.id) return NOT_DELINQUENT
    const access = await getCondominiumAccess(admin, resident.condominium_id)
    if (access.suspended) return NOT_DELINQUENT
    return getResidentDelinquency(admin, resident.id)
}

/**
 * Para server actions compartidas con administración: solo bloquea cuando
 * quien llama es el propio residente (el administrador sí puede registrar
 * cosas a nombre de un residente moroso).
 */
export async function getCallerResidentBlock(
    admin: SupabaseClient,
    userId: string | null | undefined,
    residentId?: string | null
): Promise<string | null> {
    if (!userId) return null
    const { data: resident } = await admin
        .from('residents')
        .select('id, condominium_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()
    if (!resident) return null
    // resident_id puede venir como residents.id o como auth user id según la tabla
    if (residentId && residentId !== resident.id && residentId !== userId) return null
    const status = await getEffectiveResidentDelinquency(admin, resident)
    return status.delinquent ? DELINQUENT_RESIDENT_MESSAGE : null
}
