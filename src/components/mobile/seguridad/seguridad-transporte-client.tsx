'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Car, User, MapPin, CheckCircle2, XCircle, Archive, Loader2, LogIn, LogOut } from 'lucide-react'
import { updateTransportNoticeStatusAction } from '@/app/actions/service-actions'

interface TransportNotice {
    id: string
    direction: 'pickup' | 'dropoff'
    platform: string
    vehicle_info?: string | null
    notes?: string | null
    status: 'pending' | 'received' | 'closed' | 'rejected'
    resident_name: string
    unit_name: string
    created_at: string
}

export default function MobileSeguridadTransporteClient({
    initialNotices,
    adminUserId,
}: {
    initialNotices: TransportNotice[]
    adminUserId: string
}) {
    const [notices, setNotices] = useState(initialNotices)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const handleUpdate = async (id: string, status: 'received' | 'closed' | 'rejected') => {
        setProcessingId(id)
        try {
            const result = await updateTransportNoticeStatusAction({ id, status, handledBy: adminUserId })
            if (!result.success) throw new Error(result.error)

            if (status === 'closed' || status === 'rejected') {
                setNotices((prev) => prev.filter((n) => n.id !== id))
            } else {
                setNotices((prev) => prev.map((n) => (n.id === id ? { ...n, status } : n)))
            }
            toast.success(
                status === 'received' ? 'Autorizado' : status === 'rejected' ? 'Aviso rechazado' : 'Marcado como completado'
            )
        } catch {
            toast.error('No se pudo actualizar el aviso.')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="mx-auto max-w-[480px] px-5 pb-8 pt-6">
            <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e0f2fe]">
                    <Car size={18} className="text-[#0284c7]" />
                </span>
                <h1 className="text-[20px] font-semibold text-[#191C1D]">Transporte</h1>
            </div>

            <div className="flex flex-col gap-4">
                {notices.length === 0 ? (
                    <div className="rounded-[20px] border border-[#c3d7c6] bg-white p-8 text-center text-[13px] text-[#434655]">
                        No hay avisos de transporte pendientes.
                    </div>
                ) : (
                    notices.map((notice) => {
                        const isProcessing = processingId === notice.id
                        return (
                            <div
                                key={notice.id}
                                className="flex flex-col gap-3 rounded-[20px] border border-[#c3d7c6] bg-white p-[17px]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            {notice.direction === 'pickup' ? (
                                                <LogOut size={14} className="text-[#0284c7]" />
                                            ) : (
                                                <LogIn size={14} className="text-[#059669]" />
                                            )}
                                            <p className="text-[16px] font-semibold text-[#191C1D]">
                                                {notice.platform} — {notice.direction === 'pickup' ? 'Recogida' : 'Llegada'}
                                            </p>
                                        </div>
                                        <div className="mt-1 flex items-center gap-1.5 text-[#434655]">
                                            <User size={12} />
                                            <span className="text-[12px]">{notice.resident_name}</span>
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1.5 text-[#434655]">
                                            <MapPin size={12} />
                                            <span className="text-[12px]">Unidad {notice.unit_name}</span>
                                        </div>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[-0.5px] ${
                                            notice.status === 'received'
                                                ? 'bg-[#d1fae5] text-[#059669]'
                                                : 'bg-[#fef3c7] text-[#b45309]'
                                        }`}
                                    >
                                        {notice.status === 'received' ? 'Autorizado' : 'Esperando'}
                                    </span>
                                </div>

                                {notice.vehicle_info && (
                                    <p className="text-[12px] text-[#434655]">🚗 {notice.vehicle_info}</p>
                                )}
                                {notice.notes && <p className="text-[12px] italic text-[#434655]">"{notice.notes}"</p>}

                                <p className="text-[11px] text-[#434655]">
                                    {format(new Date(notice.created_at), "d MMM, yyyy • HH:mm", { locale: es })}
                                </p>

                                <div className="flex gap-2 border-t border-[#e7e8e9] pt-3">
                                    {notice.status === 'pending' ? (
                                        <button
                                            onClick={() => handleUpdate(notice.id, 'received')}
                                            disabled={isProcessing}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0284c7] text-[13px] font-semibold text-white disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                            Autorizar
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleUpdate(notice.id, 'closed')}
                                            disabled={isProcessing}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#0284c7] text-[13px] font-semibold text-white disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                                            Completado
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleUpdate(notice.id, 'rejected')}
                                        disabled={isProcessing}
                                        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#ffdad6] text-[13px] font-semibold text-[#ba1a1a] disabled:opacity-50"
                                    >
                                        <XCircle size={14} />
                                        Rechazar
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
