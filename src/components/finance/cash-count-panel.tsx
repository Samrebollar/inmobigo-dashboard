'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, UserCheck, ShieldCheck, Coins, Banknote, Calculator, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'
import { DENOMINATIONS, STATUS_UI, money, statusOf, downloadCashCountPdf, longDate, type CashCountRecord } from './cash-count-shared'

export type CashCollector = { id: string, name: string, cash: number, count: number }

interface CashCountPanelProps {
    organizationId: string
    condominiumId: string
    condoLabel: string
    date: string
    viewerName: string
    collectors: CashCollector[]
    onBack: () => void
    onSaved: () => void
}

export function CashCountPanel({ organizationId, condominiumId, condoLabel, date, viewerName, collectors, onBack, onSaved }: CashCountPanelProps) {
    const [countedFor, setCountedFor] = useState(collectors[0]?.id || '')
    const [mode, setMode] = useState<'denominaciones' | 'total'>('denominaciones')
    const [qty, setQty] = useState<Record<string, string>>({})
    const [manualTotal, setManualTotal] = useState('')
    const [notes, setNotes] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!collectors.find(c => c.id === countedFor)) setCountedFor(collectors[0]?.id || '')
    }, [collectors, countedFor])

    const person = collectors.find(c => c.id === countedFor)
    const expected = person?.cash || 0
    const denomTotal = useMemo(() => DENOMINATIONS.reduce((s, d) => s + (parseInt(qty[String(d.value)] || '0', 10) || 0) * d.value, 0), [qty])
    const counted = mode === 'denominaciones' ? denomTotal : (parseFloat(manualTotal) || 0)
    const hasCount = mode === 'denominaciones' ? Object.values(qty).some(v => Number(v) > 0) : manualTotal !== ''
    const diff = Math.round((counted - expected) * 100) / 100
    const st = statusOf(diff)
    const ui = STATUS_UI[st]

    const save = async () => {
        if (!person) return
        if (!hasCount) {
            toast.error('Captura el efectivo contado.')
            return
        }
        if (st !== 'cuadrado' && !notes.trim()) {
            toast.error('Explica la diferencia en las observaciones.')
            return
        }
        setSaving(true)
        try {
            const denominations = mode === 'denominaciones'
                ? Object.fromEntries(Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([k, v]) => [k, parseInt(v, 10)]))
                : {}
            const res = await fetch('/api/finance/cash-counts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId,
                    condominiumId: condominiumId || null,
                    date,
                    countedFor: person.id,
                    countedAmount: counted,
                    denominations,
                    notes: notes.trim(),
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'No se pudo guardar el arqueo')
            const saved = data.count
            const record: CashCountRecord = {
                id: saved.id,
                count_date: date,
                condominium: condoLabel,
                counted_by: viewerName,
                counted_for: person.name,
                expected_amount: Number(saved.expected_amount),
                counted_amount: Number(saved.counted_amount),
                difference: Number(saved.difference),
                status: saved.status,
                denominations,
                notes: notes.trim(),
                created_at: saved.created_at,
            }
            downloadCashCountPdf(record, condoLabel)
            const finalUi = STATUS_UI[statusOf(record.difference)]
            toast.success(`Arqueo guardado · ${finalUi.label(record.difference)}`, { description: `${person.name} · ${longDate(date)}` })
            onSaved()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'No se pudo guardar el arqueo')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-5">
            <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
                <ArrowLeft size={15} /> Volver al corte
            </button>

            <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2"><Calculator size={18} className="text-indigo-400" /> Arqueo de caja</h3>
                <p className="text-sm text-zinc-400 capitalize">{longDate(date)} · {condoLabel}</p>
            </div>

            {collectors.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center text-sm text-zinc-400">
                    Nadie cobró en efectivo este día, no hay caja que arquear.
                </div>
            ) : (
                <>
                    {/* Quién y a quién */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
                            <label className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1"><UserCheck size={12} /> Se le arquea a</label>
                            <select value={countedFor} onChange={(e) => setCountedFor(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white">
                                {collectors.map(c => <option key={c.id} value={c.id}>{c.name} · {money(c.cash)}</option>)}
                            </select>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 space-y-1.5">
                            <p className="text-[11px] uppercase tracking-wide text-zinc-500 flex items-center gap-1"><ShieldCheck size={12} /> Arqueo realizado por</p>
                            <p className="py-2 text-sm text-white">{viewerName}</p>
                        </div>
                    </div>

                    {/* Esperado */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">Efectivo según sistema</p>
                            <p className="text-xs text-zinc-500">{person?.count || 0} {person?.count === 1 ? 'cobro' : 'cobros'} en efectivo de {person?.name}</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-300">{money(expected)}</p>
                    </div>

                    {/* Conteo */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-zinc-300">Efectivo contado</h4>
                            <div className="flex gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
                                <button type="button" onClick={() => setMode('denominaciones')} className={`px-2.5 py-1 rounded-md ${mode === 'denominaciones' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Billetes y monedas</button>
                                <button type="button" onClick={() => setMode('total')} className={`px-2.5 py-1 rounded-md ${mode === 'total' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Monto total</button>
                            </div>
                        </div>

                        {mode === 'denominaciones' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {(['billete', 'moneda'] as const).map(kind => (
                                    <div key={kind} className="rounded-xl border border-zinc-800 divide-y divide-zinc-800/70">
                                        <p className="px-3 py-2 text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                                            {kind === 'billete' ? <Banknote size={13} /> : <Coins size={13} />} {kind === 'billete' ? 'Billetes' : 'Monedas'}
                                        </p>
                                        {DENOMINATIONS.filter(d => d.kind === kind).map(d => {
                                            const n = parseInt(qty[String(d.value)] || '0', 10) || 0
                                            return (
                                                <div key={d.value} className="flex items-center gap-3 px-3 py-1.5">
                                                    <span className="w-14 text-sm text-zinc-300">{d.label}</span>
                                                    <span className="text-zinc-600 text-xs">×</span>
                                                    <input type="number" min="0" step="1" inputMode="numeric" placeholder="0"
                                                        value={qty[String(d.value)] || ''}
                                                        onChange={(e) => setQty(prev => ({ ...prev, [String(d.value)]: e.target.value.replace(/[^0-9]/g, '') }))}
                                                        className="w-20 bg-zinc-950 border border-zinc-800 rounded-md py-1 px-2 text-sm text-white text-center focus:outline-none focus:border-indigo-500/50" />
                                                    <span className={`ml-auto text-sm tabular-nums ${n > 0 ? 'text-white' : 'text-zinc-600'}`}>{money(n * d.value)}</span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="relative max-w-xs">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                                <input type="number" min="0" step="0.01" placeholder="0.00" value={manualTotal} onChange={(e) => setManualTotal(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2.5 pl-6 pr-3 text-lg text-white focus:outline-none focus:border-indigo-500/50" />
                            </div>
                        )}
                    </div>

                    {/* Resultado */}
                    <div className={`rounded-xl border p-4 grid grid-cols-3 gap-3 items-center ${hasCount ? ui.cls : 'border-zinc-800 bg-zinc-900/40'}`}>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-zinc-400">Sistema</p>
                            <p className="text-base font-semibold text-white">{money(expected)}</p>
                        </div>
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-zinc-400">Contado</p>
                            <p className="text-base font-semibold text-white">{money(counted)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[11px] uppercase tracking-wide text-zinc-400">Resultado</p>
                            {hasCount ? (
                                <p className="text-base font-bold flex items-center justify-end gap-1.5">
                                    {st === 'cuadrado' ? <CheckCircle2 size={16} /> : st === 'faltante' ? <AlertTriangle size={16} /> : <TrendingUp size={16} />}
                                    {ui.label(diff)}
                                </p>
                            ) : <p className="text-sm text-zinc-500">Captura el conteo</p>}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold text-zinc-300">
                            Observaciones {hasCount && st !== 'cuadrado' ? <span className="text-rose-400">(obligatorio por la diferencia)</span> : <span className="text-zinc-500 font-normal">(opcional)</span>}
                        </label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej. Se entregó el efectivo a administración / motivo del faltante"
                            className="w-full min-h-[64px] resize-none bg-zinc-950 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50" />
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onBack} className="px-4 py-2 text-sm text-zinc-400 hover:text-white rounded-lg">Cancelar</button>
                        <button type="button" onClick={save} disabled={saving || !person || !hasCount}
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar arqueo y descargar acta
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
