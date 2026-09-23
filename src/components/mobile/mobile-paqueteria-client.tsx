'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { Bell, Package, Plus, X, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { createPackageAlertAction } from '@/app/actions/service-actions'

interface PackageAlert {
    id: string
    carrier: string
    status: 'pending' | 'received' | 'closed' | 'rejected'
    notes?: string | null
    created_at: string
}

const STATUS_INFO: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    pending: { label: 'En caseta', bg: '#fef3c7', text: '#b45309', icon: Clock },
    received: { label: 'Autorizado', bg: '#dcfce7', text: '#15803d', icon: CheckCircle2 },
    closed: { label: 'Entregado', bg: '#e7e8e9', text: '#434655', icon: CheckCircle2 },
    rejected: { label: 'Rechazado', bg: '#ffdad6', text: '#93000a', icon: XCircle },
}

export default function MobilePaqueteriaClient({
    alerts,
    organizationId,
    unitId,
    residentUserId,
    residentName,
    unitName,
}: {
    alerts: PackageAlert[]
    organizationId?: string | null
    unitId?: string | null
    residentUserId: string
    residentName: string
    unitName: string
}) {
    const router = useRouter()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [carrier, setCarrier] = useState('')
    const [notes, setNotes] = useState('')
    const [isSending, setIsSending] = useState(false)

    const pendingCount = useMemo(() => alerts.filter((a) => a.status === 'pending').length, [alerts])
    const receivedThisMonth = useMemo(() => {
        const now = new Date()
        return alerts.filter(
            (a) =>
                (a.status === 'closed' || a.status === 'received') &&
                new Date(a.created_at).getMonth() === now.getMonth() &&
                new Date(a.created_at).getFullYear() === now.getFullYear()
        ).length
    }, [alerts])

    const handleSendNotice = async () => {
        if (!carrier || !organizationId || !unitId) {
            toast.error('Tu perfil de residente está incompleto. Contacta a administración.')
            return
        }
        setIsSending(true)
        try {
            const result = await createPackageAlertAction({
                organization_id: organizationId,
                unit_id: unitId,
                resident_id: residentUserId,
                resident_name: residentName,
                unit_name: unitName,
                carrier,
                notes,
                status: 'pending',
            })
            if (!result.success) throw new Error(result.error)
            toast.success('Aviso de paquetería enviado a caseta')
            setIsModalOpen(false)
            setCarrier('')
            setNotes('')
            router.refresh()
        } catch (e: any) {
            toast.error(e.message || 'No se pudo registrar el aviso')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[rgba(248,249,250,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <h1 className="text-[20px] font-semibold leading-[28px] text-[#004AC6]">Paquetería</h1>
                <Link href="/residente/avisos" className="flex h-10 w-10 items-center justify-center rounded-full">
                    <Bell size={18} className="text-[#191C1D]" />
                </Link>
            </header>

            <main className="flex flex-col gap-6 px-5 pb-24 pt-2">
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-[20px] border border-[#c3c6d7] bg-white p-[17px] shadow-[0px_4px_20px_rgba(0,0,0,0.03)]">
                        <p className="text-[28px] font-bold text-[#191C1D]">{pendingCount}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#434655]">En caseta</p>
                    </div>
                    <div className="rounded-[20px] border border-[#c3c6d7] bg-white p-[17px] shadow-[0px_4px_20px_rgba(0,0,0,0.03)]">
                        <p className="text-[28px] font-bold text-[#191C1D]">{receivedThisMonth}</p>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#434655]">Recibidos este mes</p>
                    </div>
                </div>

                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#004AC6] text-[16px] font-semibold text-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)]"
                >
                    <Plus size={18} />
                    Avisar nueva paquetería
                </button>

                <div className="flex flex-col gap-4">
                    <h2 className="text-[16px] font-semibold text-[#191C1D]">Historial</h2>
                    {alerts.length === 0 ? (
                        <div className="rounded-[20px] border border-[#c3c6d7] bg-white p-8 text-center text-[13px] text-[#434655]">
                            No tienes avisos de paquetería todavía.
                        </div>
                    ) : (
                        alerts.map((alert) => {
                            const info = STATUS_INFO[alert.status] || STATUS_INFO.pending
                            const StatusIcon = info.icon
                            return (
                                <div
                                    key={alert.id}
                                    className="flex w-full items-center justify-between rounded-[20px] border border-[#c3c6d7] bg-white p-[17px]"
                                >
                                    <div className="flex items-center gap-4">
                                        <span
                                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                                            style={{ backgroundColor: info.bg }}
                                        >
                                            <Package size={20} style={{ color: info.text }} />
                                        </span>
                                        <div className="flex flex-col">
                                            <p className="text-[14px] font-semibold text-[#191C1D]">{alert.carrier}</p>
                                            <p className="text-[11px] font-medium text-[#434655]">
                                                {format(new Date(alert.created_at), "d MMM, yyyy • hh:mm a", { locale: es })}
                                            </p>
                                            {alert.notes && (
                                                <p className="mt-0.5 text-[11px] italic text-[#434655]">"{alert.notes}"</p>
                                            )}
                                        </div>
                                    </div>
                                    <span
                                        className="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[-0.5px]"
                                        style={{ backgroundColor: info.bg, color: info.text }}
                                    >
                                        <StatusIcon size={11} />
                                        {info.label}
                                    </span>
                                </div>
                            )
                        })
                    )}
                </div>
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
                    <div className="w-full max-w-[480px] rounded-t-[24px] bg-white p-6 pb-8">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-[18px] font-semibold text-[#191C1D]">Avisar nueva paquetería</h3>
                            <button onClick={() => setIsModalOpen(false)}>
                                <X size={20} className="text-[#434655]" />
                            </button>
                        </div>

                        <label className="text-[12px] font-semibold text-[#434655]">Paquetería / Repartidor</label>
                        <input
                            value={carrier}
                            onChange={(e) => setCarrier(e.target.value)}
                            placeholder="Ej. Amazon, DHL, Estafeta..."
                            className="mt-1 mb-4 h-12 w-full rounded-xl border border-[#c3c6d7] bg-[#f8f9fa] px-4 text-[14px] text-[#191C1D] focus:outline-none"
                        />

                        <label className="text-[12px] font-semibold text-[#434655]">Instrucciones (opcional)</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej. Dejar con el guardia, es frágil..."
                            rows={3}
                            className="mt-1 mb-6 w-full resize-none rounded-xl border border-[#c3c6d7] bg-[#f8f9fa] px-4 py-3 text-[14px] text-[#191C1D] focus:outline-none"
                        />

                        <button
                            onClick={handleSendNotice}
                            disabled={!carrier || isSending}
                            className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#004AC6] text-[16px] font-semibold text-white disabled:opacity-50"
                        >
                            {isSending ? <Loader2 size={18} className="animate-spin" /> : 'Enviar aviso'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
