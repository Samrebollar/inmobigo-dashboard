'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    Car, Bike, Wrench, User, MapPin, Building2, Archive,
    LogIn, LogOut, XCircle, Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { registerSecurityAccessEventAction } from '@/app/actions/security-ops-actions'
import type { SecurityAccessKind } from '@/app/actions/security-ops-actions'

export type ServiceAccessType = 'transport' | 'delivery' | 'provider'

type RowState = 'pending' | 'inside' | 'exited' | 'rejected' | 'expired' | 'cancelled'

// Mismos colores que las pestañas del panel de Seguridad y del residente
const TYPE_CONFIG: Record<ServiceAccessType, {
    title: string
    subtitle: string
    empty: string
    headline: string
    icon: typeof Car
    accent: string
    iconBox: string
    button: string
}> = {
    transport: {
        title: 'Gestión de Transporte',
        subtitle: 'Uber, DiDi y taxis que avisaron los residentes.',
        empty: 'No hay avisos de transporte recientes',
        headline: 'Plataforma / Movimiento',
        icon: Car,
        accent: 'text-sky-400',
        iconBox: 'bg-sky-500/10 text-sky-400',
        button: 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/20',
    },
    delivery: {
        title: 'Gestión de Repartidores',
        subtitle: 'Comida y mandados que avisaron los residentes.',
        empty: 'No hay avisos de repartidores',
        headline: 'App / Negocio',
        icon: Bike,
        accent: 'text-fuchsia-400',
        iconBox: 'bg-fuchsia-500/10 text-fuchsia-400',
        button: 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-fuchsia-900/20',
    },
    provider: {
        title: 'Gestión de Proveedores',
        subtitle: 'Servicios y trabajos que avisaron los residentes.',
        empty: 'No hay avisos de proveedores',
        headline: 'Proveedor / Empresa',
        icon: Wrench,
        accent: 'text-violet-400',
        iconBox: 'bg-violet-500/10 text-violet-400',
        button: 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/20',
    },
}

const STATE_BADGE: Record<RowState, { label: string; className: string }> = {
    pending: { label: 'Esperando', className: 'bg-amber-500/10 border-amber-500/20 text-amber-500' },
    inside: { label: 'Dentro', className: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
    exited: { label: 'Salió', className: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
    rejected: { label: 'Rechazado', className: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
    expired: { label: 'Expirado', className: 'bg-zinc-800 border-zinc-700 text-zinc-500' },
    cancelled: { label: 'Cancelado', className: 'bg-zinc-800 border-zinc-700 text-zinc-500' },
}

interface Row {
    id: string
    kind: SecurityAccessKind
    headline: string
    resident: string
    unit: string
    orgName: string
    vehicle?: string | null
    notes?: string | null
    createdAt: string
    checkIn?: string | null
    checkOut?: string | null
    rejectionReason?: string | null
    state: RowState
}

const toRow = (type: ServiceAccessType, r: any): Row => {
    if (type === 'transport') {
        return {
            id: r.id,
            kind: 'transport',
            headline: `${r.platform} — ${r.direction === 'pickup' ? 'Recogida' : 'Llegada'}`,
            resident: r.resident_name || '—',
            unit: r.unit_name || 'S/N',
            orgName: r.condominium_name || r.organization_name || '—',
            vehicle: r.vehicle_info,
            notes: r.notes,
            createdAt: r.created_at,
            checkIn: r.checked_in_at || ((r.status === 'received' || r.status === 'closed') ? r.handled_at : null),
            checkOut: r.checked_out_at || (r.status === 'closed' && !r.checked_in_at ? r.handled_at : null),
            rejectionReason: r.rejection_reason,
            state: r.status === 'rejected' ? 'rejected'
                : (r.checked_out_at || r.status === 'closed') ? 'exited'
                : r.status === 'received' ? 'inside'
                : 'pending',
        }
    }
    const checkIn = r.checked_in_at || r.used_at || null
    return {
        id: r.id,
        kind: 'visit',
        headline: r.visitor_name || (type === 'delivery' ? 'Repartidor' : 'Proveedor'),
        resident: r.authorized_by_name || '—',
        unit: r.unit_name || 'S/N',
        orgName: r.organization_name || '—',
        vehicle: r.vehicle_info,
        notes: r.notes,
        createdAt: r.created_at,
        checkIn,
        checkOut: r.checked_out_at,
        rejectionReason: r.rejection_reason,
        state: r.status === 'rejected' ? 'rejected'
            : r.checked_out_at ? 'exited'
            : (r.status === 'used' || checkIn) ? 'inside'
            : r.status === 'expired' ? 'expired'
            : r.status === 'cancelled' ? 'cancelled'
            : 'pending',
    }
}

const fmtTime = (iso?: string | null) => (iso ? format(new Date(iso), 'p', { locale: es }) : '--:--')

/**
 * Pestañas Transporte / Repartidor / Proveedor del módulo de Avisos del
 * administrador. Mismo flujo que el panel de Seguridad: Autorizar acceso →
 * Registrar salida, o Rechazar con motivo (que ve el residente).
 */
export function ServiceAccessAdmin({
    type,
    items,
    onUpdated,
}: {
    type: ServiceAccessType
    items: any[]
    onUpdated: (record: any) => void
}) {
    const cfg = TYPE_CONFIG[type]
    const rows = items.map(r => toRow(type, r))
    const activeCount = rows.filter(r => r.state === 'pending' || r.state === 'inside').length

    const [processingId, setProcessingId] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<Row | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    const runEvent = async (row: Row, event: 'check_in' | 'check_out' | 'reject', reason?: string) => {
        setProcessingId(row.id)
        try {
            const result = await registerSecurityAccessEventAction({ kind: row.kind, id: row.id, event, reason })
            if (!result.success || !result.record) throw new Error(result.error)
            onUpdated(result.record)
            toast.success(event === 'check_in' ? 'Acceso autorizado' : event === 'check_out' ? 'Salida registrada' : 'Rechazo registrado')
            return true
        } catch (err: any) {
            toast.error(err?.message || 'No se pudo actualizar el aviso')
            return false
        } finally {
            setProcessingId(null)
        }
    }

    const confirmReject = async () => {
        if (!rejectTarget || !rejectReason.trim()) return
        if (await runEvent(rejectTarget, 'reject', rejectReason)) {
            setRejectTarget(null)
            setRejectReason('')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', cfg.iconBox)}>
                        <cfg.icon size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{cfg.title}</h2>
                        <p className="text-xs text-zinc-500 font-medium">{cfg.subtitle}</p>
                    </div>
                </div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                    {activeCount} Avisos Activos
                </div>
            </div>

            {rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-zinc-800 rounded-[2.5rem] bg-zinc-900/20">
                    <Archive size={48} className="text-zinc-800 mb-4" />
                    <h3 className="text-zinc-400 font-bold text-lg">{cfg.empty}</h3>
                    <p className="text-zinc-600 text-sm mt-1">Los nuevos avisos aparecerán aquí automáticamente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                        {rows.map(row => {
                            const badge = STATE_BADGE[row.state]
                            const isProcessing = processingId === row.id
                            return (
                                <motion.div
                                    layout
                                    key={row.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    className="relative group h-full"
                                >
                                    <div className="relative z-10 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 h-full flex flex-col shadow-2xl overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <cfg.icon size={120} />
                                        </div>

                                        <div className="flex justify-between items-start mb-6">
                                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest', badge.className)}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                {badge.label}
                                            </span>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Registrado</span>
                                                <span className="text-xs text-white font-bold tracking-tighter">{fmtTime(row.createdAt)}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-4 flex-1">
                                            <div>
                                                <p className={cn('text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 opacity-80', cfg.accent)}>{cfg.headline}</p>
                                                <h4 className="text-2xl font-black text-white italic tracking-tight leading-none uppercase break-words">{row.headline}</h4>
                                            </div>

                                            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-indigo-400">
                                                    <User size={18} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Residente que autorizó</p>
                                                    <p className="text-sm font-bold text-white truncate">{row.resident}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
                                                        <MapPin size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Unidad</p>
                                                        <p className="text-sm font-bold text-white truncate">{row.unit}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-400 shrink-0">
                                                        <Building2 size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Condominio</p>
                                                        <p className="text-sm font-bold text-white truncate">{row.orgName}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                {[
                                                    { label: 'Color / Placas', value: row.vehicle || '—', icon: Car },
                                                    { label: 'Acceso', value: fmtTime(row.checkIn), icon: LogIn },
                                                    { label: 'Salida', value: fmtTime(row.checkOut), icon: LogOut },
                                                ].map(m => (
                                                    <div key={m.label} className="p-2.5 bg-white/5 rounded-xl border border-white/5 min-w-0">
                                                        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
                                                            <m.icon size={10} /> {m.label}
                                                        </p>
                                                        <p className="text-xs font-bold text-white truncate mt-0.5" title={m.value}>{m.value}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {row.notes && (
                                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                    <p className="text-sm font-bold text-white italic leading-relaxed">&ldquo;{row.notes}&rdquo;</p>
                                                </div>
                                            )}

                                            {row.state === 'rejected' && (
                                                <div className="p-3 rounded-2xl border border-rose-500/20 bg-rose-500/10">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-rose-400">Motivo del rechazo</p>
                                                    <p className="text-xs text-rose-100 mt-0.5">{row.rejectionReason || 'No se registró un motivo.'}</p>
                                                </div>
                                            )}
                                        </div>

                                        {(row.state === 'pending' || row.state === 'inside') && (
                                            <div className="pt-4 flex gap-3 relative z-20">
                                                {row.state === 'pending' ? (
                                                    <>
                                                        <button
                                                            disabled={isProcessing}
                                                            onClick={() => runEvent(row, 'check_in')}
                                                            className={cn('flex-1 h-12 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50', cfg.button)}
                                                        >
                                                            <LogIn size={18} /> Autorizar acceso
                                                        </button>
                                                        <button
                                                            disabled={isProcessing}
                                                            onClick={() => { setRejectReason(''); setRejectTarget(row) }}
                                                            className="w-12 h-12 bg-zinc-800/50 hover:bg-rose-600 text-zinc-500 hover:text-white border border-zinc-700/30 hover:border-rose-500 rounded-2xl transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
                                                            title="Rechazar acceso"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        disabled={isProcessing}
                                                        onClick={() => runEvent(row, 'check_out')}
                                                        className="flex-1 h-12 bg-zinc-800 hover:bg-sky-600 text-zinc-300 hover:text-white border border-zinc-700 hover:border-sky-500 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                                    >
                                                        <LogOut size={18} /> Registrar salida
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* Motivo de rechazo: queda como evidencia y le llega al residente */}
            <AnimatePresence>
                {rejectTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => processingId !== rejectTarget.id && setRejectTarget(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                    <XCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Rechazar acceso</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">{rejectTarget.headline} · Unidad {rejectTarget.unit}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Motivo del rechazo</label>
                                <textarea
                                    autoFocus
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                    placeholder="Ej. Datos del vehículo no coinciden / sin identificación..."
                                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-rose-500/50 resize-none"
                                />
                                <p className="text-[11px] text-zinc-500 flex items-center gap-1"><Clock size={11} /> El residente verá este motivo en su panel y por WhatsApp.</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={processingId === rejectTarget.id}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={confirmReject}
                                    disabled={!rejectReason.trim() || processingId === rejectTarget.id}
                                    className="bg-rose-600 hover:bg-rose-500 text-white"
                                >
                                    {processingId === rejectTarget.id ? 'Guardando...' : 'Confirmar rechazo'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
