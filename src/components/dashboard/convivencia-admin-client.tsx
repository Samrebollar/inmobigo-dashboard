'use client'

import { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react'
import {
    ShieldAlert,
    Clock,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Loader2,
    Home,
    Volume2,
    PawPrint,
    Trash2,
    Car,
    UserX,
    MessageSquareWarning,
    Search,
    RefreshCw,
    Building2,
    User,
    StickyNote,
    X,
    ChevronLeft,
    ChevronRight,
    Inbox,
    RotateCcw,
    CalendarClock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { getComplaintsByOrganizationServer, updateComplaintStatusServer } from '@/app/actions/complaint-actions'
import { toast } from 'sonner'

interface ConvivenciaAdminClientProps {
    organizationId: string
    condominiums: { id: string; name: string }[]
}

type ComplaintStatus = 'abierta' | 'en_revision' | 'resuelta' | 'descartada'
type IconType = ComponentType<{ size?: number; className?: string }>

interface Complaint {
    id: string
    complaint_type: string
    description: string
    status: ComplaintStatus
    is_anonymous: boolean
    reporter_name: string
    subject_unit_number: string | null
    condominium_name: string | null
    evidence_urls: string[] | null
    admin_notes: string | null
    created_at: string
    resolved_at: string | null
    updated_at: string | null
}

const TYPE_CONFIG: Record<string, { label: string; icon: IconType; tile: string }> = {
    ruido: { label: 'Ruido excesivo', icon: Volume2, tile: 'bg-violet-500/15 text-violet-300 ring-violet-500/30' },
    mascota: { label: 'Mascota sin control', icon: PawPrint, tile: 'bg-orange-500/15 text-orange-300 ring-orange-500/30' },
    basura: { label: 'Manejo de basura', icon: Trash2, tile: 'bg-lime-500/15 text-lime-300 ring-lime-500/30' },
    estacionamiento: { label: 'Mal uso de estacionamiento', icon: Car, tile: 'bg-sky-500/15 text-sky-300 ring-sky-500/30' },
    comportamiento: { label: 'Comportamiento irrespetuoso', icon: UserX, tile: 'bg-rose-500/15 text-rose-300 ring-rose-500/30' },
    otro: { label: 'Otro', icon: MessageSquareWarning, tile: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30' },
}

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; pill: string; accent: string; dot: string; icon: IconType }> = {
    abierta: { label: 'Recibido', pill: 'bg-amber-500/10 text-amber-300 border-amber-500/30', accent: 'bg-amber-400', dot: 'bg-amber-400', icon: Clock },
    en_revision: { label: 'En revisión', pill: 'bg-blue-500/10 text-blue-300 border-blue-500/30', accent: 'bg-blue-400', dot: 'bg-blue-400', icon: Eye },
    resuelta: { label: 'Resuelto', pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', accent: 'bg-emerald-400', dot: 'bg-emerald-400', icon: CheckCircle2 },
    descartada: { label: 'Descartado', pill: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', accent: 'bg-zinc-500', dot: 'bg-zinc-500', icon: XCircle },
}

const STATUS_ORDER: ComplaintStatus[] = ['abierta', 'en_revision', 'resuelta', 'descartada']

/** Acciones que tienen sentido desde cada estado. */
const NEXT_ACTIONS: Record<ComplaintStatus, { status: ComplaintStatus; label: string; cls: string; icon: IconType }[]> = {
    abierta: [
        { status: 'en_revision', label: 'Tomar caso', cls: 'bg-blue-600 hover:bg-blue-500 text-white', icon: Eye },
        { status: 'resuelta', label: 'Resolver', cls: 'bg-emerald-600 hover:bg-emerald-500 text-white', icon: CheckCircle2 },
        { status: 'descartada', label: 'Descartar', cls: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300', icon: XCircle },
    ],
    en_revision: [
        { status: 'resuelta', label: 'Marcar resuelto', cls: 'bg-emerald-600 hover:bg-emerald-500 text-white', icon: CheckCircle2 },
        { status: 'descartada', label: 'Descartar', cls: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300', icon: XCircle },
    ],
    resuelta: [
        { status: 'en_revision', label: 'Reabrir', cls: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300', icon: RotateCcw },
    ],
    descartada: [
        { status: 'en_revision', label: 'Reabrir', cls: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300', icon: RotateCcw },
    ],
}

function relativeDate(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime()
    const min = Math.round(diffMs / 60000)
    if (min < 1) return 'Hace un momento'
    if (min < 60) return `Hace ${min} min`
    const h = Math.round(min / 60)
    if (h < 24) return `Hace ${h} h`
    const d = Math.round(h / 24)
    if (d === 1) return 'Ayer'
    if (d < 7) return `Hace ${d} días`
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

const fullDate = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

interface KPICardProps {
    label: string
    value: number
    total: number
    hint: string
    icon: IconType
    tone: { border: string; glow: string; text: string; tile: string; bar: string }
    active: boolean
    onClick: () => void
}

function KPICard({ label, value, total, hint, icon: Icon, tone, active, onClick }: KPICardProps) {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'group relative overflow-hidden rounded-2xl border bg-zinc-900/60 p-5 text-left transition-all duration-300 hover:-translate-y-1',
                tone.border,
                active ? cn('ring-2 ring-offset-2 ring-offset-zinc-950', tone.glow) : 'hover:shadow-lg'
            )}
        >
            <div className={cn('pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl opacity-40 transition-opacity group-hover:opacity-70', tone.bar)} />
            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
                    <p className={cn('mt-2 text-3xl font-bold tabular-nums', tone.text)}>{value}</p>
                </div>
                <div className={cn('rounded-xl p-2.5 ring-1', tone.tile)}>
                    <Icon size={20} />
                </div>
            </div>
            <div className="relative mt-4 space-y-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className={cn('h-full rounded-full transition-all duration-700', tone.bar)} style={{ width: `${total > 0 ? pct : 0}%` }} />
                </div>
                <p className="text-[11px] text-zinc-500">{hint.replace('{pct}', String(pct))}</p>
            </div>
        </button>
    )
}

function Lightbox({ images, index, onClose, onNav }: { images: string[]; index: number; onClose: () => void; onNav: (i: number) => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowRight' && index < images.length - 1) onNav(index + 1)
            if (e.key === 'ArrowLeft' && index > 0) onNav(index - 1)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [images.length, index, onClose, onNav])

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
            <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Cerrar">
                <X size={20} />
            </button>
            {index > 0 && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onNav(index - 1) }} className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Anterior">
                    <ChevronLeft size={22} />
                </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt={`Evidencia ${index + 1}`} className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
            {index < images.length - 1 && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onNav(index + 1) }} className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Siguiente">
                    <ChevronRight size={22} />
                </button>
            )}
            {images.length > 1 && (
                <p className="absolute bottom-4 rounded-full bg-white/10 px-3 py-1 text-xs text-white">{index + 1} / {images.length}</p>
            )}
        </div>
    )
}

export default function ConvivenciaAdminClient({ organizationId, condominiums }: ConvivenciaAdminClientProps) {
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [condoFilter, setCondoFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<ComplaintStatus | ''>('')
    const [search, setSearch] = useState('')
    const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
    const [savingId, setSavingId] = useState<string | null>(null)
    const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

    const fetchComplaints = useCallback(async (silent = false) => {
        if (silent) setRefreshing(true)
        else setLoading(true)
        try {
            const res = await getComplaintsByOrganizationServer(organizationId, condoFilter || undefined)
            if (res.success) setComplaints((res.complaints || []) as Complaint[])
            else toast.error(res.error || 'Error al cargar los reportes.')
        } catch (error) {
            console.error('Error fetching complaints:', error)
            toast.error('Error al cargar los reportes.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [organizationId, condoFilter])

    useEffect(() => {
        fetchComplaints()
    }, [fetchComplaints])

    useEffect(() => {
        if (!organizationId) return
        const supabase = createClient()
        const channel = supabase
            .channel(`realtime_resident_complaints_${organizationId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resident_complaints',
                    filter: `organization_id=eq.${organizationId}`,
                },
                () => {
                    fetchComplaints(true)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [organizationId, fetchComplaints])

    const saveComplaint = async (c: Complaint, status: ComplaintStatus, successMsg: string) => {
        setSavingId(c.id)
        try {
            const note = notesDraft[c.id]
            const res = await updateComplaintStatusServer(c.id, status, note)
            if (res.success) {
                toast.success(successMsg)
                setComplaints(prev => prev.map(x => x.id === c.id
                    ? { ...x, status, admin_notes: note ?? x.admin_notes, resolved_at: status === 'resuelta' ? new Date().toISOString() : null }
                    : x))
                setNotesDraft(prev => {
                    const next = { ...prev }
                    delete next[c.id]
                    return next
                })
            } else {
                toast.error(res.error || 'No se pudo actualizar.')
            }
        } finally {
            setSavingId(null)
        }
    }

    const counts = useMemo(() => {
        const base: Record<ComplaintStatus, number> = { abierta: 0, en_revision: 0, resuelta: 0, descartada: 0 }
        complaints.forEach(c => { if (base[c.status] !== undefined) base[c.status]++ })
        return base
    }, [complaints])
    const total = complaints.length

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return complaints.filter(c => {
            if (statusFilter && c.status !== statusFilter) return false
            if (!q) return true
            const haystack = [
                TYPE_CONFIG[c.complaint_type]?.label || c.complaint_type,
                c.description,
                c.reporter_name,
                c.subject_unit_number,
                c.condominium_name,
            ].filter(Boolean).join(' ').toLowerCase()
            return haystack.includes(q)
        })
    }, [complaints, statusFilter, search])

    const toggleStatus = (s: ComplaintStatus | '') => setStatusFilter(prev => (prev === s ? '' : s))

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
            {/* Encabezado */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex items-center gap-4">
                    <div className="rounded-2xl bg-gradient-to-br from-rose-500/25 to-orange-500/10 p-3 ring-1 ring-rose-500/30">
                        <ShieldAlert className="h-7 w-7 text-rose-300" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Convivencia</h1>
                        <p className="text-sm text-zinc-400">Da seguimiento a los reportes entre vecinos, desde que llegan hasta que se resuelven.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                        </span>
                        En vivo
                    </span>
                    <button
                        type="button"
                        onClick={() => fetchComplaints(true)}
                        disabled={refreshing || loading}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={cn(refreshing && 'animate-spin')} /> Actualizar
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
                <KPICard
                    label="Total de reportes" value={total} total={total} hint="Toca una tarjeta para filtrar" icon={ShieldAlert}
                    tone={{ border: 'border-rose-500/30 hover:border-rose-500/60', glow: 'ring-rose-500/60', text: 'text-white', tile: 'bg-rose-500/10 text-rose-300 ring-rose-500/30', bar: 'bg-rose-500' }}
                    active={statusFilter === ''} onClick={() => setStatusFilter('')}
                />
                <KPICard
                    label="Recibidos" value={counts.abierta} total={total} hint="{pct}% esperando atención" icon={Clock}
                    tone={{ border: 'border-amber-500/30 hover:border-amber-500/60', glow: 'ring-amber-500/60', text: 'text-amber-300', tile: 'bg-amber-500/10 text-amber-300 ring-amber-500/30', bar: 'bg-amber-500' }}
                    active={statusFilter === 'abierta'} onClick={() => toggleStatus('abierta')}
                />
                <KPICard
                    label="En revisión" value={counts.en_revision} total={total} hint="{pct}% en seguimiento" icon={Eye}
                    tone={{ border: 'border-blue-500/30 hover:border-blue-500/60', glow: 'ring-blue-500/60', text: 'text-blue-300', tile: 'bg-blue-500/10 text-blue-300 ring-blue-500/30', bar: 'bg-blue-500' }}
                    active={statusFilter === 'en_revision'} onClick={() => toggleStatus('en_revision')}
                />
                <KPICard
                    label="Resueltos" value={counts.resuelta} total={total} hint="{pct}% de efectividad" icon={CheckCircle2}
                    tone={{ border: 'border-emerald-500/30 hover:border-emerald-500/60', glow: 'ring-emerald-500/60', text: 'text-emerald-300', tile: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30', bar: 'bg-emerald-500' }}
                    active={statusFilter === 'resuelta'} onClick={() => toggleStatus('resuelta')}
                />
            </div>

            {/* Barra de filtros */}
            <div className="space-y-3 rounded-2xl border border-zinc-800/70 bg-zinc-900/40 p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por tipo, descripción, unidad o residente…"
                            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-9 text-sm text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none"
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white" aria-label="Limpiar búsqueda">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    {condominiums.length > 1 && (
                        <div className="relative md:w-64">
                            <Building2 size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <select
                                value={condoFilter}
                                onChange={e => setCondoFilter(e.target.value)}
                                className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 pl-9 pr-3 text-sm text-white focus:border-rose-500/50 focus:outline-none"
                            >
                                <option value="">Todas las privadas</option>
                                {condominiums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('')}
                        className={cn(
                            'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            statusFilter === '' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                        )}
                    >
                        Todos <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-300">{total}</span>
                    </button>
                    {STATUS_ORDER.map(s => {
                        const cfg = STATUS_CONFIG[s]
                        return (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                                    statusFilter === s ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                                )}
                            >
                                <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                                {cfg.label}
                                <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] tabular-nums text-zinc-300">{counts[s]}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Listado */}
            {loading ? (
                <div className="grid gap-4 lg:grid-cols-2">
                    {[0, 1].map(i => (
                        <div key={i} className="h-64 animate-pulse rounded-2xl border border-zinc-800/60 bg-zinc-900/40" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 px-6 py-16 text-center">
                    <div className="mb-4 rounded-2xl bg-zinc-800/60 p-4">
                        <Inbox className="h-8 w-8 text-zinc-500" />
                    </div>
                    <p className="text-base font-semibold text-zinc-200">
                        {total === 0 ? 'Sin reportes por ahora' : 'Nada coincide con tu búsqueda'}
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-zinc-500">
                        {total === 0
                            ? 'Cuando un residente reporte un problema de convivencia desde la app o WhatsApp aparecerá aquí al instante.'
                            : 'Prueba con otro estado, privada o palabra clave.'}
                    </p>
                    {total > 0 && (statusFilter || search) && (
                        <button type="button" onClick={() => { setStatusFilter(''); setSearch('') }} className="mt-4 text-xs font-semibold text-rose-300 hover:text-rose-200">
                            Limpiar filtros
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                    {filtered.map(c => {
                        const typeCfg = TYPE_CONFIG[c.complaint_type] || TYPE_CONFIG.otro
                        const TypeIcon = typeCfg.icon
                        const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.abierta
                        const StatusIcon = statusCfg.icon
                        const evidence = c.evidence_urls || []
                        const saving = savingId === c.id
                        const draft = notesDraft[c.id]
                        const noteDirty = draft !== undefined && draft !== (c.admin_notes || '')
                        return (
                            <article
                                key={c.id}
                                className="relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50 transition-colors hover:border-zinc-700"
                            >
                                <span className={cn('absolute inset-y-0 left-0 w-1', statusCfg.accent)} />

                                {/* Cabecera */}
                                <div className="flex items-start gap-3 p-5 pb-3 pl-6">
                                    <div className={cn('shrink-0 rounded-xl p-2.5 ring-1', typeCfg.tile)}>
                                        <TypeIcon size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <h3 className="truncate text-base font-semibold text-white">{typeCfg.label}</h3>
                                            <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', statusCfg.pill)}>
                                                <StatusIcon size={12} /> {statusCfg.label}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500" title={fullDate(c.created_at)}>
                                            <CalendarClock size={12} /> {relativeDate(c.created_at)}
                                        </p>
                                    </div>
                                </div>

                                {/* Chips de contexto */}
                                <div className="flex flex-wrap gap-1.5 px-5 pl-6">
                                    {c.condominium_name && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 px-2 py-1 text-[11px] font-medium text-indigo-300">
                                            <Building2 size={12} /> {c.condominium_name}
                                        </span>
                                    )}
                                    {c.subject_unit_number && (
                                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-1 text-[11px] font-medium text-rose-300">
                                            <Home size={12} /> Unidad involucrada: {c.subject_unit_number}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 rounded-md bg-zinc-800/80 px-2 py-1 text-[11px] font-medium text-zinc-300">
                                        {c.is_anonymous ? <EyeOff size={12} /> : <User size={12} />}
                                        {c.is_anonymous ? 'Reporte anónimo' : `Reportó: ${c.reporter_name}`}
                                    </span>
                                </div>

                                {/* Descripción y evidencia */}
                                <div className="flex-1 space-y-3 px-5 py-4 pl-6">
                                    <blockquote className="rounded-xl border-l-2 border-zinc-700 bg-zinc-950/60 px-4 py-3 text-sm leading-relaxed text-zinc-200">
                                        {c.description}
                                    </blockquote>
                                    {evidence.length > 0 && (
                                        <div>
                                            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Evidencia ({evidence.length})</p>
                                            <div className="flex flex-wrap gap-2">
                                                {evidence.map((url, i) => (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => setLightbox({ images: evidence, index: i })}
                                                        className="overflow-hidden rounded-lg border border-zinc-800 transition-all hover:scale-105 hover:border-rose-500/50"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={url} alt={`Evidencia ${i + 1}`} className="h-16 w-16 object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {c.status === 'resuelta' && c.resolved_at && (
                                        <p className="flex items-center gap-1.5 text-xs text-emerald-300/80">
                                            <CheckCircle2 size={13} /> Resuelto el {fullDate(c.resolved_at)}
                                        </p>
                                    )}
                                </div>

                                {/* Seguimiento del administrador */}
                                <div className="space-y-3 border-t border-zinc-800/70 bg-zinc-950/30 p-4 pl-6">
                                    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                        <StickyNote size={12} /> Nota de seguimiento
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={draft ?? c.admin_notes ?? ''}
                                        onChange={e => setNotesDraft(prev => ({ ...prev, [c.id]: e.target.value }))}
                                        placeholder="Ej. Se habló con el residente de la unidad y se comprometió a bajar el volumen."
                                        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none"
                                    />
                                    <div className="flex flex-wrap items-center justify-end gap-2">
                                        {noteDirty && (
                                            <button
                                                type="button"
                                                disabled={saving}
                                                onClick={() => saveComplaint(c, c.status, 'Nota guardada.')}
                                                className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-800 disabled:opacity-50"
                                            >
                                                Guardar nota
                                            </button>
                                        )}
                                        {NEXT_ACTIONS[c.status]?.map(a => {
                                            const ActionIcon = a.icon
                                            return (
                                                <button
                                                    key={a.status}
                                                    type="button"
                                                    disabled={saving}
                                                    onClick={() => saveComplaint(c, a.status, `Reporte marcado como ${STATUS_CONFIG[a.status].label.toLowerCase()}.`)}
                                                    className={cn('inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50', a.cls)}
                                                >
                                                    {saving ? <Loader2 size={13} className="animate-spin" /> : <ActionIcon size={13} />}
                                                    {a.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}

            {lightbox && (
                <Lightbox
                    images={lightbox.images}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onNav={i => setLightbox(prev => (prev ? { ...prev, index: i } : prev))}
                />
            )}
        </div>
    )
}
