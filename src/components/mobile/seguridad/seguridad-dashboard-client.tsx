'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { User, ScanLine, Package, AlertTriangle, ChevronRight, CheckCircle2, Clock, LogIn, LogOut, Loader2 } from 'lucide-react'
import { startShiftServer, endShiftServer } from '@/app/actions/security-ops-actions'
import { toast } from 'sonner'

interface RecentPass {
    id: string
    visitor_name: string
    unit_name: string
    status: string
    visit_date: string
    start_time: string
    used_at?: string | null
    created_at: string
}

interface ActiveShift {
    id: string
    check_in_at: string
    checkpoint?: string | null
}

export default function MobileSeguridadDashboardClient({
    firstName,
    avatarUrl,
    condominiumName,
    pendingPassesToday,
    pendingPackages,
    openTickets,
    recentPasses,
    organizationId,
    condominiumId,
    guardId,
    guardName,
    activeShift,
}: {
    firstName: string
    avatarUrl?: string | null
    condominiumName?: string | null
    pendingPassesToday: number
    pendingPackages: number
    openTickets: number
    recentPasses: RecentPass[]
    organizationId: string | null
    condominiumId?: string | null
    guardId: string
    guardName: string
    activeShift: ActiveShift | null
}) {
    const [shift, setShift] = useState<ActiveShift | null>(activeShift)
    const [loadingShift, setLoadingShift] = useState(false)

    const handleStartShift = async () => {
        if (!organizationId) return
        setLoadingShift(true)
        try {
            const result = await startShiftServer({ organizationId, condominiumId, guardId, guardName })
            if (result.success && result.shift) {
                setShift({ id: result.shift.id, check_in_at: result.shift.check_in_at })
                toast.success('Turno iniciado.')
            } else {
                toast.error(result.error || 'No se pudo iniciar el turno.')
            }
        } finally {
            setLoadingShift(false)
        }
    }

    const handleEndShift = async () => {
        if (!shift) return
        setLoadingShift(true)
        try {
            const result = await endShiftServer(shift.id)
            if (result.success) {
                setShift(null)
                toast.success('Turno finalizado.')
            } else {
                toast.error(result.error || 'No se pudo finalizar el turno.')
            }
        } finally {
            setLoadingShift(false)
        }
    }

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[rgba(248,250,249,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d1fae5]">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={firstName} className="h-full w-full object-cover" />
                        ) : (
                            <User size={18} className="text-[#059669]" />
                        )}
                    </div>
                    <div>
                        <h1 className="text-[18px] font-bold leading-[24px] text-[#191C1D]">Hola {firstName} 👋</h1>
                        {condominiumName && <p className="text-[12px] font-medium text-[#434655]">{condominiumName}</p>}
                    </div>
                </div>
            </header>

            <main className="flex flex-col gap-6 px-5 pb-8 pt-2">
                <div
                    className={`flex items-center justify-between rounded-[20px] p-4 ${
                        shift ? 'bg-[#d1fae5]' : 'bg-white border border-[#c3d7c6]'
                    }`}
                >
                    <div className="flex flex-col">
                        <p className="text-[12px] font-bold uppercase tracking-[0.24px] text-[#191C1D]">
                            {shift ? 'Turno activo' : 'Sin turno activo'}
                        </p>
                        {shift && (
                            <p className="text-[11px] font-medium text-[#065f46]">
                                Desde las {format(new Date(shift.check_in_at), 'HH:mm', { locale: es })}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={shift ? handleEndShift : handleStartShift}
                        disabled={loadingShift || !organizationId}
                        className={`flex h-10 items-center gap-2 rounded-xl px-4 text-[13px] font-semibold text-white disabled:opacity-60 ${
                            shift ? 'bg-[#ba1a1a]' : 'bg-[#059669]'
                        }`}
                    >
                        {loadingShift ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : shift ? (
                            <LogOut size={14} />
                        ) : (
                            <LogIn size={14} />
                        )}
                        {shift ? 'Terminar turno' : 'Iniciar turno'}
                    </button>
                </div>

                <Link
                    href="/mobile/seguridad/escanear"
                    className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#059669] text-[16px] font-semibold text-white shadow-[0_10px_30px_-5px_rgba(5,150,105,0.3)]"
                >
                    <ScanLine size={22} />
                    Escanear pase de visita
                </Link>

                <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col items-center gap-1 rounded-[18px] border border-[#c3d7c6] bg-white p-3 text-center">
                        <p className="text-[22px] font-bold text-[#191C1D]">{pendingPassesToday}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[#434655]">Pases hoy</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-[18px] border border-[#c3d7c6] bg-white p-3 text-center">
                        <p className="text-[22px] font-bold text-[#191C1D]">{pendingPackages}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[#434655]">Paquetes</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 rounded-[18px] border border-[#c3d7c6] bg-white p-3 text-center">
                        <p className="text-[22px] font-bold text-[#191C1D]">{openTickets}</p>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3px] text-[#434655]">Incidencias</p>
                    </div>
                </div>

                <Link
                    href="/mobile/seguridad/paqueteria"
                    className="flex w-full items-center justify-between rounded-[20px] bg-[#f0fdf4] p-4"
                >
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#d1fae5]">
                            <Package size={18} className="text-[#059669]" />
                        </span>
                        <div className="flex flex-col">
                            <p className="text-[12px] font-semibold tracking-[0.24px] text-[#191C1D]">Paquetería</p>
                            <p className="text-[11px] font-medium text-[#434655]">Autorizar y gestionar paquetes</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-[#434655]" />
                </Link>

                <section className="flex flex-col gap-4">
                    <h2 className="text-[14px] font-bold uppercase tracking-[1.4px] text-[#434655]">Actividad reciente</h2>
                    {recentPasses.length === 0 ? (
                        <div className="rounded-[20px] border border-[#c3d7c6] bg-white p-6 text-center text-[12px] text-[#434655]">
                            Sin pases de visita todavía.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {recentPasses.map((pass) => {
                                const isUsed = pass.status === 'used'
                                return (
                                    <div
                                        key={pass.id}
                                        className="flex items-center justify-between rounded-[18px] border border-[#c3d7c6] bg-white p-[14px]"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                                                    isUsed ? 'bg-[#d1fae5]' : 'bg-[#fef3c7]'
                                                }`}
                                            >
                                                {isUsed ? (
                                                    <CheckCircle2 size={16} className="text-[#059669]" />
                                                ) : (
                                                    <Clock size={16} className="text-[#b45309]" />
                                                )}
                                            </span>
                                            <div className="flex flex-col">
                                                <p className="text-[13px] font-semibold text-[#191C1D]">{pass.visitor_name}</p>
                                                <p className="text-[11px] text-[#434655]">Unidad {pass.unit_name}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-medium text-[#434655]">
                                            {format(new Date(pass.created_at), "d MMM, HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {openTickets > 0 && (
                    <Link
                        href="/seguridad/incidencias"
                        className="flex w-full items-center gap-3 rounded-[18px] border border-[#ffdad6] bg-[#fff1f0] p-4"
                    >
                        <AlertTriangle size={18} className="shrink-0 text-[#ba1a1a]" />
                        <p className="text-[13px] font-semibold text-[#93000a]">
                            {openTickets} incidencia{openTickets === 1 ? '' : 's'} abierta{openTickets === 1 ? '' : 's'} — revisar en la web
                        </p>
                    </Link>
                )}
            </main>
        </div>
    )
}
