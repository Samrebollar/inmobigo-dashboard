'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Package, User, MapPin, CheckCircle2, XCircle, Archive, Loader2 } from 'lucide-react'
import { updatePackageAlertStatusAction } from '@/app/actions/service-actions'

interface PackageAlert {
    id: string
    carrier: string
    notes?: string | null
    status: 'pending' | 'received' | 'closed' | 'rejected'
    resident_name: string
    unit_name: string
    created_at: string
}

export default function MobileSeguridadPaqueteriaClient({
    initialAlerts,
    adminUserId,
}: {
    initialAlerts: PackageAlert[]
    adminUserId: string
}) {
    const [alerts, setAlerts] = useState(initialAlerts)
    const [processingId, setProcessingId] = useState<string | null>(null)

    const handleUpdate = async (id: string, status: 'received' | 'closed' | 'rejected') => {
        setProcessingId(id)
        try {
            const result = await updatePackageAlertStatusAction({ id, status, adminUserId })
            if (!result.success) throw new Error(result.error)

            if (status === 'closed' || status === 'rejected') {
                setAlerts((prev) => prev.filter((a) => a.id !== id))
            } else {
                setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
            }
            toast.success(
                status === 'received' ? 'Paquete autorizado' : status === 'rejected' ? 'Aviso rechazado' : 'Marcado como entregado'
            )
        } catch {
            toast.error('No se pudo actualizar el paquete.')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="mx-auto max-w-[480px] px-5 pb-8 pt-6">
            <div className="mb-6 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d1fae5]">
                    <Package size={18} className="text-[#059669]" />
                </span>
                <h1 className="text-[20px] font-semibold text-[#191C1D]">Paquetería</h1>
            </div>

            <div className="flex flex-col gap-4">
                {alerts.length === 0 ? (
                    <div className="rounded-[20px] border border-[#c3d7c6] bg-white p-8 text-center text-[13px] text-[#434655]">
                        No hay paquetes pendientes.
                    </div>
                ) : (
                    alerts.map((alert) => {
                        const isProcessing = processingId === alert.id
                        return (
                            <div
                                key={alert.id}
                                className="flex flex-col gap-3 rounded-[20px] border border-[#c3d7c6] bg-white p-[17px]"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[16px] font-semibold text-[#191C1D]">{alert.carrier}</p>
                                        <div className="mt-1 flex items-center gap-1.5 text-[#434655]">
                                            <User size={12} />
                                            <span className="text-[12px]">{alert.resident_name}</span>
                                        </div>
                                        <div className="mt-0.5 flex items-center gap-1.5 text-[#434655]">
                                            <MapPin size={12} />
                                            <span className="text-[12px]">Unidad {alert.unit_name}</span>
                                        </div>
                                    </div>
                                    <span
                                        className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[-0.5px] ${
                                            alert.status === 'received'
                                                ? 'bg-[#d1fae5] text-[#059669]'
                                                : 'bg-[#fef3c7] text-[#b45309]'
                                        }`}
                                    >
                                        {alert.status === 'received' ? 'Autorizado' : 'En caseta'}
                                    </span>
                                </div>

                                {alert.notes && <p className="text-[12px] italic text-[#434655]">"{alert.notes}"</p>}

                                <p className="text-[11px] text-[#434655]">
                                    {format(new Date(alert.created_at), "d MMM, yyyy • HH:mm", { locale: es })}
                                </p>

                                <div className="flex gap-2 border-t border-[#e7e8e9] pt-3">
                                    {alert.status === 'pending' ? (
                                        <button
                                            onClick={() => handleUpdate(alert.id, 'received')}
                                            disabled={isProcessing}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#059669] text-[13px] font-semibold text-white disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                                            Autorizar
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleUpdate(alert.id, 'closed')}
                                            disabled={isProcessing}
                                            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#059669] text-[13px] font-semibold text-white disabled:opacity-50"
                                        >
                                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                                            Entregado
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleUpdate(alert.id, 'rejected')}
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
