'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, FileDown, ClipboardCheck } from 'lucide-react'
import { STATUS_UI, money, statusOf, downloadCashCountPdf, type CashCountRecord } from './cash-count-shared'

interface CashCountHistoryProps {
    organizationId: string
    condominiumId: string
    condoLabel: string
    refreshKey: number
}

const todayMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
const daysAgo = (n: number) => {
    const d = new Date(`${todayMx()}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() - n)
    return d.toISOString().slice(0, 10)
}
const shortDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** Historial de arqueos: el administrador ve a quién se le arqueó, quién lo hizo y el resultado. */
export function CashCountHistory({ organizationId, condominiumId, condoLabel, refreshKey }: CashCountHistoryProps) {
    const [from, setFrom] = useState(daysAgo(30))
    const [to, setTo] = useState(todayMx())
    const [person, setPerson] = useState('')
    const [status, setStatus] = useState('')
    const [counts, setCounts] = useState<CashCountRecord[]>([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            try {
                const qs = new URLSearchParams({ organization_id: organizationId, from, to })
                if (condominiumId) qs.set('condominium_id', condominiumId)
                const res = await fetch(`/api/finance/cash-counts?${qs.toString()}`)
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial')
                if (!cancelled) setCounts(data.counts || [])
            } catch (err) {
                if (!cancelled) {
                    setCounts([])
                    toast.error(err instanceof Error ? err.message : 'No se pudo cargar el historial')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        load()
        return () => { cancelled = true }
    }, [organizationId, condominiumId, from, to, refreshKey])

    const people = useMemo(() => Array.from(new Set(counts.map(c => c.counted_for))).sort(), [counts])
    const filtered = counts.filter(c => (!person || c.counted_for === person) && (!status || statusOf(c.difference) === status))
    const totals = useMemo(() => ({
        count: filtered.length,
        faltantes: filtered.filter(c => c.difference < -0.005).reduce((s, c) => s + Math.abs(c.difference), 0),
        sobrantes: filtered.filter(c => c.difference > 0.005).reduce((s, c) => s + c.difference, 0),
        cuadrados: filtered.filter(c => Math.abs(c.difference) < 0.005).length,
    }), [filtered])

    const inputCls = 'bg-zinc-900 border border-zinc-800 rounded-lg py-2 px-3 text-sm text-white'

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Desde</label>
                    <input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Hasta</label>
                    <input type="date" value={to} max={todayMx()} onChange={(e) => e.target.value && setTo(e.target.value)} className={`${inputCls} [color-scheme:dark]`} />
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Persona arqueada</label>
                    <select value={person} onChange={(e) => setPerson(e.target.value)} className={inputCls}>
                        <option value="">Todo el equipo</option>
                        {people.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[11px] text-zinc-500">Resultado</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                        <option value="">Todos</option>
                        <option value="cuadrado">Cuadra</option>
                        <option value="faltante">Con faltante</option>
                        <option value="sobrante">Con sobrante</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border border-zinc-700/60 bg-zinc-900 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-400">Arqueos</p>
                    <p className="text-xl font-bold text-white">{totals.count}</p>
                </div>
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">Cuadraron</p>
                    <p className="text-xl font-bold text-emerald-300">{totals.cuadrados}</p>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-rose-300/80">Faltantes</p>
                    <p className="text-xl font-bold text-rose-300">{money(totals.faltantes)}</p>
                </div>
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-[11px] uppercase tracking-wide text-amber-300/80">Sobrantes</p>
                    <p className="text-xl font-bold text-amber-300">{money(totals.sobrantes)}</p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin" /> Cargando arqueos…</div>
            ) : filtered.length === 0 ? (
                <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center">
                    <ClipboardCheck className="h-8 w-8 text-zinc-600 mx-auto" />
                    <p className="text-sm text-zinc-400 mt-2">No hay arqueos en este periodo.</p>
                </div>
            ) : (
                <div className="rounded-xl border border-zinc-800 overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                        <thead className="bg-zinc-900 text-zinc-400 text-xs">
                            <tr>
                                <th className="text-left px-3 py-2 font-medium">Fecha</th>
                                <th className="text-left px-3 py-2 font-medium">Se le arqueó a</th>
                                <th className="text-left px-3 py-2 font-medium">Realizó</th>
                                <th className="text-right px-3 py-2 font-medium">Sistema</th>
                                <th className="text-right px-3 py-2 font-medium">Contado</th>
                                <th className="text-left px-3 py-2 font-medium">Resultado</th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/70">
                            {filtered.map(c => {
                                const st = statusOf(c.difference)
                                const ui = STATUS_UI[st]
                                return (
                                    <tr key={c.id} className="hover:bg-zinc-900/60 align-top">
                                        <td className="px-3 py-2 text-zinc-300 whitespace-nowrap">
                                            {shortDate(c.count_date)}
                                            {!condominiumId && c.condominium && <p className="text-[11px] text-zinc-500">{c.condominium}</p>}
                                        </td>
                                        <td className="px-3 py-2 text-white">{c.counted_for}</td>
                                        <td className="px-3 py-2 text-zinc-400">{c.counted_by}</td>
                                        <td className="px-3 py-2 text-right text-zinc-300 tabular-nums">{money(c.expected_amount)}</td>
                                        <td className="px-3 py-2 text-right text-white tabular-nums">{money(c.counted_amount)}</td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border ${ui.cls}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${ui.dot}`} /> {ui.label(c.difference)}
                                            </span>
                                            {c.notes && <p className="text-[11px] text-zinc-500 mt-1 max-w-[220px]">{c.notes}</p>}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button type="button" onClick={() => downloadCashCountPdf(c, c.condominium || condoLabel)}
                                                className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200" title="Descargar acta">
                                                <FileDown size={14} /> Acta
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
