'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Download, Loader2, Banknote, ArrowLeftRight, CreditCard, Wallet, Receipt, ClipboardCheck, History, Calculator } from 'lucide-react'
import { CashCountPanel, type CashCollector } from './cash-count-panel'
import { CashCountHistory } from './cash-count-history'
import { STATUS_UI, statusOf, downloadCashCountPdf, type CashCountRecord } from './cash-count-shared'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type CashCutPayment = {
    id: string
    folio: string | null
    paid_at: string
    amount: number
    method: string
    concept: string
    resident: string
    unit: string
    condominium: string
    collected_by: string
    collected_by_id: string | null
    notes: string
}

interface CashCutModalProps {
    isOpen: boolean
    onClose: () => void
    organizationId: string
    condominiumList: { id: string, name: string }[]
    defaultCondoId?: string | null
}

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const todayMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
const shiftDay = (ymd: string, days: number) => {
    const d = new Date(`${ymd}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
}
const longDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const timeMx = (iso: string) => new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })

const METHOD_STYLE: Record<string, { icon: typeof Banknote, cls: string }> = {
    'Efectivo': { icon: Banknote, cls: 'text-emerald-300 border-emerald-500/20 bg-emerald-500/5' },
    'Transferencia': { icon: ArrowLeftRight, cls: 'text-sky-300 border-sky-500/20 bg-sky-500/5' },
    'Tarjeta': { icon: CreditCard, cls: 'text-violet-300 border-violet-500/20 bg-violet-500/5' },
    'Saldo a favor': { icon: Wallet, cls: 'text-amber-300 border-amber-500/20 bg-amber-500/5' },
}

export function CashCutModal({ isOpen, onClose, organizationId, condominiumList, defaultCondoId }: CashCutModalProps) {
    const [date, setDate] = useState(todayMx())
    const [condoId, setCondoId] = useState(defaultCondoId || '')
    const [payments, setPayments] = useState<CashCutPayment[]>([])
    const [loading, setLoading] = useState(false)
    const [view, setView] = useState<'corte' | 'arqueo' | 'historial'>('corte')
    const [viewer, setViewer] = useState<{ id: string, name: string } | null>(null)
    const [counts, setCounts] = useState<CashCountRecord[]>([])
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        if (isOpen) {
            setCondoId(defaultCondoId || '')
            setView('corte')
        }
    }, [isOpen, defaultCondoId])

    useEffect(() => {
        if (!isOpen || !organizationId) return
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const qs = new URLSearchParams({ organization_id: organizationId, date })
                if (condoId) qs.set('condominium_id', condoId)
                const res = await fetch(`/api/finance/cash-cut?${qs.toString()}`)
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'No se pudo cargar el corte')
                if (!cancelled) {
                    setPayments(data.payments || [])
                    setViewer(data.viewer || null)
                    setCounts(data.counts || [])
                }
            } catch (err) {
                if (!cancelled) {
                    setPayments([])
                    toast.error(err instanceof Error ? err.message : 'No se pudo cargar el corte')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [isOpen, organizationId, date, condoId, reloadKey])

    const total = useMemo(() => payments.reduce((s, p) => s + p.amount, 0), [payments])
    const byMethod = useMemo(() => {
        const map = new Map<string, { total: number, count: number }>()
        payments.forEach(p => {
            const cur = map.get(p.method) || { total: 0, count: 0 }
            map.set(p.method, { total: cur.total + p.amount, count: cur.count + 1 })
        })
        return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total)
    }, [payments])
    const byCollector = useMemo(() => {
        const map = new Map<string, { total: number, cash: number, count: number }>()
        payments.forEach(p => {
            const cur = map.get(p.collected_by) || { total: 0, cash: 0, count: 0 }
            map.set(p.collected_by, {
                total: cur.total + p.amount,
                cash: cur.cash + (p.method === 'Efectivo' ? p.amount : 0),
                count: cur.count + 1,
            })
        })
        return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total)
    }, [payments])
    const cashTotal = byMethod.find(([m]) => m === 'Efectivo')?.[1].total || 0
    // Personas con efectivo que arquear (solo cobros registrados por alguien del equipo)
    const collectors: CashCollector[] = useMemo(() => {
        const map = new Map<string, CashCollector>()
        payments.forEach(p => {
            if (p.method !== 'Efectivo' || !p.collected_by_id) return
            const cur = map.get(p.collected_by_id) || { id: p.collected_by_id, name: p.collected_by, cash: 0, count: 0 }
            map.set(p.collected_by_id, { ...cur, cash: cur.cash + p.amount, count: cur.count + 1 })
        })
        return Array.from(map.values()).sort((a, b) => b.cash - a.cash)
    }, [payments])
    const lastCountByName = useMemo(() => {
        const map = new Map<string, CashCountRecord>()
        counts.forEach(c => { if (!map.has(c.counted_for)) map.set(c.counted_for, c) })
        return map
    }, [counts])
    const condoLabel = condoId ? (condominiumList.find(c => c.id === condoId)?.name || '') : 'Todas las propiedades'

    const downloadPdf = () => {
        const doc = new jsPDF()
        doc.setFillColor(5, 150, 105)
        doc.rect(0, 0, 210, 32, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(20)
        doc.text('CORTE DE CAJA', 14, 20)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(longDate(date), 196, 14, { align: 'right' })
        doc.text(condoLabel, 196, 21, { align: 'right' })

        doc.setTextColor(40, 40, 40)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(12)
        doc.text(`Total cobrado: ${money(total)}`, 14, 44)
        doc.text(`Efectivo a entregar: ${money(cashTotal)}`, 196, 44, { align: 'right' })

        autoTable(doc, {
            startY: 50,
            head: [['Método', 'Pagos', 'Total']],
            body: byMethod.map(([m, v]) => [m, String(v.count), money(v.total)]),
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [5, 150, 105] },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
        })
        let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
        autoTable(doc, {
            startY: y,
            head: [['Cobró', 'Pagos', 'Efectivo', 'Total']],
            body: byCollector.map(([c, v]) => [c, String(v.count), money(v.cash), money(v.total)]),
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [79, 70, 229] },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
        autoTable(doc, {
            startY: y,
            head: [['Hora', 'Folio', 'Residente', 'Concepto', 'Método', 'Cobró', 'Monto']],
            body: payments.map(p => [timeMx(p.paid_at), p.folio || '—', `${p.resident}${p.unit ? ` (${p.unit})` : ''}`, p.concept, p.method, p.collected_by, money(p.amount)]),
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [39, 39, 42] },
            columnStyles: { 6: { halign: 'right' } },
        })
        if (counts.length > 0) {
            y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
            autoTable(doc, {
                startY: y,
                head: [['Arqueo a', 'Realizó', 'Sistema', 'Contado', 'Resultado']],
                body: counts.map(c => [c.counted_for, c.counted_by, money(c.expected_amount), money(c.counted_amount), STATUS_UI[statusOf(c.difference)].label(c.difference)]),
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: { fillColor: [79, 70, 229] },
                columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } },
            })
        }
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24
        if (y < 270) {
            doc.setDrawColor(160, 160, 160)
            doc.line(20, y, 90, y)
            doc.line(120, y, 190, y)
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            doc.text('Entregó', 55, y + 5, { align: 'center' })
            doc.text('Recibió', 155, y + 5, { align: 'center' })
        }
        doc.save(`Corte_de_caja_${date}.pdf`)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Corte de Caja" className="max-w-4xl">
            <div className="space-y-5 max-h-[78vh] overflow-y-auto pr-1 custom-scrollbar">
                {view !== 'arqueo' && (
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800 max-w-md">
                        <button type="button" onClick={() => setView('corte')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'corte' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-zinc-400 hover:text-white'}`}>
                            <Receipt size={15} /> Corte del día
                        </button>
                        <button type="button" onClick={() => setView('historial')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'historial' ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'text-zinc-400 hover:text-white'}`}>
                            <History size={15} /> Historial de arqueos
                        </button>
                    </div>
                )}

                {view === 'arqueo' ? (
                    <CashCountPanel
                        organizationId={organizationId}
                        condominiumId={condoId}
                        condoLabel={condoLabel}
                        date={date}
                        viewerName={viewer?.name || 'Yo'}
                        collectors={collectors}
                        onBack={() => setView('corte')}
                        onSaved={() => { setView('corte'); setReloadKey(k => k + 1) }}
                    />
                ) : view === 'historial' ? (
                    <>
                        <div className="flex justify-end">
                            <select value={condoId} onChange={(e) => setCondoId(e.target.value)}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white">
                                <option value="">Todas las propiedades</option>
                                {condominiumList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <CashCountHistory organizationId={organizationId} condominiumId={condoId} condoLabel={condoLabel} refreshKey={reloadKey} />
                    </>
                ) : (<>
                {/* Filtros */}
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setDate(d => shiftDay(d, -1))} className="p-2 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800" aria-label="Día anterior"><ChevronLeft size={16} /></button>
                        <input type="date" value={date} max={todayMx()} onChange={(e) => e.target.value && setDate(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white [color-scheme:dark]" />
                        <button type="button" onClick={() => setDate(d => (d < todayMx() ? shiftDay(d, 1) : d))} disabled={date >= todayMx()} className="p-2 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40" aria-label="Día siguiente"><ChevronRight size={16} /></button>
                        {date !== todayMx() && <button type="button" onClick={() => setDate(todayMx())} className="text-xs text-indigo-300 hover:text-indigo-200 px-2">Hoy</button>}
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={condoId} onChange={(e) => setCondoId(e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white">
                            <option value="">Todas las propiedades</option>
                            {condominiumList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" onClick={() => setView('arqueo')} disabled={loading || collectors.length === 0}
                            title={collectors.length === 0 ? 'Nadie cobró en efectivo este día' : 'Contar el efectivo y compararlo con el sistema'}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40">
                            <Calculator size={15} /> Arqueo
                        </button>
                        <button type="button" onClick={downloadPdf} disabled={loading || payments.length === 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-40">
                            <Download size={15} /> PDF
                        </button>
                    </div>
                </div>
                <p className="text-sm text-zinc-400 capitalize">{longDate(date)}</p>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando corte…</div>
                ) : (
                    <>
                        {/* Totales */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="rounded-xl border border-zinc-700/60 bg-zinc-900 p-4">
                                <p className="text-[11px] uppercase tracking-wide text-zinc-400">Total cobrado</p>
                                <p className="text-2xl font-bold text-white mt-1">{money(total)}</p>
                                <p className="text-xs text-zinc-500 mt-1">{payments.length} {payments.length === 1 ? 'pago' : 'pagos'}</p>
                            </div>
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                                <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">Efectivo en caja</p>
                                <p className="text-2xl font-bold text-emerald-300 mt-1">{money(cashTotal)}</p>
                                <p className="text-xs text-zinc-500 mt-1">A entregar / depositar</p>
                            </div>
                            {byMethod.filter(([m]) => m !== 'Efectivo').slice(0, 2).map(([m, v]) => {
                                const st = METHOD_STYLE[m] || { icon: Receipt, cls: 'text-zinc-300 border-zinc-700 bg-zinc-900' }
                                const Icon = st.icon
                                return (
                                    <div key={m} className={`rounded-xl border p-4 ${st.cls}`}>
                                        <p className="text-[11px] uppercase tracking-wide opacity-80 flex items-center gap-1"><Icon size={12} /> {m}</p>
                                        <p className="text-2xl font-bold mt-1">{money(v.total)}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{v.count} {v.count === 1 ? 'pago' : 'pagos'}</p>
                                    </div>
                                )
                            })}
                        </div>

                        {payments.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
                                <Receipt className="h-8 w-8 text-zinc-600 mx-auto" />
                                <p className="text-sm text-zinc-400 mt-2">No se registraron pagos este día.</p>
                            </div>
                        ) : (
                            <>
                                {/* Por persona */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-zinc-300">Por persona que cobró</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {byCollector.map(([name, v]) => (
                                            <div key={name} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2.5">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="h-8 w-8 rounded-full bg-indigo-500/15 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm text-white truncate">{name}</p>
                                                        <p className="text-xs text-zinc-500">{v.count} {v.count === 1 ? 'pago' : 'pagos'} · efectivo {money(v.cash)}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-white">{money(v.total)}</p>
                                                    {(() => {
                                                        const c = lastCountByName.get(name)
                                                        if (!c) return v.cash > 0 ? <p className="text-[11px] text-zinc-500">Sin arqueo</p> : null
                                                        const ui = STATUS_UI[statusOf(c.difference)]
                                                        return <span className={`inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border mt-0.5 ${ui.cls}`}><ClipboardCheck size={10} /> {ui.label(c.difference)}</span>
                                                    })()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Arqueos del día */}
                                {counts.length > 0 && (
                                    <div className="space-y-2">
                                        <h3 className="text-sm font-semibold text-zinc-300">Arqueos del día</h3>
                                        <div className="space-y-2">
                                            {counts.map(c => {
                                                const ui = STATUS_UI[statusOf(c.difference)]
                                                return (
                                                    <div key={c.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${ui.cls}`}>
                                                        <div className="min-w-0">
                                                            <p className="text-sm text-white">Arqueo a <b>{c.counted_for}</b> <span className="text-zinc-400">· realizó {c.counted_by} · {timeMx(c.created_at)}</span></p>
                                                            <p className="text-xs text-zinc-400">Sistema {money(c.expected_amount)} · Contado {money(c.counted_amount)}{c.notes ? ` · ${c.notes}` : ''}</p>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-sm font-semibold">{ui.label(c.difference)}</span>
                                                            <button type="button" onClick={() => downloadCashCountPdf(c, condoLabel)} className="text-xs text-indigo-300 hover:text-indigo-200 underline">Acta</button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Detalle */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold text-zinc-300">Detalle de pagos</h3>
                                    <div className="rounded-xl border border-zinc-800 overflow-x-auto">
                                        <table className="w-full text-sm min-w-[640px]">
                                            <thead className="bg-zinc-900 text-zinc-400 text-xs">
                                                <tr>
                                                    <th className="text-left px-3 py-2 font-medium">Hora</th>
                                                    <th className="text-left px-3 py-2 font-medium">Residente</th>
                                                    <th className="text-left px-3 py-2 font-medium">Concepto</th>
                                                    <th className="text-left px-3 py-2 font-medium">Método</th>
                                                    <th className="text-left px-3 py-2 font-medium">Cobró</th>
                                                    <th className="text-right px-3 py-2 font-medium">Monto</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/70">
                                                {payments.map(p => (
                                                    <tr key={p.id} className="hover:bg-zinc-900/60">
                                                        <td className="px-3 py-2 text-zinc-400 whitespace-nowrap">{timeMx(p.paid_at)}</td>
                                                        <td className="px-3 py-2 text-white">
                                                            {p.resident}{p.unit && <span className="text-zinc-500"> · {p.unit}</span>}
                                                            {!condoId && p.condominium && <p className="text-[11px] text-zinc-500">{p.condominium}</p>}
                                                        </td>
                                                        <td className="px-3 py-2 text-zinc-300">
                                                            {p.concept}
                                                            {p.folio && <p className="text-[11px] text-zinc-500 font-mono">{p.folio}</p>}
                                                        </td>
                                                        <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">{p.method}</td>
                                                        <td className="px-3 py-2 text-zinc-400">{p.collected_by}</td>
                                                        <td className="px-3 py-2 text-right font-semibold text-white whitespace-nowrap">{money(p.amount)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
                </>)}
            </div>
        </Modal>
    )
}
