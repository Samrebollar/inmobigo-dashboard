'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Package, Car, History, RefreshCw, XCircle, LogIn, LogOut, Bike, Wrench } from 'lucide-react'
import { getMyServiceNoticesAction } from '@/app/actions/security-ops-actions'

type NoticeState = 'pending' | 'inside' | 'exited' | 'delivered' | 'rejected'

interface NoticeItem {
    id: string
    kind: 'package' | 'transport' | 'delivery' | 'provider'
    title: string
    createdAt: string
    checkIn?: string | null
    checkOut?: string | null
    rejectionReason?: string | null
    rejectedAt?: string | null
    state: NoticeState
}

const STATE_BADGE: Record<NoticeState, { label: string; className: string }> = {
    pending: { label: 'Esperando', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
    inside: { label: 'Ingresó', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    exited: { label: 'Salió', className: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    delivered: { label: 'Entregado', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    rejected: { label: 'Rechazado', className: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
}

const KIND_STYLE: Record<NoticeItem['kind'], { icon: typeof Package; box: string }> = {
    package: { icon: Package, box: 'bg-amber-500/10 text-amber-400' },
    transport: { icon: Car, box: 'bg-sky-500/10 text-sky-400' },
    delivery: { icon: Bike, box: 'bg-fuchsia-500/10 text-fuchsia-400' },
    provider: { icon: Wrench, box: 'bg-violet-500/10 text-violet-400' },
}

const fmt = (iso?: string | null, pattern = 'HH:mm') => (iso ? format(parseISO(iso), pattern, { locale: es }) : null)

async function loadNotices(): Promise<NoticeItem[] | null> {
    // El residente solo ve las últimas 24 horas; el historial completo queda
    // en la Bitácora de seguridad y administración.
    const result = await getMyServiceNoticesAction(1)
    if (result.success) {
        const packages: NoticeItem[] = result.packages.map((p: any) => ({
            id: p.id,
            kind: 'package',
            title: p.carrier || 'Paquetería',
            createdAt: p.created_at,
            checkIn: p.checked_in_at || p.received_at,
            checkOut: p.checked_out_at,
            rejectionReason: p.rejection_reason,
            rejectedAt: p.rejected_at,
            state: p.status === 'rejected' ? 'rejected'
                : p.status === 'delivered' ? 'delivered'
                : p.checked_out_at ? 'exited'
                : (p.status === 'received' || p.checked_in_at) ? 'inside'
                : 'pending',
        }))
        const transports: NoticeItem[] = result.transports.map((t: any) => ({
            id: t.id,
            kind: 'transport',
            title: `${t.platform} — ${t.direction === 'pickup' ? 'Recogida' : 'Llegada'}${t.vehicle_info ? ` · ${t.vehicle_info}` : ''}`,
            createdAt: t.created_at,
            checkIn: t.checked_in_at || ((t.status === 'received' || t.status === 'closed') ? t.handled_at : null),
            checkOut: t.checked_out_at,
            rejectionReason: t.rejection_reason,
            rejectedAt: t.rejected_at,
            state: t.status === 'rejected' ? 'rejected'
                : (t.checked_out_at || t.status === 'closed') ? 'exited'
                : t.status === 'received' ? 'inside'
                : 'pending',
        }))
        const services: NoticeItem[] = (result.services || []).map((v: any) => ({
            id: v.id,
            kind: (v.visitor_type === 'delivery' || v.visitor_type === 'repartidor') ? 'delivery' : 'provider',
            title: `${(v.visitor_type === 'delivery' || v.visitor_type === 'repartidor') ? 'Repartidor' : 'Proveedor'} — ${v.visitor_name}${v.vehicle_info ? ` · ${v.vehicle_info}` : ''}`,
            createdAt: v.created_at,
            checkIn: v.checked_in_at || v.used_at,
            checkOut: v.checked_out_at,
            rejectionReason: v.rejection_reason,
            rejectedAt: v.rejected_at,
            state: v.status === 'rejected' ? 'rejected'
                : v.checked_out_at ? 'exited'
                : (v.status === 'used' || v.checked_in_at) ? 'inside'
                : 'pending',
        }))
        return [...packages, ...transports, ...services].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }
    return null
}

/**
 * Historial de avisos de paquetería y transporte del residente. Muestra
 * cuándo entró/salió el repartidor o el auto y, si seguridad rechazó el
 * acceso, el motivo que quedó registrado como evidencia.
 */
export function ServiceNoticesHistory({ refreshKey = 0 }: { refreshKey?: number }) {
    const [items, setItems] = useState<NoticeItem[]>([])
    const [loading, setLoading] = useState(true)

    const fetchItems = useCallback(() => {
        loadNotices().then(result => {
            if (result) setItems(result)
            setLoading(false)
        })
    }, [])

    useEffect(() => { fetchItems() }, [fetchItems, refreshKey])

    const refresh = () => {
        setLoading(true)
        fetchItems()
    }

    return (
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-[2rem] p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-800/60 flex items-center justify-center text-zinc-300">
                        <History className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">Mis avisos recientes</h3>
                        <p className="text-xs text-zinc-500">Paquetería, transporte, repartidores y proveedores de las últimas 24 horas</p>
                    </div>
                </div>
                <button
                    onClick={refresh}
                    disabled={loading}
                    className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                    title="Actualizar"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {!loading && items.length === 0 ? (
                <p className="text-center text-sm text-zinc-500 py-8">Aún no tienes avisos registrados.</p>
            ) : (
                <div className="space-y-3">
                    {items.map(item => {
                        const badge = STATE_BADGE[item.state]
                        return (
                            <div key={`${item.kind}-${item.id}`} className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${KIND_STYLE[item.kind].box}`}>
                                            {React.createElement(KIND_STYLE[item.kind].icon, { className: 'h-4 w-4' })}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{item.title}</p>
                                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                                Avisado {fmt(item.createdAt, "d MMM '·' HH:mm")}
                                            </p>
                                            {(item.checkIn || item.checkOut) && (
                                                <p className="text-[11px] text-zinc-400 mt-1 flex items-center gap-3">
                                                    {item.checkIn && <span className="inline-flex items-center gap-1"><LogIn className="h-3 w-3 text-emerald-400" /> {fmt(item.checkIn)}</span>}
                                                    {item.checkOut && <span className="inline-flex items-center gap-1"><LogOut className="h-3 w-3 text-sky-400" /> {fmt(item.checkOut)}</span>}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded border shrink-0 ${badge.className}`}>
                                        {badge.label}
                                    </span>
                                </div>
                                {item.state === 'rejected' && (
                                    <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 flex gap-2">
                                        <XCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-rose-400">Motivo del rechazo</p>
                                            <p className="text-xs text-rose-100 mt-0.5">{item.rejectionReason || 'Seguridad no registró un motivo.'}</p>
                                            {item.rejectedAt && (
                                                <p className="text-[10px] text-rose-300/70 mt-1">{fmt(item.rejectedAt, "d MMM yyyy '·' HH:mm")}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
