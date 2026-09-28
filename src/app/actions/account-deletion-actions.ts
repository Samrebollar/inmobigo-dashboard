'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Debe coincidir con la palabra que pide el modal de confirmación
const DELETE_ACCOUNT_CONFIRMATION = 'ELIMINAR'

/**
 * Organización de la que el usuario es dueño (organizations.owner_id). Solo
 * el dueño puede eliminar la cuenta; los auxiliares y seguridad no.
 */
async function getOwnedOrganization(userId: string) {
    const admin = createAdminClient()
    const { data: orgUser } = await admin
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle()

    let query = admin.from('organizations').select('id, name, owner_id, business_type')
    query = orgUser?.organization_id ? query.eq('id', orgUser.organization_id) : query.eq('owner_id', userId)
    const { data: org } = await query.limit(1).maybeSingle()
    return org
}

export async function getAccountDeletionInfoAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false as const, error: 'No autenticado' }

    const org = await getOwnedOrganization(user.id)
    if (!org) return { success: false as const, error: 'No se encontró tu organización' }

    const admin = createAdminClient()
    const { data: condos } = await admin.from('condominiums').select('id').eq('organization_id', org.id)
    const condoIds = (condos || []).map((c) => c.id)
    const { count: residents } = condoIds.length
        ? await admin.from('residents').select('id', { count: 'exact', head: true }).in('condominium_id', condoIds)
        : { count: 0 }
    const { count: units } = await admin.from('units').select('id', { count: 'exact', head: true }).eq('organization_id', org.id)

    return {
        success: true as const,
        isOwner: org.owner_id === user.id,
        organizationName: org.name as string,
        businessType: org.business_type as string | null,
        counts: { condominiums: condoIds.length, units: units || 0, residents: residents || 0 },
    }
}

/**
 * Elimina definitivamente la cuenta del administrador: cancela la suscripción
 * en Mercado Pago y borra la organización con todos los datos de sus
 * residentes (purge_organization). No es reversible.
 */
export async function deleteOrganizationAccountAction(confirmation: string) {
    if ((confirmation || '').trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION) {
        return { success: false, error: `Escribe ${DELETE_ACCOUNT_CONFIRMATION} para confirmar` }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const org = await getOwnedOrganization(user.id)
    if (!org) return { success: false, error: 'No se encontró tu organización' }
    if (org.owner_id !== user.id) {
        return { success: false, error: 'Solo el dueño de la cuenta puede eliminarla' }
    }

    const admin = createAdminClient()

    // Cancelar cobros recurrentes antes de borrar, para que no se le siga cobrando
    const { data: subs } = await admin
        .from('subscriptions')
        .select('id, mercado_subscription_id')
        .eq('organization_id', org.id)
        .in('subscription_status', ['active', 'pending'])
        .not('mercado_subscription_id', 'is', null)

    for (const sub of subs || []) {
        try {
            const res = await fetch(`https://api.mercadopago.com/preapproval/${sub.mercado_subscription_id}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'cancelled' }),
            })
            // 404: la suscripción ya no existe en Mercado Pago, no hay nada que cancelar
            if (!res.ok && res.status !== 404) {
                console.error('[deleteOrganizationAccountAction] MP cancel error:', await res.text())
                return {
                    success: false,
                    error: 'No pudimos cancelar tu suscripción en Mercado Pago. Intenta de nuevo o escríbenos a contacto@inmobigo.mx.',
                }
            }
        } catch (err) {
            console.error('[deleteOrganizationAccountAction] MP cancel exception:', err)
            return { success: false, error: 'No pudimos conectar con Mercado Pago. Intenta de nuevo en unos minutos.' }
        }
    }

    const { data: result, error } = await admin.rpc('purge_organization', { p_org: org.id, p_dry_run: false })
    if (error || !result?.ok) {
        console.error('[deleteOrganizationAccountAction] purge error:', error || result)
        return { success: false, error: result?.error || 'No se pudo eliminar la cuenta. Escríbenos a contacto@inmobigo.mx.' }
    }

    // El usuario ya no existe: limpiar la sesión del navegador
    await supabase.auth.signOut()

    return { success: true }
}
