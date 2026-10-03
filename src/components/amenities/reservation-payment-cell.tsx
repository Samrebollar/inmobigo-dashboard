'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { createReservationCheckoutAction, sweepExpiredReservationsAction } from '@/app/actions/amenity-reservation-actions'
import { amenityDeposit, amenityFee } from '@/lib/amenity-booking'
import { DepositEvidenceButton } from '@/components/amenities/deposit-evidence'

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City',
})
const REFUND_METHOD: Record<string, string> = { efectivo: 'en efectivo', transferencia: 'por transferencia', saldo_a_favor: 'como saldo a favor' }

/** Fecha de reserva (yyyy-MM-dd) como Date local, sin desfase de zona horaria. */
export const reservationDay = (iso: string) => new Date(`${String(iso).slice(0, 10)}T12:00:00`)

/** Total, estado de pago y del depósito de una reserva, con el botón para pagarla en línea. */
export function ReservationPaymentCell({ reserva, returnPath }: { reserva: any; returnPath: string }) {
    const [paying, setPaying] = useState(false)
    const charged = Number(reserva.fee_amount || 0) + Number(reserva.deposit_amount || 0) > 0
    const fee = charged ? Number(reserva.fee_amount || 0) : amenityFee(reserva.amenities)
    const deposit = charged ? Number(reserva.deposit_amount || 0) : amenityDeposit(reserva.amenities)
    const total = fee + deposit

    if (total <= 0) return <p className="text-zinc-400 font-bold text-sm text-center">Sin costo</p>

    const pay = async () => {
        setPaying(true)
        const result = await createReservationCheckoutAction(reserva.id, returnPath)
        if (!result.success) {
            toast.error(result.error)
            setPaying(false)
            return
        }
        window.location.href = result.checkoutUrl
    }

    const awaitingPayment = reserva.status === 'approved' && !reserva.paid_at && charged
    return (
        <div className="flex flex-col items-center gap-1.5 text-center">
            <p className="text-white font-bold text-sm whitespace-nowrap">{money(total)} MXN</p>
            <p className="text-[10px] text-zinc-500 whitespace-nowrap">
                Uso {money(fee)}{deposit > 0 ? ` · Depósito ${money(deposit)}` : ''}
            </p>
            {awaitingPayment && (
                <>
                    {reserva.payment_due_at && (
                        <p className="text-[10px] font-semibold text-amber-400 whitespace-nowrap">Paga antes del {fmtDateTime(reserva.payment_due_at)}</p>
                    )}
                    <button
                        onClick={pay}
                        disabled={paying}
                        className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />} Pagar reserva
                    </button>
                </>
            )}
            {reserva.status === 'pending' && <p className="text-[10px] text-zinc-500">Se paga al aprobarse</p>}
            {reserva.paid_at && (
                <p className="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Pagada</p>
            )}
            {reserva.deposit_status === 'en_resguardo' && (
                <p className="text-[10px] text-indigo-300 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Depósito en resguardo</p>
            )}
            {reserva.deposit_status === 'devuelto' && (
                <p className="text-[10px] text-emerald-400">Depósito devuelto {money(Number(reserva.deposit_refunded_amount || 0))} {REFUND_METHOD[reserva.deposit_refund_method] || ''}</p>
            )}
            {(reserva.deposit_status === 'retenido' || reserva.deposit_status === 'retenido_parcial') && (
                <p className="text-[10px] text-rose-400 max-w-[200px]" title={reserva.deposit_notes || ''}>
                    Retenido {money(Number(reserva.deposit_retained_amount || 0))}
                    {Number(reserva.deposit_refunded_amount || 0) > 0 ? ` · devuelto ${money(Number(reserva.deposit_refunded_amount))} ${REFUND_METHOD[reserva.deposit_refund_method] || ''}` : ''}
                    {reserva.deposit_notes ? ` · ${reserva.deposit_notes}` : ''}
                </p>
            )}
            <DepositEvidenceButton reservationId={reserva.id} count={(reserva.deposit_photo_paths || []).length} />
        </div>
    )
}

/**
 * Cancela las reservas vencidas de la organización (sin pagar o sin aprobar
 * 48 h antes del evento) y avisa el resultado del pago de Mercado Pago.
 * Devuelve true si canceló alguna, para volver a cargar la lista.
 */
export async function sweepReservations(reservas: any[]): Promise<boolean> {
    const now = new Date().toISOString()
    const orgs = new Set<string>()
    for (const r of reservas) {
        if (r.status === 'approved' && !r.paid_at && r.payment_due_at && r.payment_due_at < now) orgs.add(r.organization_id)
        if (r.status === 'pending' && amenityFee(r.amenities) + amenityDeposit(r.amenities) > 0) orgs.add(r.organization_id)
    }
    let changed = false
    for (const org of orgs) {
        if (!org) continue
        const { cancelled } = await sweepExpiredReservationsAction(org)
        if (cancelled > 0) changed = true
    }
    return changed
}

/** Aviso del resultado al volver de Mercado Pago (?mp_status=...). */
export function useMercadoPagoReturnToast() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const status = params.get('mp_status')
        if (!status) return
        if (status === 'success') toast.success('Pago recibido. En unos momentos tu reserva aparecerá como pagada.')
        else if (status === 'pending') toast.info('Tu pago quedó pendiente de confirmación.')
        else toast.error('El pago no se completó.')
        params.delete('mp_status')
        const qs = params.toString()
        window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`)
    }, [])
}
