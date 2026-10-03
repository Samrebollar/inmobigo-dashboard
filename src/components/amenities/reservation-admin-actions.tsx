'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Clock, Loader2, ShieldCheck } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { settleReservationDepositAction } from '@/app/actions/amenity-reservation-actions'
import { todayMx } from '@/lib/amenity-booking'

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City',
})
const METHODS = [
    { value: 'efectivo', label: 'Efectivo' },
    { value: 'transferencia', label: 'Transferencia' },
    { value: 'saldo_a_favor', label: 'Saldo a favor (se aplica a su siguiente cuota)' },
] as const

/**
 * Pie de la tarjeta de una reserva aprobada (administración y seguridad):
 * estado del pago y, después del evento, liquidación del depósito en garantía.
 */
export function ReservationAdminActions({ res, onChanged }: { res: any; onChanged: () => void }) {
    const [open, setOpen] = useState(false)
    const deposit = Number(res.deposit_amount || 0)
    const charged = Number(res.fee_amount || 0) + deposit > 0
    const eventPassed = String(res.reservation_date).slice(0, 10) <= todayMx()

    if (!charged) {
        return <p className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-emerald-400">Aprobada · sin costo</p>
    }
    if (!res.paid_at) {
        return (
            <p className="w-full text-center text-[11px] font-semibold text-amber-400 flex items-center justify-center gap-1.5">
                <Clock size={13} /> Esperando pago{res.payment_due_at ? ` hasta el ${fmtDateTime(res.payment_due_at)}` : ''}
            </p>
        )
    }
    if (res.deposit_status === 'en_resguardo') {
        return (
            <>
                {eventPassed ? (
                    <button
                        onClick={() => setOpen(true)}
                        className="w-full h-11 px-5 rounded-xl flex items-center justify-center gap-2 text-indigo-300 hover:text-white bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/20 transition-all font-bold text-xs uppercase tracking-widest"
                    >
                        <ShieldCheck size={15} /> Liquidar depósito ({money(deposit)})
                    </button>
                ) : (
                    <p className="w-full text-center text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                        <CheckCircle2 size={13} /> Pagada · depósito {money(deposit)} en resguardo
                    </p>
                )}
                {open && <SettleDepositModal res={res} onClose={() => setOpen(false)} onDone={onChanged} />}
            </>
        )
    }
    const label = res.deposit_status === 'devuelto'
        ? `Depósito devuelto ${money(Number(res.deposit_refunded_amount || 0))}`
        : res.deposit_status === 'retenido' || res.deposit_status === 'retenido_parcial'
            ? `Retenido ${money(Number(res.deposit_retained_amount || 0))}${Number(res.deposit_refunded_amount || 0) > 0 ? ` · devuelto ${money(Number(res.deposit_refunded_amount))}` : ''}`
            : 'Pagada'
    return (
        <p className="w-full text-center text-[11px] font-semibold text-emerald-400 flex items-center justify-center gap-1.5" title={res.deposit_notes || ''}>
            <CheckCircle2 size={13} /> {label}
        </p>
    )
}

function SettleDepositModal({ res, onClose, onDone }: { res: any; onClose: () => void; onDone: () => void }) {
    const deposit = Number(res.deposit_amount || 0)
    const [mode, setMode] = useState<'full' | 'partial'>('full')
    const [retained, setRetained] = useState('')
    const [method, setMethod] = useState<string>('efectivo')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    const retainedAmount = mode === 'full' ? 0 : Math.min(Math.max(Number(retained) || 0, 0), deposit)
    const refund = Math.round((deposit - retainedAmount) * 100) / 100

    const submit = async () => {
        if (mode === 'partial' && retainedAmount <= 0) return toast.error('Indica cuánto se retiene')
        if (mode === 'partial' && notes.trim().length < 5) return toast.error('Describe el motivo de la retención')
        setSaving(true)
        const result = await settleReservationDepositAction(res.id, { refundAmount: refund, method: method as any, notes })
        setSaving(false)
        if (!result.success) return toast.error(result.error)
        toast.success(refund > 0 ? `Depósito liquidado: se devuelven ${money(refund)}` : 'Depósito retenido por completo')
        onDone()
        onClose()
    }

    return (
        <Modal isOpen onClose={() => !saving && onClose()} title={`Depósito en garantía · ${res.amenities?.name || 'Amenidad'}`}>
            <div className="space-y-4">
                <p className="text-sm text-zinc-400">Depósito pagado: <span className="font-bold text-white">{money(deposit)}</span>. Revisa el espacio y elige cómo se liquida.</p>
                <div className="grid grid-cols-2 gap-2">
                    {([['full', 'Sin daños: devolver todo'], ['partial', 'Con daños: retener']] as const).map(([value, label]) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setMode(value)}
                            className={`rounded-xl border p-3 text-sm font-semibold transition-colors ${mode === value ? 'border-indigo-500 bg-indigo-500/10 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {mode === 'partial' && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Monto retenido (máximo {money(deposit)})</label>
                        <input
                            type="number"
                            min="0"
                            max={deposit}
                            value={retained}
                            onChange={(e) => setRetained(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-white focus:border-indigo-500 focus:outline-none"
                        />
                        <label className="text-xs font-medium text-zinc-400">Motivo (se le muestra al residente)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="Ej. Silla rota y mancha en el piso del salón"
                            className="w-full px-3 py-2 text-sm text-white bg-zinc-950/60 border border-zinc-800 rounded-xl focus:border-indigo-500 focus:outline-none resize-none"
                        />
                    </div>
                )}
                {refund > 0 && (
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">¿Cómo se devuelven {money(refund)}?</label>
                        <select
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-white focus:border-indigo-500 focus:outline-none"
                        >
                            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                )}
                <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-400 space-y-1">
                    <p>Se devuelve: <span className="font-bold text-emerald-400">{money(refund)}</span></p>
                    <p>Se retiene (ingreso por daños): <span className="font-bold text-rose-400">{money(retainedAmount)}</span></p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button onClick={onClose} disabled={saving} className="h-10 px-4 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800">Cancelar</button>
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="h-10 px-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Liquidar depósito
                    </button>
                </div>
            </div>
        </Modal>
    )
}
