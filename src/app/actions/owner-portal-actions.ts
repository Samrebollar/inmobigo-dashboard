'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getFinanceOrgForCondo } from '@/lib/finance-auth'
import { normalizeMexicanPhone } from '@/utils/phone-utils'
import { getCondoMercadoPagoAccount } from '@/services/mercadopago-connect-service'
import { getCondominiumAccess, SUSPENDED_RESIDENT_MESSAGE } from '@/lib/subscription-access'
import { getPortalAccessForResident, getPortalUnits } from '@/lib/owner-portal-access'
import { deliverUnitContactInvitation } from '@/lib/unit-contact-invitation'

type Result = { success: true } | { success: false; error: string }

async function currentUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

const clean = (v: unknown, max = 160): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t ? t.slice(0, max) : null
}

/**
 * El administrador invita al portal a un propietario o gestor ya capturado en
 * la ficha de una unidad. Seguridad no puede invitar.
 */
export async function inviteUnitContactAction(contactId: string): Promise<Result> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No autorizado' }
    const admin = createAdminClient()

    const { data: contact } = await admin.from('unit_contacts').select('id, organization_id').eq('id', contactId).maybeSingle()
    if (!contact) return { success: false, error: 'Contacto no encontrado' }
    const { data: unit } = await admin
        .from('units')
        .select('condominium_id')
        .or(`owner_contact_id.eq.${contactId},co_owner_contact_id.eq.${contactId},manager_contact_id.eq.${contactId}`)
        .limit(1)
        .maybeSingle()
    if (!unit) return { success: false, error: 'Asigna primero el contacto a una unidad' }

    const orgId = await getFinanceOrgForCondo(admin, user.id, unit.condominium_id)
    if (!orgId || orgId !== contact.organization_id) return { success: false, error: 'No tienes permiso para esta propiedad' }
    const { data: member } = await admin
        .from('organization_users')
        .select('role_new')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle()
    if (member?.role_new === 'security') return { success: false, error: 'Seguridad no puede enviar invitaciones' }

    const result = await deliverUnitContactInvitation(admin, contactId)
    return result.success ? { success: true } : { success: false, error: result.error || 'No se pudo enviar la invitación' }
}

/**
 * El propietario (o copropietario) asigna o cambia al gestor de su unidad y
 * decide si puede pagar en su nombre. Opcionalmente lo invita al portal.
 */
export async function ownerSetManagerAction(unitId: string, input: {
    full_name: string
    phone?: string | null
    email?: string | null
    can_pay: boolean
    invite: boolean
}): Promise<Result> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No autorizado' }
    const admin = createAdminClient()

    const unit = (await getPortalUnits(admin, user.id)).find((u) => u.unit_id === unitId)
    if (!unit || unit.role === 'gestor') return { success: false, error: 'Solo el propietario puede asignar al gestor' }

    const fullName = clean(input.full_name, 120)
    if (!fullName) return { success: false, error: 'Captura el nombre del gestor' }
    const email = clean(input.email)?.toLowerCase() || null
    if (input.invite && !email) return { success: false, error: 'Captura el correo del gestor para invitarlo' }
    const phoneRaw = clean(input.phone, 30)
    const phone = phoneRaw ? normalizeMexicanPhone(phoneRaw) || phoneRaw : null

    const { data: condo } = await admin.from('condominiums').select('organization_id').eq('id', unit.condominium_id).maybeSingle()
    if (!condo?.organization_id) return { success: false, error: 'Condominio no encontrado' }

    // Se reutiliza el gestor si ya está registrado en la organización con ese correo
    let managerId: string | null = null
    if (email) {
        const { data: existing } = await admin
            .from('unit_contacts')
            .select('id')
            .eq('organization_id', condo.organization_id)
            .eq('kind', 'gestor')
            .eq('email', email)
            .limit(1)
            .maybeSingle()
        managerId = existing?.id || null
    }
    if (!managerId) {
        const { data: created, error } = await admin
            .from('unit_contacts')
            .insert({ organization_id: condo.organization_id, kind: 'gestor', full_name: fullName, phone, email })
            .select('id')
            .single()
        if (error) return { success: false, error: error.message }
        managerId = created.id
    }

    const { error: unitError } = await admin
        .from('units')
        .update({ manager_contact_id: managerId, manager_can_pay: !!input.can_pay })
        .eq('id', unitId)
    if (unitError) return { success: false, error: unitError.message }

    if (input.invite && managerId) {
        const invitation = await deliverUnitContactInvitation(admin, managerId, { automatic: true })
        if (!invitation.success) return { success: false, error: `Gestor guardado, pero ${invitation.error?.toLowerCase()}` }
    }
    revalidatePath('/propietario')
    return { success: true }
}

/** El propietario quita al gestor de su unidad. Si pagaba el gestor, vuelve a pagar el propietario. */
export async function ownerRemoveManagerAction(unitId: string): Promise<Result> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No autorizado' }
    const admin = createAdminClient()

    const unit = (await getPortalUnits(admin, user.id)).find((u) => u.unit_id === unitId)
    if (!unit || unit.role === 'gestor') return { success: false, error: 'Solo el propietario puede quitar al gestor' }

    const { error } = await admin
        .from('units')
        .update({
            manager_contact_id: null,
            manager_can_pay: false,
            ...(unit.payment_responsible === 'gestor' ? { payment_responsible: 'propietario' } : {}),
        })
        .eq('id', unitId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/propietario')
    return { success: true }
}

/**
 * Pago en línea (Mercado Pago del condominio) de la cuota de una unidad, a
 * nombre del propietario. Lo puede hacer el propietario, el copropietario o el
 * gestor autorizado. El webhook de residentes aplica el pago a sus cuotas.
 */
export async function createOwnerPaymentCheckoutAction(residentId: string, options?: { amount?: number; concept?: string }): Promise<
    { success: true; checkoutUrl: string } | { success: false; error: string }
> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Debes iniciar sesión.' }
    const admin = createAdminClient()

    const access = await getPortalAccessForResident(admin, user.id, residentId)
    if (!access || !access.isOwnerRecord) return { success: false, error: 'No tienes acceso a esta cuenta' }
    if (!access.unit.can_pay) return { success: false, error: 'El propietario no te autorizó para pagar en su nombre' }

    const condominiumId = access.unit.condominium_id
    const subscription = await getCondominiumAccess(admin, condominiumId)
    if (subscription.suspended) return { success: false, error: SUSPENDED_RESIDENT_MESSAGE }

    const { data: invoices } = await admin
        .from('resident_invoices')
        .select('balance_due, amount, status')
        .eq('resident_id', residentId)
        .in('status', ['pending', 'overdue'])
    const totalDebt = Math.round((invoices || []).reduce((acc: number, i: any) => acc + Number(i.balance_due ?? i.amount ?? 0), 0) * 100) / 100
    if (totalDebt <= 0) return { success: false, error: 'No hay saldo pendiente por pagar.' }
    const requested = Number(options?.amount)
    const amount = requested > 0 ? Math.min(requested, totalDebt) : totalDebt

    const account = await getCondoMercadoPagoAccount(condominiumId)
    if (!account.connected || !account.accessToken) return { success: false, error: 'El condominio aún no tiene Mercado Pago conectado.' }

    const { data: condo } = await admin.from('condominiums').select('name').eq('id', condominiumId).maybeSingle()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.inmobigo.mx'
    const title = `${options?.concept || 'Cuota de mantenimiento'} — ${condo?.name || 'Condominio'} — Unidad ${access.unit.unit_number}`

    try {
        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{ title, quantity: 1, unit_price: Number(amount.toFixed(2)), currency_id: 'MXN' }],
                payer: user.email ? { email: user.email } : undefined,
                metadata: { resident_id: residentId, condominium_id: condominiumId, paid_by_user_id: user.id },
                external_reference: residentId,
                back_urls: {
                    success: `${appUrl}/propietario?mp_status=success`,
                    pending: `${appUrl}/propietario?mp_status=pending`,
                    failure: `${appUrl}/propietario?mp_status=failure`,
                },
                auto_return: 'approved',
                notification_url: `${appUrl}/api/mercadopago/resident-webhook`,
            }),
        })
        const mpData = await mpRes.json()
        if (!mpRes.ok || !mpData.init_point) {
            console.error('[createOwnerPaymentCheckoutAction] MP error:', mpData)
            return { success: false, error: mpData.message || 'No se pudo crear el pago con Mercado Pago.' }
        }
        return { success: true, checkoutUrl: mpData.init_point as string }
    } catch (err) {
        console.error('[createOwnerPaymentCheckoutAction]', err)
        return { success: false, error: 'No se pudo conectar con Mercado Pago.' }
    }
}
