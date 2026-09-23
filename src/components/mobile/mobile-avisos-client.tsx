'use client'

import { useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Bell, MapPin, CalendarDays } from 'lucide-react'

interface Announcement {
    id: string
    title: string
    message?: string | null
    description?: string | null
    type?: string | null
    priority?: string | null
    location?: string | null
    event_date?: string | null
    image_url?: string | null
    created_at: string
}

const categoryFor = (ann: Announcement) => {
    const lowerType = (ann.type || '').toLowerCase()
    if (ann.priority === 'high' || lowerType.includes('urgente')) {
        return { label: ann.type || 'Urgente', bg: '#ffdad6', text: '#93000a' }
    }
    if (lowerType.includes('mantenimiento')) {
        return { label: ann.type || 'Mantenimiento', bg: '#fef3c7', text: '#b45309' }
    }
    if (lowerType.includes('evento')) {
        return { label: ann.type || 'Evento', bg: '#dcfce7', text: '#15803d' }
    }
    return { label: ann.type || 'General', bg: '#e7e8e9', text: '#434655' }
}

export default function MobileAvisosClient({ announcements }: { announcements: Announcement[] }) {
    const [filter, setFilter] = useState<string>('todos')

    const categories = useMemo(() => {
        const set = new Set<string>()
        announcements.forEach((a) => set.add(categoryFor(a).label))
        return Array.from(set)
    }, [announcements])

    const filtered = useMemo(() => {
        if (filter === 'todos') return announcements
        if (filter === 'urgentes') return announcements.filter((a) => a.priority === 'high')
        return announcements.filter((a) => categoryFor(a).label === filter)
    }, [announcements, filter])

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[rgba(248,249,250,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <h1 className="text-[20px] font-semibold leading-[28px] text-[#004AC6]">Avisos</h1>
                <span className="flex h-10 w-10 items-center justify-center rounded-full">
                    <Bell size={18} className="text-[#191C1D]" />
                </span>
            </header>

            <main className="flex flex-col gap-4 px-5 pb-24 pt-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setFilter('todos')}
                        className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.24px] ${
                            filter === 'todos' ? 'bg-[#2563eb] text-[#eeefff]' : 'bg-[#e7e8e9] text-[#434655]'
                        }`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilter('urgentes')}
                        className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.24px] ${
                            filter === 'urgentes' ? 'bg-[#2563eb] text-[#eeefff]' : 'bg-[#e7e8e9] text-[#434655]'
                        }`}
                    >
                        Urgentes
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.24px] ${
                                filter === cat ? 'bg-[#2563eb] text-[#eeefff]' : 'bg-[#e7e8e9] text-[#434655]'
                            }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col gap-4">
                    {filtered.length === 0 ? (
                        <div className="rounded-[20px] border border-[#c3c6d7] bg-white p-8 text-center text-[13px] text-[#434655]">
                            No hay avisos en este filtro.
                        </div>
                    ) : (
                        filtered.map((ann) => {
                            const cat = categoryFor(ann)
                            const dateStr = ann.created_at
                                ? formatDistanceToNow(new Date(ann.created_at), { addSuffix: true, locale: es })
                                : ''
                            return (
                                <div
                                    key={ann.id}
                                    className="flex w-full flex-col gap-3 rounded-[20px] border border-[#c3c6d7] bg-white p-[17px] shadow-[0px_4px_20px_rgba(0,0,0,0.03)]"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <span
                                            className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.5px]"
                                            style={{ backgroundColor: cat.bg, color: cat.text }}
                                        >
                                            {cat.label}
                                        </span>
                                        <span className="shrink-0 text-[10px] font-medium text-[#434655]">{dateStr}</span>
                                    </div>

                                    <h3 className="text-[16px] font-semibold text-[#191C1D]">{ann.title}</h3>
                                    {(ann.message || ann.description) && (
                                        <p className="text-[13px] leading-[19px] text-[#434655]">
                                            {ann.message || ann.description}
                                        </p>
                                    )}

                                    {ann.image_url && !ann.image_url.toLowerCase().includes('.pdf') && (
                                        <img
                                            src={ann.image_url}
                                            alt={ann.title}
                                            className="w-full rounded-[14px] object-cover"
                                        />
                                    )}

                                    {(ann.location || ann.event_date) && (
                                        <div className="flex flex-col gap-1.5 rounded-[14px] bg-[#f3f4f5] p-3">
                                            {ann.event_date && (
                                                <div className="flex items-center gap-2">
                                                    <CalendarDays size={13} className="text-[#434655]" />
                                                    <span className="text-[12px] font-medium text-[#191C1D]">
                                                        {format(new Date(ann.event_date), "d MMM, yyyy", { locale: es })}
                                                    </span>
                                                </div>
                                            )}
                                            {ann.location && (
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={13} className="text-[#434655]" />
                                                    <span className="text-[12px] font-medium text-[#191C1D]">{ann.location}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </main>
        </div>
    )
}
