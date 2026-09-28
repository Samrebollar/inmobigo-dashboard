'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    Activity,
    Package,
    Users,
    Clock,
    ShieldAlert,
    Loader2,
    LogIn,
    LogOut,
    BookOpen,
    ChevronRight,
    AlertTriangle,
    TrendingUp,
    Car,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    getLiveAccessActivityServer,
    getVisitorPassMetricsServer,
    getGuardShiftsServer,
    getCrossFlaggedUnitsServer,
    getPendingTransportNoticesServer,
} from '@/app/actions/security-ops-actions'

interface SeguridadOperativaClientProps {
    organizationId: string
    condominiums: { id: string; name: string }[]
}

// El historial de accesos, paquetería y transporte (y quién está dentro) vive
// en la Bitácora Inteligente; aquí solo lo que la caseta tiene pendiente,
// guardias y riesgo, para no duplicar información.
type TabKey = 'pendientes' | 'visitas' | 'turnos' | 'riesgo'

const TABS: { key: TabKey; label: string; icon: any }[] = [
    { key: 'pendientes', label: 'Pendientes de Caseta', icon: Activity },
    { key: 'visitas', label: 'Pases de Visita', icon: Users },
    { key: 'turnos', label: 'Turnos de Guardias', icon: Clock },
    { key: 'riesgo', label: 'Riesgo por Unidad', icon: ShieldAlert },
]

function fmt(date?: string | null, withTime = true) {
    if (!date) return '—'
    try {
        return format(new Date(date), withTime ? "d MMM, HH:mm" : 'd MMM yyyy', { locale: es })
    } catch {
        return '—'
    }
}

function KPI({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
    return (
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5">
            <div className={`p-2 rounded-xl w-fit mb-3 ${color.replace('text-', 'bg-').replace('400', '500/10')}`}>
                <Icon size={18} className={color} />
            </div>
            <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{label}</p>
        </div>
    )
}

function EmptyState({ icon: Icon, text }: { icon: any; text: string }) {
    return (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] flex flex-col items-center justify-center h-[180px] text-zinc-500 space-y-3">
            <Icon className="h-12 w-12 opacity-20" />
            <p className="text-sm font-medium">{text}</p>
        </div>
    )
}

export default function SeguridadOperativaClient({ organizationId, condominiums }: SeguridadOperativaClientProps) {
    const [activeTab, setActiveTab] = useState<TabKey>('pendientes')
    const [condoFilter, setCondoFilter] = useState<string>('')
    const [loading, setLoading] = useState(true)

    const [pendingPackages, setPendingPackages] = useState<any[]>([])
    const [pendingTransport, setPendingTransport] = useState<any[]>([])
    const [visitMetrics, setVisitMetrics] = useState<{ totalPasses: number; usedCount: number; noShowCount: number; byUnit: any[]; anomalies: any[] }>({
        totalPasses: 0, usedCount: 0, noShowCount: 0, byUnit: [], anomalies: [],
    })
    const [shifts, setShifts] = useState<any[]>([])
    const [flaggedUnits, setFlaggedUnits] = useState<any[]>([])

    const condoName = (id: string | null) => condominiums.find(c => c.id === id)?.name || 'Sin privada'

    const fetchAll = useCallback(async () => {
        setLoading(true)
        try {
            const [live, visitStats, shiftLog, riskUnits, transportNotices] = await Promise.all([
                getLiveAccessActivityServer(organizationId),
                getVisitorPassMetricsServer(organizationId, 30),
                getGuardShiftsServer(organizationId, 14),
                getCrossFlaggedUnitsServer(organizationId, 90),
                getPendingTransportNoticesServer(organizationId),
            ])
            setPendingPackages(live.pendingPackages || [])
            setPendingTransport(transportNotices.notices || [])
            setVisitMetrics({
                totalPasses: visitStats.totalPasses,
                usedCount: visitStats.usedCount,
                noShowCount: visitStats.noShowCount,
                byUnit: visitStats.byUnit,
                anomalies: visitStats.anomalies,
            })
            setShifts(shiftLog.shifts || [])
            setFlaggedUnits(riskUnits.flagged || [])
        } catch (error) {
            console.error('Error fetching security ops data:', error)
        } finally {
            setLoading(false)
        }
    }, [organizationId])

    useEffect(() => { fetchAll() }, [fetchAll])

    const byCondo = (items: any[]) => condoFilter ? items.filter(i => i.condominium_id === condoFilter) : items

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Activity className="h-7 w-7 text-sky-400" />
                    Actividad de Seguridad
                </h1>
                <p className="text-zinc-400">Pendientes de caseta, pases de visita, turnos de guardias y riesgo por unidad.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {condominiums.length > 1 && (
                    <>
                        <button
                            onClick={() => setCondoFilter('')}
                            className={cn(
                                'px-4 py-2 text-xs font-bold rounded-xl border transition-all',
                                !condoFilter ? 'bg-sky-600/20 text-sky-400 border-sky-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
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
                                    condoFilter === c.id ? 'bg-sky-600/20 text-sky-400 border-sky-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                )}
                            >
                                {c.name}
                            </button>
                        ))}
                        <div className="w-px h-6 bg-zinc-800 mx-1" />
                    </>
                )}
                {TABS.map(t => {
                    const Icon = t.icon
                    return (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key)}
                            className={cn(
                                'px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-2',
                                activeTab === t.key ? 'bg-white/10 text-white border-white/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            )}
                        >
                            <Icon size={13} /> {t.label}
                        </button>
                    )
                })}
            </div>

            {loading ? (
                <div className="flex h-[240px] items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
                </div>
            ) : (
                <>
                    {activeTab === 'pendientes' && (
                        <div className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <KPI label="Paquetes pendientes de entrega" value={byCondo(pendingPackages).length} icon={Package} color="text-amber-400" />
                                <KPI label="Transporte pendiente (Uber/DiDi/taxi)" value={byCondo(pendingTransport).length} icon={Car} color="text-sky-400" />
                            </div>

                            <Link
                                href="/dashboard/bitacora-inteligente"
                                className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800/50 bg-zinc-900/40 px-5 py-4 transition-colors hover:border-sky-500/30"
                            >
                                <div className="flex items-center gap-3">
                                    <BookOpen className="h-5 w-5 text-sky-400" />
                                    <div>
                                        <p className="text-sm font-bold text-white">¿Quién está dentro o qué pasó en la caseta?</p>
                                        <p className="text-xs text-zinc-500">El historial completo de accesos, paquetería y transporte, y las personas dentro, están en la Bitácora Inteligente.</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 shrink-0 text-zinc-500" />
                            </Link>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Paquetes pendientes de entrega</h3>
                                {byCondo(pendingPackages).length === 0 ? (
                                    <EmptyState icon={Package} text="No hay paquetes pendientes de entrega." />
                                ) : (
                                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl divide-y divide-zinc-800/70">
                                        {byCondo(pendingPackages).map((p: any) => (
                                            <div key={p.id} className="flex items-center justify-between px-5 py-3">
                                                <div>
                                                    <p className="text-sm font-bold text-white">{p.resident_name || 'Sin nombre'} · Unidad {p.unit_name || 'S/N'}</p>
                                                    <p className="text-xs text-zinc-500">{p.carrier || 'Paquetería sin especificar'} · {condoName(p.condominium_id)}</p>
                                                </div>
                                                <p className="text-xs text-zinc-500">Avisado {fmt(p.created_at)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Transporte pendiente (Uber/DiDi/taxi)</h3>
                                {byCondo(pendingTransport).length === 0 ? (
                                    <EmptyState icon={Car} text="No hay avisos de transporte pendientes." />
                                ) : (
                                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl divide-y divide-zinc-800/70">
                                        {byCondo(pendingTransport).map((t: any) => (
                                            <div key={t.id} className="flex items-center justify-between px-5 py-3">
                                                <div>
                                                    <p className="text-sm font-bold text-white">
                                                        {t.resident_name || 'Sin nombre'} · Unidad {t.unit_name || 'S/N'}
                                                    </p>
                                                    <p className="text-xs text-zinc-500">
                                                        {t.platform} · {t.direction === 'pickup' ? 'Lo van a recoger' : 'Está llegando'}
                                                        {t.vehicle_info ? ` · ${t.vehicle_info}` : ''} · {condoName(t.condominium_id)}
                                                    </p>
                                                </div>
                                                <p className="text-xs text-zinc-500">Avisado {fmt(t.created_at)}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'visitas' && (
                        <div className="space-y-6">
                            <div className="grid gap-4 sm:grid-cols-3">
                                <KPI label="Pases generados (30 días)" value={visitMetrics.totalPasses} icon={Users} color="text-indigo-400" />
                                <KPI label="Visitas ingresadas" value={visitMetrics.usedCount} icon={LogIn} color="text-emerald-400" />
                                <KPI label="Pases sin usar (no-show)" value={visitMetrics.noShowCount} icon={Clock} color="text-amber-400" />
                            </div>

                            {visitMetrics.anomalies.length > 0 && (
                                <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 space-y-2">
                                    <p className="text-sm font-bold text-rose-300 flex items-center gap-2">
                                        <AlertTriangle size={16} /> Unidades con volumen de visitas fuera de lo normal
                                    </p>
                                    <p className="text-xs text-rose-300/80">Puede ser una señal de subarrendamiento no autorizado o uso indebido del acceso — vale la pena revisarlo.</p>
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {byCondo(visitMetrics.anomalies).map((a: any) => (
                                            <span key={a.unit_id} className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-200 text-xs font-bold">
                                                Unidad {a.unit_number || 'S/N'} — {a.count} visitas
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Visitas por unidad (30 días)</h3>
                                {byCondo(visitMetrics.byUnit).length === 0 ? (
                                    <EmptyState icon={TrendingUp} text="No hay pases de visita en los últimos 30 días." />
                                ) : (
                                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl divide-y divide-zinc-800/70 max-h-[400px] overflow-y-auto">
                                        {byCondo(visitMetrics.byUnit).slice(0, 50).map((u: any) => (
                                            <div key={u.unit_id} className="flex items-center justify-between px-5 py-2.5">
                                                <p className="text-sm text-white">Unidad {u.unit_number || 'S/N'} · {condoName(u.condominium_id)}</p>
                                                <p className="text-sm font-bold text-zinc-300">{u.count}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'turnos' && (
                        <div className="space-y-3">
                            <p className="text-xs text-zinc-500">Últimos 14 días</p>
                            {byCondo(shifts).length === 0 ? (
                                <EmptyState icon={Clock} text="Todavía no hay turnos registrados desde la app del guardia." />
                            ) : (
                                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/[0.02]">
                                            <tr>
                                                <th className="px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Guardia</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Entrada</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Salida</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Duración</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/70">
                                            {byCondo(shifts).map((s: any) => {
                                                const durationHrs = s.check_out_at
                                                    ? ((new Date(s.check_out_at).getTime() - new Date(s.check_in_at).getTime()) / 36e5).toFixed(1)
                                                    : null
                                                return (
                                                    <tr key={s.id}>
                                                        <td className="px-5 py-3 text-white font-medium">{s.guard_name || '—'}</td>
                                                        <td className="px-5 py-3 text-zinc-400">{fmt(s.check_in_at)}</td>
                                                        <td className="px-5 py-3 text-zinc-400">{s.check_out_at ? fmt(s.check_out_at) : (
                                                            <span className="text-emerald-400 font-bold flex items-center gap-1"><LogIn size={12} /> En turno</span>
                                                        )}</td>
                                                        <td className="px-5 py-3 text-zinc-500">{durationHrs ? `${durationHrs} h` : '—'}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'riesgo' && (
                        <div className="space-y-3">
                            <p className="text-xs text-zinc-500">Unidades con reportes de convivencia e incidencias en los últimos 90 días</p>
                            {byCondo(flaggedUnits).length === 0 ? (
                                <EmptyState icon={ShieldAlert} text="Ninguna unidad tiene señales repetidas de convivencia e incidencias." />
                            ) : (
                                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-white/[0.02]">
                                            <tr>
                                                <th className="px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Unidad</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Privada</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Reportes de convivencia</th>
                                                <th className="px-5 py-3 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Incidencias</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-800/70">
                                            {byCondo(flaggedUnits).map((u: any) => (
                                                <tr key={u.unit_id}>
                                                    <td className="px-5 py-3 text-white font-bold">Unidad {u.unit_number || 'S/N'}</td>
                                                    <td className="px-5 py-3 text-zinc-400">{condoName(u.condominium_id)}</td>
                                                    <td className="px-5 py-3 text-rose-400 font-bold">{u.complaints}</td>
                                                    <td className="px-5 py-3 text-amber-400 font-bold">{u.tickets}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
