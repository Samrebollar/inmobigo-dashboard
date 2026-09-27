'use client'

import { useState, useEffect } from 'react'
import {
    ShieldAlert,
    Clock,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    Loader2,
    Home,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getComplaintsByOrganizationServer, updateComplaintStatusServer } from '@/app/actions/complaint-actions'
import { toast } from 'sonner'

interface ConvivenciaAdminClientProps {
    organizationId: string
    condominiums: { id: string; name: string }[]
}

const TYPE_LABEL: Record<string, string> = {
    ruido: 'Ruido excesivo',
    mascota: 'Mascota sin control',
    basura: 'Manejo de basura',
    estacionamiento: 'Mal uso de estacionamiento',
    comportamiento: 'Comportamiento irrespetuoso',
    otro: 'Otro',
}

const STATUS_OPTIONS = [
    { id: 'abierta', label: 'Recibida' },
    { id: 'en_revision', label: 'En revisión' },
    { id: 'resuelta', label: 'Resuelta' },
    { id: 'descartada', label: 'Descartada' },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    abierta: { label: 'Recibida', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
    en_revision: { label: 'En revisión', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Eye },
    resuelta: { label: 'Resuelta', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    descartada: { label: 'Descartada', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: XCircle },
}

function KPICard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
    return (
        <div className={`p-4 rounded-2xl bg-white/[0.03] border ${color.replace('text-', 'border-').replace('400', '500/40')}`}>
            <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl ${color.replace('text-', 'bg-').replace('400', '500/10')}`}>
                    <Icon size={18} className={color} />
                </div>
            </div>
            <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
    )
}

export default function ConvivenciaAdminClient({ organizationId, condominiums }: ConvivenciaAdminClientProps) {
    const [loading, setLoading] = useState(true)
    const [complaints, setComplaints] = useState<any[]>([])
    const [condoFilter, setCondoFilter] = useState<string>('')
    const [statusFilter, setStatusFilter] = useState<string>('')
    const [notesDraft, setNotesDraft] = useState<Record<string, string>>({})
    const [savingId, setSavingId] = useState<string | null>(null)

    useEffect(() => {
        fetchComplaints()
    }, [condoFilter])

    const fetchComplaints = async () => {
        setLoading(true)
        try {
            const res = await getComplaintsByOrganizationServer(organizationId, condoFilter || undefined)
            if (res.success) setComplaints(res.complaints || [])
        } catch (error) {
            console.error('Error fetching complaints:', error)
            toast.error('Error al cargar los reportes.')
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (id: string, status: string) => {
        setSavingId(id)
        try {
            const res = await updateComplaintStatusServer(id, status as any, notesDraft[id])
            if (res.success) {
                toast.success('Reporte actualizado.')
                setComplaints(prev => prev.map(c => c.id === id ? { ...c, status, admin_notes: notesDraft[id] ?? c.admin_notes } : c))
            } else {
                toast.error(res.error || 'No se pudo actualizar.')
            }
        } finally {
            setSavingId(null)
        }
    }

    const filtered = statusFilter ? complaints.filter(c => c.status === statusFilter) : complaints
    const totalCount = complaints.length
    const abiertasCount = complaints.filter(c => c.status === 'abierta').length
    const revisionCount = complaints.filter(c => c.status === 'en_revision').length
    const resueltasCount = complaints.filter(c => c.status === 'resuelta').length

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <ShieldAlert className="h-7 w-7 text-rose-400" />
                    Convivencia
                </h1>
                <p className="text-zinc-400">Reportes de convivencia entre residentes, por privada.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
                <KPICard label="Total de reportes" value={totalCount} icon={ShieldAlert} color="text-rose-400" />
                <KPICard label="Recibidos" value={abiertasCount} icon={Clock} color="text-amber-400" />
                <KPICard label="En revisión" value={revisionCount} icon={Eye} color="text-blue-400" />
                <KPICard label="Resueltos" value={resueltasCount} icon={CheckCircle2} color="text-emerald-400" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {condominiums.length > 1 && (
                    <>
                        <button
                            onClick={() => setCondoFilter('')}
                            className={cn(
                                'px-4 py-2 text-xs font-bold rounded-xl border transition-all',
                                !condoFilter ? 'bg-rose-600/20 text-rose-400 border-rose-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            )}
                        >
                            Todas las privadas
                        </button>
                        {condominiums.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setCondoFilter(c.id)}
                                className={cn(
                                    'px-4 py-2 text-xs font-bold rounded-xl border transition-all',
                                    condoFilter === c.id ? 'bg-rose-600/20 text-rose-400 border-rose-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                )}
                            >
                                {c.name}
                            </button>
                        ))}
                        <div className="w-px h-6 bg-zinc-800 mx-1" />
                    </>
                )}
                <button
                    onClick={() => setStatusFilter('')}
                    className={cn(
                        'px-4 py-2 text-xs font-bold rounded-xl border transition-all',
                        !statusFilter ? 'bg-white/10 text-white border-white/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    )}
                >
                    Todos los estados
                </button>
                {STATUS_OPTIONS.map(s => (
                    <button
                        key={s.id}
                        onClick={() => setStatusFilter(s.id)}
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl border transition-all',
                            statusFilter === s.id ? 'bg-white/10 text-white border-white/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        )}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] flex flex-col items-center justify-center h-[220px] text-zinc-500 space-y-4">
                    <ShieldAlert className="h-16 w-16 opacity-20" />
                    <p className="text-lg font-medium">No hay reportes que coincidan con el filtro.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filtered.map((c) => {
                        const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.abierta
                        const StatusIcon = statusCfg.icon
                        return (
                            <div key={c.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
                                <div className="flex items-start justify-between gap-3 flex-wrap">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-black text-white">{TYPE_LABEL[c.complaint_type] || c.complaint_type}</span>
                                            {c.condominium_name && (
                                                <span className="text-[10px] font-bold text-indigo-400 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                                                    <Home size={10} /> {c.condominium_name}
                                                </span>
                                            )}
                                            {c.is_anonymous && (
                                                <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded-full">
                                                    <EyeOff size={10} /> Anónimo para el vecino
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-zinc-500">
                                            Reportado por: <span className="text-zinc-300 font-medium">{c.reporter_name}</span>
                                            {c.subject_unit_number && <> · Unidad involucrada: <span className="text-zinc-300 font-medium">{c.subject_unit_number}</span></>}
                                            {' · '}{new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <Badge className={cn('px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border flex items-center gap-1 shrink-0', statusCfg.color)}>
                                        <StatusIcon size={10} /> {statusCfg.label}
                                    </Badge>
                                </div>

                                <p className="text-sm text-zinc-300 bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-3">{c.description}</p>

                                {c.evidence_urls?.length > 0 && (
                                    <div className="flex gap-2">
                                        {c.evidence_urls.map((url: string, i: number) => (
                                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                                <img src={url} alt="Evidencia" className="w-16 h-16 rounded-lg object-cover border border-zinc-800 hover:border-rose-500/50 transition-colors" />
                                            </a>
                                        ))}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-zinc-800/50">
                                    <input
                                        type="text"
                                        placeholder="Nota interna / respuesta (opcional)"
                                        defaultValue={c.admin_notes || ''}
                                        onChange={e => setNotesDraft(prev => ({ ...prev, [c.id]: e.target.value }))}
                                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/50"
                                    />
                                    <select
                                        value={c.status}
                                        onChange={e => handleStatusChange(c.id, e.target.value)}
                                        disabled={savingId === c.id}
                                        className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-rose-500/50 disabled:opacity-50"
                                    >
                                        {STATUS_OPTIONS.map(s => (
                                            <option key={s.id} value={s.id}>{s.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
