'use client'

import Link from 'next/link'
import {
    Bell,
    Receipt,
    User,
    Wallet,
    QrCode,
    Waves,
    AlertTriangle,
    Package,
    FileText,
    MapPin,
    CheckCircle2,
} from 'lucide-react'
import { isToday, isYesterday, format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Announcement {
    id: string
    title: string
    location?: string | null
    priority?: string | null
    type?: string | null
    created_at: string
}

interface Activity {
    id: string
    concept: string
    amount: number
    date: string
}

const QUICK_ACCESS = [
    { label: 'Mis pagos', href: '/mobile/pagos', icon: Wallet },
    { label: 'Pase visita', href: '/mobile/pase', icon: QrCode },
    { label: 'Amenidades', href: '/mobile/amenidades', icon: Waves },
    { label: 'Incidencias', href: '/mobile/incidencias', icon: AlertTriangle },
    { label: 'Paquetería', href: '/mobile/paqueteria', icon: Package },
    { label: 'Documentos', href: '/mobile/documentos', icon: FileText },
]

function formatNoticeDate(iso: string) {
    const date = new Date(iso)
    if (isToday(date)) return `Hoy, ${format(date, 'hh:mm a')}`
    if (isYesterday(date)) return 'Ayer'
    return format(date, 'd MMM', { locale: es })
}

function formatActivityDate(iso: string) {
    const date = new Date(iso)
    if (isToday(date)) return 'Hoy'
    if (isYesterday(date)) return 'Ayer'
    const days = Math.floor((Date.now() - date.getTime()) / 86400000)
    if (days < 7) return `Hace ${days}d`
    return format(date, 'd MMM', { locale: es })
}

export default function MobileDashboardClient({
    firstName,
    avatarUrl,
    condominiumName,
    unitNumber,
    saldoPendiente,
    proximoPagoFecha,
    announcements,
    recentActivity,
}: {
    firstName: string
    avatarUrl?: string | null
    condominiumName?: string | null
    unitNumber?: string | null
    saldoPendiente: number
    proximoPagoFecha: string | null
    announcements: Announcement[]
    recentActivity: Activity[]
}) {
    const alCorriente = saldoPendiente <= 0
    const locationLine = [condominiumName, unitNumber ? `Unidad ${unitNumber}` : null].filter(Boolean).join(' • ')

    return (
        <div className="mx-auto max-w-[480px]">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-transparent bg-[rgba(248,249,250,0.9)] backdrop-blur-[6px]">
                <div className="flex items-center justify-between px-5 py-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[rgba(195,198,215,0.2)] bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                            {avatarUrl ? (
                                <img src={avatarUrl} alt={firstName} className="h-full w-full object-cover" />
                            ) : (
                                <User size={18} className="text-[#434655]" />
                            )}
                        </div>
                        <div>
                            <h1 className="text-[18px] font-bold leading-[28px] tracking-[-0.45px] text-[#191C1D]">
                                Hola {firstName} 👋
                            </h1>
                            {locationLine && (
                                <p className="text-[12px] font-medium leading-[16px] text-[#434655]">{locationLine}</p>
                            )}
                        </div>
                    </div>
                    <Link
                        href="/mobile/avisos"
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
                    >
                        <Bell size={16} className="text-[#434655]" />
                    </Link>
                </div>
            </header>

            <main className="flex flex-col gap-8 px-5 pb-8">
                {/* Hero: saldo */}
                <section className="w-full rounded-[24px] border border-[rgba(195,198,215,0.1)] bg-white px-[25px] pb-[23px] pt-[25px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-start justify-between">
                        {alCorriente ? (
                            <span className="flex items-center gap-2 rounded-full border border-[#dcfce7] bg-[#f0fdf4] px-[17px] py-[9px]">
                                <span className="h-2 w-2 rounded-full bg-[#4ade80]" />
                                <span className="text-[11px] font-bold uppercase tracking-[0.275px] text-[#166534]">Al corriente</span>
                            </span>
                        ) : (
                            <span className="flex items-center gap-2 rounded-full border border-[#ffdad6] bg-[#fff1f0] px-[17px] py-[9px]">
                                <span className="h-2 w-2 rounded-full bg-[#ef4444]" />
                                <span className="text-[11px] font-bold uppercase tracking-[0.275px] text-[#93000a]">Con adeudo</span>
                            </span>
                        )}
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f3f4f5]">
                            <Receipt size={15} className="text-[#434655]" />
                        </span>
                    </div>

                    <div className="mt-4 flex flex-col gap-1">
                        <p className="text-[11px] font-bold uppercase tracking-[1.1px] text-[rgba(67,70,85,0.6)]">Saldo actual</p>
                        <p className="text-[32px] font-bold leading-[48px] tracking-[-1.6px] text-[#191C1D]">
                            ${saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    <div className="mt-4 flex items-end justify-between">
                        <div className="flex flex-col gap-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.5px] text-[rgba(67,70,85,0.6)]">Próximo pago</p>
                            <p className="text-[14px] font-semibold text-[#191C1D]">
                                {proximoPagoFecha ? format(new Date(proximoPagoFecha), "d 'de' MMMM", { locale: es }) : '—'}
                            </p>
                        </div>
                        <Link
                            href="/mobile/pagos"
                            className="rounded-[12px] bg-[#004AC6] px-4 py-2 text-[12px] font-bold text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)]"
                        >
                            Ver recibo
                        </Link>
                    </div>
                </section>

                {/* Acceso rápido */}
                <section className="flex flex-col gap-4">
                    <h2 className="text-[14px] font-bold uppercase tracking-[1.4px] text-[#434655]">Acceso rápido</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {QUICK_ACCESS.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className="flex flex-col items-center justify-center gap-2 rounded-[24px] border border-[rgba(195,198,215,0.1)] bg-white px-3 py-6 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] active:scale-95 transition-transform"
                            >
                                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(0,74,198,0.05)]">
                                    <item.icon size={22} className="text-[#004AC6]" />
                                </span>
                                <span className="text-center text-[11px] font-bold leading-[13.75px] text-[#434655]">
                                    {item.label}
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Avisos */}
                <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[14px] font-bold uppercase tracking-[1.4px] text-[#434655]">Avisos</h2>
                        <Link href="/mobile/avisos" className="text-[12px] font-bold text-[#004AC6]">Ver todos</Link>
                    </div>

                    {announcements.length === 0 ? (
                        <div className="rounded-[16px] border border-[rgba(195,198,215,0.1)] bg-white p-6 text-center text-[12px] text-[rgba(67,70,85,0.6)] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                            Sin avisos por ahora.
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {announcements.slice(0, 3).map((ann) => {
                                const isUrgent = ann.priority === 'high' || (ann.type || '').toLowerCase().includes('urgente')
                                return (
                                    <div
                                        key={ann.id}
                                        className="flex w-full flex-col gap-2 rounded-[16px] border border-[rgba(195,198,215,0.1)] bg-white p-[17px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
                                    >
                                        <div className="flex items-start justify-between">
                                            <span
                                                className={`rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] ${
                                                    isUrgent ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#f3f4f5] text-[#434655]'
                                                }`}
                                            >
                                                {isUrgent ? 'Urgente' : 'General'}
                                            </span>
                                            <span className="text-[10px] font-medium text-[rgba(67,70,85,0.6)]">
                                                {formatNoticeDate(ann.created_at)}
                                            </span>
                                        </div>
                                        <h3 className="text-[14px] font-bold text-[#191C1D]">{ann.title}</h3>
                                        {ann.location && (
                                            <div className="flex items-center gap-1">
                                                <MapPin size={11} className="text-[#434655]" />
                                                <span className="text-[10px] font-semibold text-[#434655]">{ann.location}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </section>

                {/* Actividad reciente */}
                <section className="flex flex-col gap-4 pb-6">
                    <h2 className="text-[14px] font-bold uppercase tracking-[1.4px] text-[#434655]">Actividad reciente</h2>

                    {recentActivity.length === 0 ? (
                        <div className="rounded-[24px] border border-[rgba(195,198,215,0.1)] bg-white p-6 text-center text-[12px] text-[rgba(67,70,85,0.6)] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                            Todavía no hay actividad reciente.
                        </div>
                    ) : (
                        <div className="w-full overflow-hidden rounded-[24px] border border-[rgba(195,198,215,0.1)] bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
                            {recentActivity.slice(0, 4).map((activity, idx) => (
                                <div
                                    key={activity.id}
                                    className={`flex items-center gap-4 p-4 ${
                                        idx < recentActivity.slice(0, 4).length - 1 ? 'border-b border-[rgba(195,198,215,0.1)]' : ''
                                    }`}
                                >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(0,74,198,0.05)]">
                                        <CheckCircle2 size={17} className="text-[#004AC6]" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[14px] font-bold text-[#191C1D]">Pago realizado</p>
                                        <p className="truncate text-[12px] text-[#434655]">{activity.concept}</p>
                                    </div>
                                    <span className="shrink-0 text-[10px] font-medium text-[rgba(67,70,85,0.6)]">
                                        {formatActivityDate(activity.date)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    )
}
