'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCondoMercadoPagoAccount } from '@/services/mercadopago-connect-service'
import { getCondominiumAccess, SUSPENDED_RESIDENT_MESSAGE } from '@/lib/subscription-access'
import {
    cancelReservationCharges,
    chargeApprovedReservation,
    settleReservationDeposit,
    sweepExpiredReservations,
    type DepositRefundMethod,
} from '@/lib/amenity-billing'
import { todayMx } from '@/lib/amenity-booking'

type Result = { success: true } | { success: false; error: string }

async function currentUser() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

/** Miembro del equipo (administración o seguridad) de la organización. */
async function isOrgStaff(admin: ReturnType<typeof createAdminClient>, userId: string, organizationId: string) {
    const { data } = await admin
        .from('organization_users')
        .select('role_new')
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .maybeSingle()
    if (data) return true
    const { data: org } = await admin.from('organizations').select('owner_id').eq('id', organizationId).maybeSingle()
    return org?.owner_id === userId
}

/**
 * Aprueba o rechaza una reserva. Al aprobar una amenidad con costo se generan
 * la cuota de uso y el depósito con límite de pago 48 h antes del evento; al
 * rechazar se cancelan los cargos sin pagar y el día se libera.
 */
export async function updateReservationStatusAction(reservationId: string, status: 'approved' | 'cancelled', reason?: string): Promise<Result> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No autorizado' }
    const admin = createAdminClient()

    const { data: reservation } = await admin
        .from('amenity_reservations')
        .select('id, organization_id, status, deposit_status')
        .eq('id', reservationId)
        .maybeSingle()
    if (!reservation) return { success: false, error: 'Reserva no encontrada' }
    if (!(await isOrgStaff(admin, user.id, reservation.organization_id))) return { success: false, error: 'No autorizado' }

    const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'cancelled') payload.rejection_reason = reason?.trim().slice(0, 500) || null

    const { error } = await admin.from('amenity_reservations').update(payload).eq('id', reservationId)
    if (error) {
        if (error.code === '23505') return { success: false, error: 'No se puede aprobar: esa amenidad ya tiene otra reserva activa para ese día.' }
        return { success: false, error: error.message }
    }

    try {
        if (status === 'approved') await chargeApprovedReservation(admin, reservationId)
        else await cancelReservationCharges(admin, reservationId)
    } catch (err) {
        // Sin cargos no se puede cobrar: la reserva vuelve a pendiente
        if (status === 'approved') await admin.from('amenity_reservations').update({ status: reservation.status }).eq('id', reservationId)
        return { success: false, error: err instanceof Error ? err.message : 'No se pudieron generar los cargos' }
    }

    revalidatePath('/dashboard/avisos')
    return { success: true }
}

/** Cancela las reservas vencidas (sin pagar o sin aprobar 48 h antes) de la organización. */
export async function sweepExpiredReservationsAction(organizationId: string): Promise<{ cancelled: number }> {
    const user = await currentUser()
    if (!user || !organizationId) return { cancelled: 0 }
    return { cancelled: await sweepExpiredReservations(createAdminClient(), { organizationId }) }
}

const RETURN_PATHS = ['/residente/amenidades/reservas', '/inquilino/amenidades/reservas', '/seguridad/amenidades/reservas', '/dashboard/amenidades/reservas']

/**
 * Pago en línea (Mercado Pago del condominio) de una reserva aprobada: cuota
 * de uso + depósito en garantía. El webhook aplica el pago solo a esa reserva
 * y cada concepto genera su recibo con QR.
 */
export async function createReservationCheckoutAction(reservationId: string, returnPath: string): Promise<
    { success: true; checkoutUrl: string } | { success: false; error: string }
> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'Debes iniciar sesión.' }
    const admin = createAdminClient()

    const { data: reservation } = await admin
        .from('amenity_reservations')
        .select('id, resident_id, status, paid_at, payment_due_at, reservation_date, amenities(name)')
        .eq('id', reservationId)
        .maybeSingle()
    if (!reservation || reservation.resident_id !== user.id) return { success: false, error: 'Reserva no encontrada' }
    if (reservation.status !== 'approved') return { success: false, error: 'La reserva aún no está aprobada.' }
    if (reservation.paid_at) return { success: false, error: 'Esta reserva ya está pagada.' }
    if (reservation.payment_due_at && reservation.payment_due_at < new Date().toISOString()) {
        await sweepExpiredReservations(admin, {})
        return { success: false, error: 'Venció el plazo para pagar esta reserva (48 horas antes del evento).' }
    }

    const { data: charges } = await admin
        .from('resident_invoices')
        .select('id, resident_id, condominium_id, balance_due, amount, invoice_type, description')
        .eq('reservation_id', reservationId)
        .in('status', ['pending', 'overdue'])
    const list = charges || []
    const total = Math.round(list.reduce((acc: number, c: any) => acc + Number(c.balance_due ?? c.amount ?? 0), 0) * 100) / 100
    if (total <= 0) return { success: false, error: 'Esta reserva no tiene saldo por pagar.' }

    const condominiumId = list[0].condominium_id
    const access = await getCondominiumAccess(admin, condominiumId)
    if (access.suspended) return { success: false, error: SUSPENDED_RESIDENT_MESSAGE }
    const account = await getCondoMercadoPagoAccount(condominiumId)
    if (!account.connected || !account.accessToken) return { success: false, error: 'Tu condominio aún no tiene Mercado Pago conectado. Paga directamente con la administración.' }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.inmobigo.mx'
    const back = RETURN_PATHS.includes(returnPath) ? returnPath : RETURN_PATHS[0]
    try {
        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: { Authorization: `Bearer ${account.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: list.map((c: any) => ({
                    title: c.description || 'Reserva de amenidad',
                    quantity: 1,
                    unit_price: Number(Number(c.balance_due ?? c.amount ?? 0).toFixed(2)),
                    currency_id: 'MXN',
                })),
                payer: user.email ? { email: user.email } : undefined,
                metadata: { resident_id: list[0].resident_id, condominium_id: condominiumId, reservation_id: reservationId },
                external_reference: list[0].resident_id,
                back_urls: {
                    success: `${appUrl}${back}?mp_status=success`,
                    pending: `${appUrl}${back}?mp_status=pending`,
                    failure: `${appUrl}${back}?mp_status=failure`,
                },
                auto_return: 'approved',
                notification_url: `${appUrl}/api/mercadopago/resident-webhook`,
                ...(reservation.payment_due_at ? { expires: true, expiration_date_to: reservation.payment_due_at } : {}),
            }),
        })
        const mpData = await mpRes.json()
        if (!mpRes.ok || !mpData.init_point) {
            console.error('[createReservationCheckoutAction] MP error:', mpData)
            return { success: false, error: mpData.message || 'No se pudo crear el pago con Mercado Pago.' }
        }
        return { success: true, checkoutUrl: mpData.init_point as string }
    } catch (err) {
        console.error('[createReservationCheckoutAction]', err)
        return { success: false, error: 'No se pudo conectar con Mercado Pago.' }
    }
}

/**
 * Después del evento, administración o seguridad liquidan el depósito:
 * devolverlo completo o retener una parte o todo por daños (con motivo).
 */
export async function settleReservationDepositAction(reservationId: string, input: {
    refundAmount: number
    method: DepositRefundMethod
    notes?: string
    photoPaths?: string[]
}): Promise<Result> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No autorizado' }
    const admin = createAdminClient()

    const { data: reservation } = await admin
        .from('amenity_reservations')
        .select('organization_id, reservation_date')
        .eq('id', reservationId)
        .maybeSingle()
    if (!reservation) return { success: false, error: 'Reserva no encontrada' }
    if (!(await isOrgStaff(admin, user.id, reservation.organization_id))) return { success: false, error: 'No autorizado' }
    if (reservation.reservation_date > todayMx()) return { success: false, error: 'El depósito se liquida después del evento.' }
    if (!['efectivo', 'transferencia', 'saldo_a_favor'].includes(input.method)) return { success: false, error: 'Selecciona la forma de devolución' }

    try {
        await settleReservationDeposit(admin, reservationId, { ...input, settledBy: user.id })
        revalidatePath('/dashboard/avisos')
        revalidatePath('/dashboard/finance/depositos')
        return { success: true }
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'No se pudo liquidar el depósito' }
    }
}

const EVIDENCE_BUCKET = 'amenity_damage_evidence'

/** Sube una foto de los daños de una reserva (administración o seguridad). Devuelve su ruta privada. */
export async function uploadDepositEvidenceAction(formData: FormData): Promise<{ success: true; path: string; url: string } | { success: false; error: string }> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No autorizado' }
    const reservationId = String(formData.get('reservation_id') || '')
    const file = formData.get('file')
    if (!reservationId || !(file instanceof File)) return { success: false, error: 'Falta la foto' }
    if (!file.type.startsWith('image/')) return { success: false, error: 'Solo se permiten imágenes' }
    if (file.size > 10 * 1024 * 1024) return { success: false, error: 'La foto pesa más de 10 MB' }

    const admin = createAdminClient()
    const { data: reservation } = await admin.from('amenity_reservations').select('organization_id').eq('id', reservationId).maybeSingle()
    if (!reservation) return { success: false, error: 'Reserva no encontrada' }
    if (!(await isOrgStaff(admin, user.id, reservation.organization_id))) return { success: false, error: 'No autorizado' }

    const path = `${reservation.organization_id}/${reservationId}/${crypto.randomUUID()}.jpg`
    const { error } = await admin.storage.from(EVIDENCE_BUCKET).upload(path, file, { contentType: file.type, upsert: false })
    if (error) return { success: false, error: error.message }
    const { data: signed } = await admin.storage.from(EVIDENCE_BUCKET).createSignedUrl(path, 3600)
    return { success: true, path, url: signed?.signedUrl || '' }
}

/** Fotos de los daños de una reserva: las ve el residente que reservó y el equipo de la organización. */
export async function getDepositEvidenceAction(reservationId: string): Promise<{ success: true; urls: string[] } | { success: false; error: string }> {
    const user = await currentUser()
    if (!user) return { success: false, error: 'No autorizado' }
    const admin = createAdminClient()
    const { data: reservation } = await admin
        .from('amenity_reservations')
        .select('organization_id, resident_id, deposit_photo_paths')
        .eq('id', reservationId)
        .maybeSingle()
    if (!reservation) return { success: false, error: 'Reserva no encontrada' }
    if (reservation.resident_id !== user.id && !(await isOrgStaff(admin, user.id, reservation.organization_id))) {
        return { success: false, error: 'No autorizado' }
    }
    const paths: string[] = reservation.deposit_photo_paths || []
    if (paths.length === 0) return { success: true, urls: [] }
    const { data } = await admin.storage.from(EVIDENCE_BUCKET).createSignedUrls(paths, 3600)
    return { success: true, urls: (data || []).map((d) => d.signedUrl).filter(Boolean) as string[] }
}
