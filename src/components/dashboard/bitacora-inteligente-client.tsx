'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
    Activity, Users, Package, Calendar, Clock, ArrowDownLeft, ArrowUpRight,
    Search, Filter, X, RefreshCw, Download, Printer, ChevronDown,
    DoorOpen, MapPin, User, Building2, Shield, CheckCircle2,
    AlertTriangle, XCircle, MoreVertical, LogOut, Eye, BookOpen,
    SlidersHorizontal, TrendingUp, FileText,
} from 'lucide-react'
import type { BitacoraEntry, BitacoraKPIs, BitacoraFilters, EventType, BitacoraStatus } from '@/types/bitacora'
import { EVENT_TYPE_CONFIG, STATUS_CONFIG, VISITOR_TYPE_LABELS, COURIER_ICONS } from '@/types/bitacora'
import {
    getBitacoraEntriesAction,
    getBitacoraKPIsAction,
    getPeopleInsideAction,
    registerCheckoutAction,
    getBitacoraTimelineAction,
} from '@/app/actions/bitacora-actions'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
    orgId: string
    userId: string
    userName: string
    initialEntries: BitacoraEntry[]
    initialPeopleInside: BitacoraEntry[]
    initialKPIs: BitacoraKPIs
    condos: { id: string; name: string }[]
}

type TabId = 'bitacora' | 'inside'

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtTime(iso?: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso?: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtDateTime(iso?: string) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}
function fmtDuration(mins?: number) {
    if (!mins) return '—'
    if (mins < 60) return `${mins} min`
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}min` : `${h}h`
}
function timeAgo(iso?: string) {
    if (!iso) return ''
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'ahora'
    if (mins < 60) return `hace ${mins} min`
    const hrs = Math.floor(mins / 60)
    return `hace ${hrs}h`
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon: Icon, color, sub }: {
    label: string; value: number | string; icon: any; color: string; sub?: string
}) {
    return (
        <div className={`relative overflow-hidden p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-all`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${color.replace('text-', 'bg-').replace('400', '500/10')}`}>
                    <Icon size={18} className={color} />
                </div>
            </div>
            <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
        </div>
    )
}

// ─── Event Type Badge ─────────────────────────────────────────────────────────
function EventBadge({ type }: { type: EventType }) {
    const cfg = EVENT_TYPE_CONFIG[type]
    const Icon = type === 'access' ? DoorOpen : type === 'delivery' ? Package : Calendar
    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
            <Icon size={10} />
            {cfg.label}
        </span>
    )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: BitacoraStatus }) {
    const cfg = STATUS_CONFIG[status]
    const Icon = status === 'active' ? CheckCircle2 : status === 'completed' ? LogOut : status === 'cancelled' ? XCircle : AlertTriangle
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black ${cfg.bg} ${cfg.color}`}>
            <Icon size={10} />
            {cfg.label}
        </span>
    )
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function EntryTimeline({ entry, sourceData, onClose, onCheckout, userName }: {
    entry: BitacoraEntry
    sourceData: any
    onClose: () => void
    onCheckout: (id: string, table: any) => void
    userName: string
}) {
    const events: { time: string; label: string; icon: any; color: string }[] = []

    if (entry.created_at) {
        events.push({ time: fmtTime(entry.created_at), label: 'Registro creado', icon: BookOpen, color: 'text-zinc-400' })
    }
    if (entry.event_type === 'access' && sourceData?.qr_token) {
        events.push({ time: fmtTime(entry.created_at), label: 'QR generado', icon: Shield, color: 'text-indigo-400' })
    }
    if (entry.checked_in_at) {
        events.push({
            time: fmtTime(entry.checked_in_at),
            label: entry.event_type === 'delivery' ? 'Entrega llegó' : entry.event_type === 'amenity' ? 'Acceso a amenidad' : 'Entrada autorizada',
            icon: ArrowDownLeft,
            color: 'text-emerald-400',
        })
    }
    if (entry.checked_out_at) {
        events.push({ time: fmtTime(entry.checked_out_at), label: entry.event_type === 'delivery' ? 'Entrega completada' : 'Salida registrada', icon: ArrowUpRight, color: 'text-rose-400' })
        if (entry.duration_minutes) {
            events.push({ time: '', label: `Permanencia total: ${fmtDuration(entry.duration_minutes)}`, icon: Clock, color: 'text-blue-400' })
        }
    }

    return (
        <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0a0a10] border-l border-white/[0.06] shadow-[−20px_0_60px_rgba(0,0,0,0.5)] flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
                <div>
                    <EventBadge type={entry.event_type} />
                    <h2 className="text-lg font-black text-white mt-2">{entry.person_name}</h2>
                    <p className="text-sm text-zinc-500">{entry.unit_number ? `Unidad ${entry.unit_number}` : ''} {entry.condominium_name ? `· ${entry.condominium_name}` : ''}</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/[0.08] text-zinc-500 hover:text-white transition-colors">
                    <X size={18} />
                </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-2">
                    {[
                        { label: 'Fecha', value: fmtDate(entry.checked_in_at) },
                        { label: 'Entrada', value: fmtTime(entry.checked_in_at) },
                        { label: 'Salida', value: fmtTime(entry.checked_out_at) },
                        { label: 'Permanencia', value: fmtDuration(entry.duration_minutes) },
                        { label: 'Guardia', value: entry.guard_name || '—' },
                        { label: 'Caseta', value: entry.checkpoint || '—' },
                        { label: 'Autorizado por', value: entry.authorized_by || '—' },
                        ...(entry.event_type === 'amenity' ? [{ label: 'Amenidad', value: entry.amenity_name || '—' }] : []),
                        ...(entry.event_type === 'delivery' ? [{ label: 'Empresa', value: entry.company || '—' }] : []),
                        ...(entry.visitor_type ? [{ label: 'Tipo', value: VISITOR_TYPE_LABELS[entry.visitor_type] || entry.visitor_type }] : []),
                    ].map(m => (
                        <div key={m.label} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                            <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">{m.label}</p>
                            <p className="text-xs font-bold text-zinc-200">{m.value}</p>
                        </div>
                    ))}
                </div>

                {/* Timeline */}
                <div>
                    <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-3">Línea de Tiempo</p>
                    <div className="relative pl-6">
                        <div className="absolute left-2 top-0 bottom-0 w-px bg-white/[0.06]" />
                        {events.map((ev, i) => {
                            const Icon = ev.icon
                            return (
                                <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
                                    <div className={`absolute -left-4 mt-0.5 p-1 rounded-full ${ev.color.replace('text-', 'bg-').replace('400', '500/20')} border border-white/[0.08]`}>
                                        <Icon size={10} className={ev.color} />
                                    </div>
                                    <div className="ml-2">
                                        {ev.time && <p className="text-[10px] font-bold text-zinc-500 mb-0.5">{ev.time}</p>}
                                        <p className="text-xs text-zinc-300 font-medium">{ev.label}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Estado actual */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-zinc-400">Estado actual</p>
                        <StatusBadge status={entry.status} />
                    </div>
                </div>
            </div>

            {/* Footer */}
            {entry.status === 'active' && (
                <div className="p-5 border-t border-white/[0.06]">
                    <button
                        onClick={() => onCheckout(entry.source_id, entry.source_table)}
                        className="w-full py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-black text-sm border border-rose-500/20 hover:border-rose-500/40 transition-all flex items-center justify-center gap-2"
                    >
                        <LogOut size={15} />
                        Registrar Salida
                    </button>
                </div>
            )}
        </motion.div>
    )
}

// ─── Main Table Row ───────────────────────────────────────────────────────────
function BitacoraRow({ entry, onSelect }: { entry: BitacoraEntry; onSelect: () => void }) {
    const courierKey = Object.keys(COURIER_ICONS).find(k => entry.company?.toLowerCase().includes(k))
    const courierEmoji = courierKey ? COURIER_ICONS[courierKey] : '📦'

    return (
        <tr
            onClick={onSelect}
            className="group border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
        >
            {/* Time */}
            <td className="py-3 px-4 whitespace-nowrap">
                <p className="text-xs font-bold text-zinc-300">{fmtTime(entry.checked_in_at)}</p>
                <p className="text-[10px] text-zinc-600">{fmtDate(entry.checked_in_at)}</p>
            </td>
            {/* Type */}
            <td className="py-3 px-4">
                <EventBadge type={entry.event_type} />
            </td>
            {/* Person */}
            <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0 text-sm">
                        {entry.event_type === 'delivery' ? courierEmoji :
                         entry.event_type === 'amenity' ? '🏊' : '👤'}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-zinc-200">{entry.person_name || '—'}</p>
                        {entry.event_type === 'delivery' && entry.company && (
                            <p className="text-[10px] text-zinc-600">{entry.company}</p>
                        )}
                        {entry.event_type === 'amenity' && entry.amenity_name && (
                            <p className="text-[10px] text-zinc-600">{entry.amenity_name}</p>
                        )}
                    </div>
                </div>
            </td>
            {/* Unit */}
            <td className="py-3 px-4 hidden md:table-cell">
                <p className="text-xs text-zinc-400">{entry.unit_number ? `Unidad ${entry.unit_number}` : '—'}</p>
                {entry.condominium_name && <p className="text-[10px] text-zinc-600">{entry.condominium_name}</p>}
            </td>
            {/* Entry / Exit */}
            <td className="py-3 px-4 hidden lg:table-cell">
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                        <ArrowDownLeft size={10} className="text-emerald-500" />
                        <span className="text-[11px] text-zinc-400">{fmtTime(entry.checked_in_at)}</span>
                    </div>
                    {entry.checked_out_at && (
                        <div className="flex items-center gap-1.5">
                            <ArrowUpRight size={10} className="text-rose-500" />
                            <span className="text-[11px] text-zinc-400">{fmtTime(entry.checked_out_at)}</span>
                        </div>
                    )}
                </div>
            </td>
            {/* Duration */}
            <td className="py-3 px-4 hidden lg:table-cell">
                {entry.status === 'active' ? (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {timeAgo(entry.checked_in_at)}
                    </span>
                ) : (
                    <span className="text-xs text-zinc-500">{fmtDuration(entry.duration_minutes)}</span>
                )}
            </td>
            {/* Status */}
            <td className="py-3 px-4">
                <StatusBadge status={entry.status} />
            </td>
            {/* Guard */}
            <td className="py-3 px-4 hidden xl:table-cell">
                <p className="text-[11px] text-zinc-500">{entry.guard_name || '—'}</p>
            </td>
            {/* Action */}
            <td className="py-3 px-4">
                <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-white/[0.08] text-zinc-500 hover:text-white transition-all">
                    <Eye size={13} />
                </button>
            </td>
        </tr>
    )
}

// ─── People Inside Card ───────────────────────────────────────────────────────
function PersonInsideCard({ entry, onSelect, onCheckout }: {
    entry: BitacoraEntry
    onSelect: () => void
    onCheckout: () => void
}) {
    const elapsed = entry.checked_in_at
        ? Math.floor((Date.now() - new Date(entry.checked_in_at).getTime()) / 60000)
        : 0
    const isLong = elapsed > 120

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl bg-white/[0.03] border transition-colors cursor-pointer hover:bg-white/[0.05] ${isLong ? 'border-orange-500/30' : 'border-white/[0.06]'}`}
            onClick={onSelect}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isLong ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}>
                        {entry.event_type === 'delivery' ? '📦' : '👤'}
                    </div>
                    <div>
                        <p className="text-sm font-black text-white">{entry.person_name}</p>
                        {entry.unit_number && <p className="text-[11px] text-zinc-500">Unidad {entry.unit_number}</p>}
                        {entry.authorized_by && <p className="text-[11px] text-zinc-600">Autorizado por {entry.authorized_by}</p>}
                    </div>
                </div>
                <button
                    onClick={e => { e.stopPropagation(); onCheckout() }}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all shrink-0"
                    title="Registrar salida"
                >
                    <LogOut size={12} />
                </button>
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
                <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isLong ? 'bg-orange-400' : 'bg-emerald-400'} animate-pulse`} />
                    <span className={`text-[11px] font-bold ${isLong ? 'text-orange-400' : 'text-emerald-400'}`}>
                        Dentro · {fmtDuration(elapsed)}
                    </span>
                </div>
                <EventBadge type={entry.event_type} />
            </div>
        </motion.div>
    )
}

// ─── MAIN CLIENT COMPONENT ────────────────────────────────────────────────────
export function BitacoraInteligenteClient({
    orgId, userId, userName,
    initialEntries, initialPeopleInside, initialKPIs, condos,
}: Props) {
    const [activeTab, setActiveTab] = useState<TabId>('bitacora')
    const [entries, setEntries] = useState<BitacoraEntry[]>(initialEntries)
    const [peopleInside, setPeopleInside] = useState<BitacoraEntry[]>(initialPeopleInside)
    const [kpis, setKpis] = useState<BitacoraKPIs>(initialKPIs)
    const [loading, setLoading] = useState(false)
    const [selectedEntry, setSelectedEntry] = useState<BitacoraEntry | null>(null)
    const [sourceData, setSourceData] = useState<any>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState<BitacoraFilters>({ event_type: 'all', status: 'all' })
    const [search, setSearch] = useState('')
    const [selectedCondoId, setSelectedCondoId] = useState<string>('')
    const [exportOpen, setExportOpen] = useState(false)
    const exportRef = useRef<HTMLDivElement>(null)
    const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined)

    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
                setExportOpen(false)
            }
        }
        document.addEventListener('mousedown', handleOutside)
        return () => document.removeEventListener('mousedown', handleOutside)
    }, [])

    const refresh = useCallback(async () => {
        setLoading(true)
        try {
            const activeFilters = { ...filters, search: search || undefined, condominium_id: selectedCondoId || undefined }
            const [entriesRes, insideRes, kpisRes] = await Promise.all([
                getBitacoraEntriesAction(orgId, activeFilters),
                getPeopleInsideAction(orgId),
                getBitacoraKPIsAction(orgId),
            ])
            if (entriesRes.success) setEntries(entriesRes.entries)
            if (insideRes.success) setPeopleInside(insideRes.entries)
            if (kpisRes.success && kpisRes.kpis) setKpis(kpisRes.kpis)
        } finally {
            setLoading(false)
        }
    }, [orgId, filters, search, selectedCondoId])

    const handleSearch = (val: string) => {
        setSearch(val)
        clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => {
            getBitacoraEntriesAction(orgId, { ...filters, search: val || undefined, condominium_id: selectedCondoId || undefined }).then(r => {
                if (r.success) setEntries(r.entries)
            })
        }, 400)
    }

    const handleCondoSelect = async (condoId: string) => {
        setSelectedCondoId(condoId)
        const newFilters = { ...filters, condominium_id: condoId || undefined }
        setFilters(newFilters)
        const r = await getBitacoraEntriesAction(orgId, { ...newFilters, search: search || undefined })
        if (r.success) setEntries(r.entries)
    }

    const handleSelectEntry = async (entry: BitacoraEntry) => {
        setSelectedEntry(entry)
        const res = await getBitacoraTimelineAction(entry.source_id, entry.source_table)
        if (res.success) setSourceData(res.entry)
    }

    const handleCheckout = async (entryId: string, table: any) => {
        const r = await registerCheckoutAction(entryId, table, userName)
        if (r.success) {
            toast.success('Salida registrada correctamente')
            setSelectedEntry(null)
            refresh()
        } else {
            toast.error(r.error || 'Error al registrar salida')
        }
    }

    const handleExportCSV = () => {
        const headers = ['Fecha', 'Hora Entrada', 'Hora Salida', 'Tipo', 'Persona', 'Unidad', 'Condominio', 'Permanencia', 'Estado', 'Guardia', 'Caseta']
        const rows = entries.map(e => [
            fmtDate(e.checked_in_at),
            fmtTime(e.checked_in_at),
            fmtTime(e.checked_out_at),
            EVENT_TYPE_CONFIG[e.event_type]?.label || e.event_type,
            e.person_name,
            e.unit_number || '',
            e.condominium_name || '',
            fmtDuration(e.duration_minutes),
            STATUS_CONFIG[e.status]?.label || e.status,
            e.guard_name || '',
            e.checkpoint || '',
        ])
        const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `bitacora-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Bitácora exportada a CSV')
    }

    const applyFilter = async (key: keyof BitacoraFilters, val: any) => {
        const newFilters = { ...filters, [key]: val, condominium_id: selectedCondoId || undefined }
        setFilters(newFilters)
        const r = await getBitacoraEntriesAction(orgId, { ...newFilters, search: search || undefined })
        if (r.success) setEntries(r.entries)
    }

    const tabs: { id: TabId; label: string; icon: any; count?: number }[] = [
        { id: 'bitacora', label: 'Bitácora', icon: BookOpen, count: kpis.movimientos_hoy },
        { id: 'inside', label: 'Personas Dentro', icon: Users, count: kpis.personas_dentro },
    ]

    return (
        <div className="min-h-screen bg-[#070710]">
            {/* ── Header ─────────────────────────────────────────────────── */}
            <div className="border-b border-white/[0.06] bg-black/20 backdrop-blur-xl sticky top-0 z-30">
                <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                            <BookOpen size={20} className="text-cyan-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-white tracking-tight">Bitácora Inteligente</h1>
                            <p className="text-[11px] text-zinc-500">Historial oficial automático del condominio</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={refresh}
                            disabled={loading}
                            className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>

                        <div className="relative" ref={exportRef}>
                            <button
                                onClick={() => setExportOpen(!exportOpen)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                    exportOpen
                                        ? 'bg-cyan-500/15 border-cyan-500/35 text-cyan-300'
                                        : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.08]'
                                }`}
                            >
                                <Download size={13} />
                                Exportar
                                <ChevronDown size={12} className={`transition-transform duration-200 ${exportOpen ? 'rotate-180 text-cyan-300' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {exportOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                                        transition={{ duration: 0.12, ease: 'easeOut' }}
                                        className="absolute right-0 mt-2 z-50 w-56 bg-[#0c0c12]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] p-2"
                                    >
                                        <button
                                            onClick={() => {
                                                handleExportCSV()
                                                setExportOpen(false)
                                            }}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-400 text-left transition-all duration-150 text-zinc-300 group cursor-pointer"
                                        >
                                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all shrink-0">
                                                <FileText size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold">Exportar a Excel</p>
                                                <p className="text-[9px] text-zinc-500 group-hover:text-emerald-500/70">Reporte CSV estructurado</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => {
                                                window.print()
                                                setExportOpen(false)
                                            }}
                                            className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 text-left transition-all duration-150 text-zinc-300 group cursor-pointer mt-1"
                                        >
                                            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500/20 transition-all shrink-0">
                                                <Printer size={14} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold">Exportar a PDF</p>
                                                <p className="text-[9px] text-zinc-500 group-hover:text-rose-500/70">Imprimir o guardar reporte visual</p>
                                            </div>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6 space-y-6">

                {/* ── KPIs ───────────────────────────────────────────────── */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                    <KPICard label="Accesos hoy" value={kpis.accesos_hoy} icon={DoorOpen} color="text-indigo-400" />
                    <KPICard label="Dentro ahora" value={kpis.personas_dentro} icon={Users} color="text-emerald-400" />
                    <KPICard label="Entregas hoy" value={kpis.entregas_hoy} icon={Package} color="text-amber-400" />
                    <KPICard label="Amenidades" value={kpis.amenidades_activas} icon={Calendar} color="text-purple-400" />
                    <KPICard label="Entradas" value={kpis.total_entradas} icon={ArrowDownLeft} color="text-green-400" />
                    <KPICard label="Salidas" value={kpis.total_salidas} icon={ArrowUpRight} color="text-rose-400" />
                    <KPICard label="Tiempo prom." value={kpis.tiempo_promedio_min ? `${kpis.tiempo_promedio_min}m` : '—'} icon={Clock} color="text-blue-400" />
                    <KPICard label="Movimientos" value={kpis.movimientos_hoy} icon={Activity} color="text-cyan-400" />
                </div>

                {/* ── Property Selector ─────────────────────────────── */}
                {condos.length > 1 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl flex-wrap">
                            <button
                                onClick={() => handleCondoSelect('')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                    selectedCondoId === ''
                                        ? 'bg-white/[0.10] text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-200'
                                }`}
                            >
                                <Building2 size={13} />
                                Todas las propiedades
                            </button>
                            {condos.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleCondoSelect(c.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                                        selectedCondoId === c.id
                                            ? 'bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30'
                                            : 'text-zinc-500 hover:text-zinc-200'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                        selectedCondoId === c.id ? 'bg-cyan-400' : 'bg-zinc-600'
                                    }`} />
                                    {c.name}
                                </button>
                            ))}
                        </div>
                        {selectedCondoId && (
                            <span className="text-[10px] text-zinc-600">
                                Mostrando: <span className="text-cyan-400 font-bold">{condos.find(c => c.id === selectedCondoId)?.name}</span>
                            </span>
                        )}
                    </div>
                )}

                {/* ── Tabs ───────────────────────────────────────────────── */}
                <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-2xl w-fit">
                    {tabs.map(t => {
                        const Icon = t.icon
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === t.id ? 'bg-white/[0.08] text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                <Icon size={15} />
                                {t.label}
                                {t.count !== undefined && t.count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeTab === t.id ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/[0.06] text-zinc-500'}`}>
                                        {t.count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* ── TAB: BITÁCORA ─────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                    {activeTab === 'bitacora' && (
                        <motion.div
                            key="bitacora"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-4"
                        >
                            {/* Toolbar */}
                            <div className="flex flex-col md:flex-row gap-3">
                                {/* Search */}
                                <div className="relative flex-1">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por persona, unidad, empresa, guardia..."
                                        value={search}
                                        onChange={e => handleSearch(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 transition-colors"
                                    />
                                </div>
                                {/* Filters toggle */}
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white'}`}
                                >
                                    <SlidersHorizontal size={14} />
                                    Filtros
                                </button>
                            </div>

                            {/* Filter Panel */}
                            <AnimatePresence>
                                {showFilters && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {/* Event type */}
                                            <div>
                                                <label className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Tipo</label>
                                                <select
                                                    value={filters.event_type || 'all'}
                                                    onChange={e => applyFilter('event_type', e.target.value)}
                                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                                                >
                                                    <option value="all">Todos</option>
                                                    <option value="access">Acceso</option>
                                                    <option value="delivery">Entrega</option>
                                                    <option value="amenity">Amenidad</option>
                                                </select>
                                            </div>
                                            {/* Status */}
                                            <div>
                                                <label className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Estado</label>
                                                <select
                                                    value={filters.status || 'all'}
                                                    onChange={e => applyFilter('status', e.target.value)}
                                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                                                >
                                                    <option value="all">Todos</option>
                                                    <option value="active">Dentro</option>
                                                    <option value="completed">Salió</option>
                                                    <option value="pending">Pendiente</option>
                                                    <option value="cancelled">Cancelado</option>
                                                    <option value="expired">Expirado</option>
                                                </select>
                                            </div>
                                            {/* Date from */}
                                            <div>
                                                <label className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Desde</label>
                                                <input
                                                    type="date"
                                                    value={filters.date_from || ''}
                                                    onChange={e => applyFilter('date_from', e.target.value)}
                                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                                                />
                                            </div>
                                            {/* Date to */}
                                            <div>
                                                <label className="block text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1.5">Hasta</label>
                                                <input
                                                    type="date"
                                                    value={filters.date_to || ''}
                                                    onChange={e => applyFilter('date_to', e.target.value)}
                                                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50"
                                                />
                                            </div>
                                            {/* Clear filters */}
                                            <div className="col-span-2 flex items-end">
                                                <button
                                                    onClick={() => {
                                                        setFilters({ event_type: 'all', status: 'all' })
                                                        setSearch('')
                                                        getBitacoraEntriesAction(orgId, {}).then(r => {
                                                            if (r.success) setEntries(r.entries)
                                                        })
                                                    }}
                                                    className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white hover:bg-white/[0.06] rounded-xl transition-colors border border-transparent hover:border-white/[0.08]"
                                                >
                                                    Limpiar filtros
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Table */}
                            <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-white/[0.06]">
                                                {['Hora', 'Tipo', 'Persona / Empresa', 'Unidad', 'Entrada / Salida', 'Permanencia', 'Estado', 'Guardia', ''].map(h => (
                                                    <th key={h} className={`px-4 py-3 text-left text-[9px] font-black text-zinc-600 uppercase tracking-widest ${h === 'Unidad' ? 'hidden md:table-cell' : h === 'Entrada / Salida' || h === 'Permanencia' ? 'hidden lg:table-cell' : h === 'Guardia' ? 'hidden xl:table-cell' : ''}`}>
                                                        {h}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {entries.length === 0 ? (
                                                <tr>
                                                    <td colSpan={9} className="py-16 text-center">
                                                        <BookOpen size={32} className="text-zinc-700 mx-auto mb-3" />
                                                        <p className="text-sm font-bold text-zinc-600">Sin registros</p>
                                                        <p className="text-xs text-zinc-700 mt-1">Los movimientos aparecerán aquí automáticamente</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                entries.map(entry => (
                                                    <BitacoraRow
                                                        key={entry.id}
                                                        entry={entry}
                                                        onSelect={() => handleSelectEntry(entry)}
                                                    />
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                {/* Footer info */}
                                {entries.length > 0 && (
                                    <div className="px-4 py-3 border-t border-white/[0.04] flex items-center justify-between">
                                        <p className="text-[11px] text-zinc-600">{entries.length} registros</p>
                                        <p className="text-[11px] text-zinc-700">Haz clic en cualquier fila para ver el detalle</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* ── TAB: PERSONAS DENTRO ──────────────────────────── */}
                    {activeTab === 'inside' && (
                        <motion.div
                            key="inside"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                        >
                            {peopleInside.length === 0 ? (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                        <Users size={28} className="text-emerald-400" />
                                    </div>
                                    <p className="text-sm font-black text-zinc-400">Sin personas dentro</p>
                                    <p className="text-xs text-zinc-600 mt-1">El condominio está sin visitantes activos</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                            <span className="text-xs font-black text-emerald-400">{peopleInside.length} {peopleInside.length === 1 ? 'persona' : 'personas'} dentro</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {peopleInside.map(entry => (
                                            <PersonInsideCard
                                                key={entry.id}
                                                entry={entry}
                                                onSelect={() => handleSelectEntry(entry)}
                                                onCheckout={() => handleCheckout(entry.source_id, entry.source_table)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* ── Timeline Panel ─────────────────────────────────────────── */}
            <AnimatePresence>
                {selectedEntry && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedEntry(null)}
                            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                        />
                        <EntryTimeline
                            entry={selectedEntry}
                            sourceData={sourceData}
                            onClose={() => setSelectedEntry(null)}
                            onCheckout={handleCheckout}
                            userName={userName}
                        />
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
