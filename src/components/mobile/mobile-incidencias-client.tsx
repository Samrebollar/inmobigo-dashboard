'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, Plus } from 'lucide-react'
import type { Ticket } from '@/types/tickets'

type FilterKey = 'todas' | 'open' | 'in_progress' | 'resolved'

const STATUS_INFO: Record<string, { label: string; bg: string; text: string }> = {
    open: { label: 'Pendiente', bg: '#ffdad6', text: '#93000a' },
    in_progress: { label: 'En proceso', bg: '#fef3c7', text: '#b45309' },
    resolved: { label: 'Resuelto', bg: '#dcfce7', text: '#15803d' },
    closed: { label: 'Cerrado', bg: '#e7e8e9', text: '#434655' },
}

const PRIORITY_INFO: Record<string, { label: string; color: string }> = {
    critical: { label: 'Crítica', color: '#ba1a1a' },
    high: { label: 'Alta', color: '#b45309' },
    medium: { label: 'Media', color: '#004AC6' },
    low: { label: 'Baja', color: '#434655' },
}

export default function MobileIncidenciasClient({ tickets }: { tickets: Ticket[] }) {
    const router = useRouter()
    const [filter, setFilter] = useState<FilterKey>('todas')

    const filtered = useMemo(() => {
        if (filter === 'todas') return tickets
        return tickets.filter((t) => t.status === filter)
    }, [tickets, filter])

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[rgba(248,249,250,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <h1 className="text-[20px] font-semibold leading-[28px] text-[#004AC6]">Incidencias</h1>
                <Link href="/mobile/avisos" className="flex h-10 w-10 items-center justify-center rounded-full">
                    <Bell size={18} className="text-[#191C1D]" />
                </Link>
            </header>

            <main className="flex flex-col gap-4 px-5 pb-24 pt-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {([
                        { key: 'todas', label: 'Todas' },
                        { key: 'open', label: 'Pendientes' },
                        { key: 'in_progress', label: 'En proceso' },
                        { key: 'resolved', label: 'Resueltas' },
                    ] as { key: FilterKey; label: string }[]).map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.24px] ${
                                filter === f.key ? 'bg-[#2563eb] text-[#eeefff]' : 'bg-[#e7e8e9] text-[#434655]'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    {filtered.length === 0 ? (
                        <div className="rounded-[20px] border border-[#c3c6d7] bg-white p-8 text-center text-[13px] text-[#434655]">
                            {tickets.length === 0
                                ? 'No has reportado ninguna incidencia todavía.'
                                : 'No hay incidencias en este filtro.'}
                        </div>
                    ) : (
                        filtered.map((ticket) => {
                            const statusInfo = STATUS_INFO[ticket.status] || STATUS_INFO.open
                            const priorityInfo = PRIORITY_INFO[ticket.priority] || PRIORITY_INFO.low
                            const categoryLabel =
                                ticket.category || ticket.description?.match(/\[Categoría: (.*?)\]/)?.[1] || 'Mantenimiento'

                            return (
                                <div
                                    key={ticket.id}
                                    className="flex w-full flex-col gap-3 rounded-[20px] border border-[#c3c6d7] bg-white p-[17px] shadow-[0px_4px_20px_rgba(0,0,0,0.03)]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#434655]">
                                                {categoryLabel}
                                            </p>
                                            <h3 className="truncate text-[16px] font-semibold text-[#191C1D]">{ticket.title}</h3>
                                        </div>
                                        <span
                                            className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[-0.5px]"
                                            style={{ backgroundColor: statusInfo.bg, color: statusInfo.text }}
                                        >
                                            {statusInfo.label}
                                        </span>
                                    </div>

                                    {ticket.description && (
                                        <p className="line-clamp-2 text-[13px] text-[#434655]">
                                            {ticket.description.replace(/\[Categoría: .*?\]\s*/, '')}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between border-t border-[rgba(195,198,215,0.3)] pt-3">
                                        <span className="text-[11px] font-semibold" style={{ color: priorityInfo.color }}>
                                            Prioridad {priorityInfo.label}
                                        </span>
                                        <span className="text-[11px] font-medium text-[#434655]">
                                            {format(new Date(ticket.created_at), "d MMM, yyyy", { locale: es })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </main>

            <button
                onClick={() => router.push('/residente/maintenance')}
                className="fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#004AC6] text-white shadow-[0px_10px_30px_-5px_rgba(0,74,198,0.4)]"
                aria-label="Reportar incidencia"
            >
                <Plus size={24} />
            </button>
        </div>
    )
}
