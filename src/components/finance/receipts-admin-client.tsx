'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Search, ExternalLink, Ban, Loader2, ShieldCheck, Clock, XCircle, QrCode } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { ReceiptSigningNotice } from '@/components/finance/receipt-signing-notice'
import { cancelReceiptAction } from '@/app/actions/receipt-admin-actions'

export interface ReceiptRow {
    id: string
    folio: string | null
    short_code: string
    verify_token: string
    amount: number | string
    concept: string | null
    payment_method: string | null
    paid_at: string | null
    issued_at: string
    resident_name: string | null
    unit_number: string | null
    condominium_name: string | null
    signer_name: string | null
    signer_position: string | null
    validation_mode: string
    status: 'valido' | 'firma_pendiente' | 'cancelado'
    canceled_at: string | null
    cancel_reason: string | null
}

const money = (n: number | string) => `$${Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const date = (iso: string | null) => iso
    ? new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' })
    : '—'

const STATUS = {
    valido: { label: 'Válido', icon: ShieldCheck, cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    firma_pendiente: { label: 'Firma pendiente', icon: Clock, cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    cancelado: { label: 'Cancelado', icon: XCircle, cls: 'text-red-400 bg-red-500/10 border-red-500/20' },
} as const

/**
 * Recibos validados de la organización: cada pago con su código de
 * verificación, firmante y estado. Desde aquí se cancela un recibo (con motivo)
 * y opcionalmente se reemite con los datos actuales.
 */
export function ReceiptsAdminClient({ receipts }: { receipts: ReceiptRow[] }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<'todos' | 'vigentes' | 'cancelado'>('vigentes')
    const [cancelTarget, setCancelTarget] = useState<ReceiptRow | null>(null)
    const [reason, setReason] = useState('')
    const [reissue, setReissue] = useState(true)
    const [saving, setSaving] = useState(false)

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        return receipts.filter((r) => {
            if (filter === 'vigentes' && r.status === 'cancelado') return false
            if (filter === 'cancelado' && r.status !== 'cancelado') return false
            if (!q) return true
            return [r.folio, r.short_code, r.resident_name, r.unit_number, r.concept, r.signer_name]
                .some((v) => v?.toLowerCase().includes(q))
        })
    }, [receipts, search, filter])

    const openCancel = (r: ReceiptRow) => {
        setCancelTarget(r)
        setReason('')
        setReissue(true)
    }

    const handleCancel = async () => {
        if (!cancelTarget) return
        setSaving(true)
        try {
            const result = await cancelReceiptAction(cancelTarget.id, reason, reissue)
            if (!result.success) throw new Error(result.error)
            toast.success(result.reissued.length > 0
                ? `Recibo cancelado. Nuevo código: ${result.reissued.map((r) => r.short_code).join(', ')}`
                : 'Recibo cancelado. Al escanear su QR aparecerá como CANCELADO.')
            setCancelTarget(null)
            router.refresh()
        } catch (error: any) {
            toast.error(error.message || 'No se pudo cancelar el recibo')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/finance" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <QrCode className="h-6 w-6 text-indigo-400" /> Recibos Validados
                    </h1>
                    <p className="text-zinc-400 text-sm">Cada pago con su firma, sello digital y código de verificación. Un recibo no se edita: se cancela y se reemite.</p>
                </div>
            </div>

            <ReceiptSigningNotice />

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar folio, código, residente o unidad"
                        className="w-full h-10 pl-9 pr-3 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                    />
                </div>
                <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 self-start">
                    {(['vigentes', 'cancelado', 'todos'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                        >
                            {f === 'vigentes' ? 'Vigentes' : f === 'cancelado' ? 'Cancelados' : 'Todos'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                            <th className="px-4 py-3">Folio / Código</th>
                            <th className="px-4 py-3">Residente</th>
                            <th className="px-4 py-3">Concepto</th>
                            <th className="px-4 py-3 text-right">Monto</th>
                            <th className="px-4 py-3">Validó</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                        {visible.length === 0 && (
                            <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-500">No hay recibos para mostrar.</td></tr>
                        )}
                        {visible.map((r) => {
                            const st = STATUS[r.status]
                            const StIcon = st.icon
                            return (
                                <tr key={r.id} className="text-zinc-300 hover:bg-zinc-900/80">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-white">{r.folio || '—'}</p>
                                        <p className="font-mono text-xs text-zinc-500">{r.short_code}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p>{r.resident_name || '—'}</p>
                                        <p className="text-xs text-zinc-500">{[r.condominium_name, r.unit_number].filter(Boolean).join(' · ')}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <p>{r.concept || 'Pago'}</p>
                                        <p className="text-xs text-zinc-500">{r.payment_method || ''} · {date(r.paid_at)}</p>
                                    </td>
                                    <td className="px-4 py-3 text-right font-semibold text-white">{money(r.amount)}</td>
                                    <td className="px-4 py-3">
                                        <p>{r.signer_name || '—'}</p>
                                        <p className="text-xs text-zinc-500">
                                            {r.validation_mode === 'historico' ? 'Pago anterior' : r.validation_mode === 'automatico' ? 'Pago en línea' : r.signer_position}
                                        </p>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>
                                            <StIcon className="h-3 w-3" /> {st.label}
                                        </span>
                                        {r.status === 'cancelado' && r.cancel_reason && (
                                            <p className="text-[11px] text-zinc-500 mt-1 max-w-[200px] truncate" title={r.cancel_reason}>{r.cancel_reason}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <a
                                                href={`/verificar/${r.verify_token}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                title="Ver verificación"
                                                className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                            {r.status !== 'cancelado' && (
                                                <button
                                                    onClick={() => openCancel(r)}
                                                    title="Cancelar recibo"
                                                    className="h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1"
                                                >
                                                    <Ban size={13} /> Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={!!cancelTarget} onClose={() => !saving && setCancelTarget(null)} title="Cancelar recibo">
                {cancelTarget && (
                    <div className="space-y-4">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm">
                            <p className="text-white font-semibold">{cancelTarget.folio} · {money(cancelTarget.amount)}</p>
                            <p className="text-zinc-400">{cancelTarget.resident_name} · {cancelTarget.concept}</p>
                        </div>
                        <p className="text-xs text-zinc-400">
                            Al cancelarlo, quien escanee su QR verá <span className="text-red-400 font-semibold">CANCELADO</span> con el motivo.
                            Si el recibo forma parte de un cobro con varias cuotas, se cancela el cobro completo. El pago registrado no se modifica.
                        </p>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-zinc-400">Motivo de la cancelación</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                maxLength={300}
                                rows={3}
                                placeholder="Ej. Se capturó la unidad equivocada"
                                className="w-full px-3 py-2 text-sm text-white bg-zinc-950/50 border border-zinc-800 rounded-xl focus:border-indigo-500 focus:outline-none resize-none"
                            />
                        </div>
                        <label className="flex items-start gap-3 rounded-xl border border-zinc-800 p-3 cursor-pointer">
                            <input type="checkbox" checked={reissue} onChange={(e) => setReissue(e.target.checked)} className="mt-0.5 accent-indigo-500" />
                            <span className="text-sm text-zinc-300">
                                Emitir un recibo nuevo con los datos actuales
                                <span className="block text-xs text-zinc-500">Lo firmas tú. El recibo cancelado indicará cuál lo reemplazó.</span>
                            </span>
                        </label>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setCancelTarget(null)} disabled={saving} className="h-10 px-4 rounded-xl text-sm text-zinc-300 hover:bg-zinc-800">Volver</button>
                            <button
                                onClick={handleCancel}
                                disabled={saving || reason.trim().length < 5}
                                className="h-10 px-4 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Cancelar recibo
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
