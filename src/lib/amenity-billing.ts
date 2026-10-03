import { createAdminClient } from '@/utils/supabase/admin'
import { amenityDeposit, amenityFee, paymentDueAt, PAYMENT_DEADLINE_HOURS } from '@/lib/amenity-booking'
import { AMENITY_DAMAGE_TYPE, AMENITY_DEPOSIT_TYPE, AMENITY_FEE_TYPE, DEPOSIT_RETAINED_METHOD } from '@/lib/invoice-types'
import { issuePaymentReceipt } from '@/lib/payment-receipts'

/**
 * Cobro de reservas de amenidades: cuota de uso + depósito en garantía.
 * Solo debe usarse desde código de servidor ya autorizado.
 */

type AdminClient = ReturnType<typeof createAdminClient>

const MONEY = (n: number) => Math.round(n * 100) / 100
const fmtDate = (iso: string) => iso.split('-').reverse().join('/')
const folio = () => `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`

/** Registro de residente (residents.id) de quien hizo la reserva (amenity_reservations.resident_id es su cuenta). */
async function reservationResident(admin: AdminClient, reservation: any) {
    const { data: rows } = await admin
        .from('residents')
        .select('id, condominium_id, unit_id, condominiums(organization_id)')
        .eq('user_id', reservation.resident_id)
        .neq('status', 'inactive')
        .limit(5)
    const list = rows || []
    const condoId = reservation.amenities?.condominium_id
    return list.find((r: any) => condoId && r.condominium_id === condoId)
        || list.find((r: any) => (r.condominiums as any)?.organization_id === reservation.organization_id)
        || list[0]
        || null
}

async function loadReservation(admin: AdminClient, reservationId: string) {
    const { data } = await admin
        .from('amenity_reservations')
        .select('*, amenities(id, name, condominium_id, base_price, deposit_required, deposit_amount)')
        .eq('id', reservationId)
        .maybeSingle()
    return data as any
}

/**
 * Al aprobar una reserva con costo: genera la cuota de uso y el depósito en
 * garantía (cargos ligados a la reserva) con fecha límite de pago 48 h antes
 * del evento. Idempotente.
 */
export async function chargeApprovedReservation(admin: AdminClient, reservationId: string): Promise<void> {
    const reservation = await loadReservation(admin, reservationId)
    if (!reservation) return
    const fee = amenityFee(reservation.amenities)
    const deposit = amenityDeposit(reservation.amenities)
    const dueAt = paymentDueAt(reservation.reservation_date)

    if (fee + deposit <= 0) {
        await admin.from('amenity_reservations').update({ fee_amount: 0, deposit_amount: 0, deposit_status: 'none' }).eq('id', reservationId)
        return
    }

    const { data: existing } = await admin
        .from('resident_invoices')
        .select('id, invoice_type, status')
        .eq('reservation_id', reservationId)
        .neq('status', 'cancelled')
    const has = (type: string) => (existing || []).some((i: any) => i.invoice_type === type)

    const resident = await reservationResident(admin, reservation)
    if (!resident) throw new Error('No se encontró el registro del residente que hizo la reserva')

    const name = reservation.amenities?.name || 'Amenidad'
    const when = fmtDate(reservation.reservation_date)
    const dueDate = new Date(dueAt).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const base = {
        condominium_id: resident.condominium_id,
        organization_id: reservation.organization_id,
        resident_id: resident.id,
        unit_id: resident.unit_id,
        reservation_id: reservationId,
        invoice_scope: 'resident',
        status: 'pending',
        currency: 'MXN',
        due_date: dueDate,
        period_start: reservation.reservation_date,
        period_end: reservation.reservation_date,
        reminder_sent: false,
        recargo_aplicado: false,
    }
    const rows: any[] = []
    if (fee > 0 && !has(AMENITY_FEE_TYPE)) {
        rows.push({ ...base, invoice_type: AMENITY_FEE_TYPE, amount: fee, balance_due: fee, description: `Cuota de uso – ${name} – ${when}`, folio: folio() })
    }
    if (deposit > 0 && !has(AMENITY_DEPOSIT_TYPE)) {
        rows.push({ ...base, invoice_type: AMENITY_DEPOSIT_TYPE, amount: deposit, balance_due: deposit, description: `Depósito en garantía (reembolsable) – ${name} – ${when}`, folio: folio() })
    }
    if (rows.length > 0) {
        const { error } = await admin.from('resident_invoices').insert(rows)
        if (error) throw new Error(`No se pudieron generar los cargos de la reserva: ${error.message}`)
    }

    await admin
        .from('amenity_reservations')
        .update({
            fee_amount: fee,
            deposit_amount: deposit,
            payment_due_at: dueAt,
            deposit_status: deposit > 0 ? 'pendiente_pago' : 'none',
        })
        .eq('id', reservationId)
}

/** Cancela los cargos sin pagar de una reserva (rechazada, cancelada o vencida). */
export async function cancelReservationCharges(admin: AdminClient, reservationId: string): Promise<void> {
    await admin
        .from('resident_invoices')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('reservation_id', reservationId)
        .in('status', ['pending', 'overdue'])
    const { data: reservation } = await admin.from('amenity_reservations').select('deposit_status').eq('id', reservationId).maybeSingle()
    if (reservation?.deposit_status === 'pendiente_pago') {
        await admin.from('amenity_reservations').update({ deposit_status: 'none' }).eq('id', reservationId)
    }
}

/** Si ya se pagaron todos los cargos de la reserva, la marca como pagada y el depósito queda en resguardo. */
export async function markReservationPaidIfSettled(admin: AdminClient, reservationId: string): Promise<void> {
    const { data: invoices } = await admin
        .from('resident_invoices')
        .select('invoice_type, status, balance_due')
        .eq('reservation_id', reservationId)
        .neq('status', 'cancelled')
    if (!invoices || invoices.length === 0) return
    const settled = invoices.every((i: any) => i.status === 'paid' || Number(i.balance_due || 0) <= 0.01)
    if (!settled) return
    const hasDeposit = invoices.some((i: any) => i.invoice_type === AMENITY_DEPOSIT_TYPE)
    await admin
        .from('amenity_reservations')
        .update({ paid_at: new Date().toISOString(), ...(hasDeposit ? { deposit_status: 'en_resguardo' } : {}) })
        .eq('id', reservationId)
        .is('paid_at', null)
}

/**
 * Cancela las reservas que ya no alcanzaron la regla de 48 horas:
 *  - aprobadas con costo y sin pagar cuando venció su límite de pago;
 *  - pendientes de aprobación de amenidades con costo, cuando ya faltan menos
 *    de 48 horas para el evento.
 * El día se libera y los cargos sin pagar se cancelan.
 */
export async function sweepExpiredReservations(admin: AdminClient, scope: { organizationId?: string; amenityId?: string } = {}): Promise<number> {
    const nowIso = new Date().toISOString()
    let cancelled = 0

    let unpaid = admin
        .from('amenity_reservations')
        .select('id')
        .eq('status', 'approved')
        .is('paid_at', null)
        .not('payment_due_at', 'is', null)
        .lt('payment_due_at', nowIso)
    if (scope.organizationId) unpaid = unpaid.eq('organization_id', scope.organizationId)
    if (scope.amenityId) unpaid = unpaid.eq('amenity_id', scope.amenityId)
    const { data: expiredUnpaid } = await unpaid
    for (const r of expiredUnpaid || []) {
        const { data: charges } = await admin.from('resident_invoices').select('id').eq('reservation_id', r.id).neq('status', 'cancelled').limit(1)
        if (!charges || charges.length === 0) continue
        await admin
            .from('amenity_reservations')
            .update({ status: 'cancelled', rejection_reason: `No se pagó ${PAYMENT_DEADLINE_HOURS} horas antes del evento`, updated_at: nowIso })
            .eq('id', r.id)
            .eq('status', 'approved')
        await cancelReservationCharges(admin, r.id)
        cancelled++
    }

    // Pendientes sin aprobar de amenidades con costo: a menos de 48 h del evento
    const horizon = new Date(Date.now() + (PAYMENT_DEADLINE_HOURS + 30) * 3600 * 1000).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    let pending = admin
        .from('amenity_reservations')
        .select('id, reservation_date, amenities(base_price, deposit_required, deposit_amount)')
        .eq('status', 'pending')
        .lte('reservation_date', horizon)
    if (scope.organizationId) pending = pending.eq('organization_id', scope.organizationId)
    if (scope.amenityId) pending = pending.eq('amenity_id', scope.amenityId)
    const { data: pendingRows } = await pending
    for (const r of (pendingRows || []) as any[]) {
        const priced = amenityFee(r.amenities) + amenityDeposit(r.amenities) > 0
        if (!priced || paymentDueAt(r.reservation_date) >= nowIso) continue
        await admin
            .from('amenity_reservations')
            .update({ status: 'cancelled', rejection_reason: `No se aprobó ${PAYMENT_DEADLINE_HOURS} horas antes del evento`, updated_at: nowIso })
            .eq('id', r.id)
            .eq('status', 'pending')
        cancelled++
    }
    return cancelled
}

export type DepositRefundMethod = 'efectivo' | 'transferencia' | 'saldo_a_favor'

/**
 * Después del evento: devuelve el depósito completo o retiene una parte o todo
 * por daños. Lo retenido entra como ingreso ("Penalización por daños", pagada
 * con el propio depósito); la devolución como saldo a favor se abona al
 * residente y se aplica sola a su siguiente cuota.
 */
export async function settleReservationDeposit(admin: AdminClient, reservationId: string, input: {
    refundAmount: number
    method: DepositRefundMethod
    notes?: string | null
    photoPaths?: string[]
    settledBy: string
}): Promise<void> {
    const reservation = await loadReservation(admin, reservationId)
    if (!reservation) throw new Error('Reserva no encontrada')
    if (reservation.deposit_status !== 'en_resguardo') throw new Error('Esta reserva no tiene un depósito pagado por liquidar')

    const deposit = MONEY(Number(reservation.deposit_amount || 0))
    const refund = MONEY(Math.min(Math.max(Number(input.refundAmount) || 0, 0), deposit))
    const retained = MONEY(deposit - refund)
    const notes = input.notes?.trim().slice(0, 500) || null
    if (retained > 0 && !notes) throw new Error('Indica el motivo de la retención')
    // Solo fotos subidas para esta reserva
    const prefix = `${reservation.organization_id}/${reservationId}/`
    const photoPaths = (input.photoPaths || []).filter((path) => typeof path === 'string' && path.startsWith(prefix)).slice(0, 6)
    if (retained > 0 && photoPaths.length === 0) throw new Error('Agrega al menos una foto de los daños')

    const resident = await reservationResident(admin, reservation)
    if (!resident) throw new Error('No se encontró el registro del residente')
    const nowIso = new Date().toISOString()
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const name = reservation.amenities?.name || 'Amenidad'

    // Lo retenido por daños: ingreso del condominio, cubierto con el depósito
    if (retained > 0) {
        const { data: damage, error } = await admin
            .from('resident_invoices')
            .insert({
                condominium_id: resident.condominium_id,
                organization_id: reservation.organization_id,
                resident_id: resident.id,
                unit_id: resident.unit_id,
                reservation_id: reservationId,
                invoice_scope: 'resident',
                invoice_type: AMENITY_DAMAGE_TYPE,
                status: 'paid',
                amount: retained,
                balance_due: 0,
                currency: 'MXN',
                due_date: today,
                paid_at: nowIso,
                payment_method: DEPOSIT_RETAINED_METHOD,
                description: `Penalización por daños – ${name} – ${fmtDate(reservation.reservation_date)}`,
                notes,
                folio: folio(),
                reminder_sent: false,
                recargo_aplicado: false,
            })
            .select('id')
            .single()
        if (error) throw new Error(error.message)
        const paymentId = crypto.randomUUID()
        await admin.from('resident_invoice_payments').insert({
            id: paymentId,
            invoice_id: damage.id,
            resident_id: resident.id,
            condominium_id: resident.condominium_id,
            organization_id: reservation.organization_id,
            amount: retained,
            folio: `DEP-${reservationId.slice(0, 8).toUpperCase()}`,
            payment_method: DEPOSIT_RETAINED_METHOD,
            notes: `deposit_retained:${reservationId}`,
            paid_at: nowIso,
            created_by: input.settledBy,
        })
        await issuePaymentReceipt(admin, paymentId, 'automatico')
    }

    if (refund > 0 && input.method === 'saldo_a_favor') {
        const { data: row } = await admin.from('residents').select('credit_amount').eq('id', resident.id).maybeSingle()
        await admin
            .from('residents')
            .update({ credit_amount: MONEY(Number(row?.credit_amount || 0) + refund) })
            .eq('id', resident.id)
    }

    await admin
        .from('amenity_reservations')
        .update({
            deposit_status: retained <= 0 ? 'devuelto' : refund <= 0 ? 'retenido' : 'retenido_parcial',
            deposit_refunded_amount: refund,
            deposit_retained_amount: retained,
            deposit_refund_method: refund > 0 ? input.method : null,
            deposit_settled_at: nowIso,
            deposit_settled_by: input.settledBy,
            deposit_notes: notes,
            deposit_photo_paths: photoPaths,
        })
        .eq('id', reservationId)
        .eq('deposit_status', 'en_resguardo')
}
