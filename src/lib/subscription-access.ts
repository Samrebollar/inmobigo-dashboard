import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Regla de suscripción del administrador (organización):
 * - Activa mientras la fecha de próximo pago no haya pasado.
 * - Suspendida del día 1 al 30 sin pago: se bloquea todo el sistema
 *   (administrador, seguridad, residentes, pagos y WhatsApp); el
 *   administrador solo puede pagar su suscripción.
 * - Al día 31 sin pago la cuenta y los datos de sus residentes se eliminan.
 */
export const SUSPENSION_GRACE_DAYS = 30

export const SUSPENDED_RESIDENT_MESSAGE =
    'El servicio de InmobiGo de tu condominio está suspendido porque la administración no ha renovado su suscripción. ' +
    'Por ahora no puedes usar la App ni realizar pagos. Por favor comunícate con tu administración.'

export interface OrganizationAccess {
    suspended: boolean
    // Días para el próximo pago (negativo = días de atraso)
    daysRemaining: number
    // Días que faltan para la eliminación definitiva (solo si está suspendida)
    daysUntilDeletion: number | null
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

export const daysUntilDeletionFrom = (daysRemaining: number) =>
    daysRemaining <= 0 ? Math.max(0, SUSPENSION_GRACE_DAYS + daysRemaining) : null

/**
 * Misma lógica que usan los layouts: suscripción activa más reciente (o la
 * última creada) y su fecha de próximo pago; sin suscripción, 30 días desde
 * la creación de la organización.
 */
export async function getOrganizationAccess(
    admin: SupabaseClient,
    organizationId?: string | null
): Promise<OrganizationAccess> {
    if (!organizationId) return { suspended: false, daysRemaining: 999, daysUntilDeletion: null }

    let { data: sub } = await admin
        .from('subscriptions')
        .select('next_payment_date')
        .eq('organization_id', organizationId)
        .eq('subscription_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (!sub) {
        const { data: fallback } = await admin
            .from('subscriptions')
            .select('next_payment_date')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        sub = fallback
    }

    let dueDate: Date | null = sub?.next_payment_date ? new Date(sub.next_payment_date) : null
    if (!dueDate) {
        const { data: org } = await admin.from('organizations').select('created_at').eq('id', organizationId).maybeSingle()
        if (org?.created_at) dueDate = new Date(new Date(org.created_at).getTime() + 30 * MS_PER_DAY)
    }
    if (!dueDate) return { suspended: false, daysRemaining: 999, daysUntilDeletion: null }

    const daysRemaining = Math.ceil((dueDate.getTime() - Date.now()) / MS_PER_DAY)
    return {
        suspended: daysRemaining <= 0,
        daysRemaining,
        daysUntilDeletion: daysUntilDeletionFrom(daysRemaining),
    }
}

export async function getCondominiumAccess(admin: SupabaseClient, condominiumId?: string | null) {
    if (!condominiumId) return { suspended: false, daysRemaining: 999, daysUntilDeletion: null } as OrganizationAccess
    const { data: condo } = await admin.from('condominiums').select('organization_id').eq('id', condominiumId).maybeSingle()
    return getOrganizationAccess(admin, condo?.organization_id)
}
