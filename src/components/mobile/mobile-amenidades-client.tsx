'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
    Bell,
    Users,
    Info,
    PartyPopper,
    Waves,
    Dumbbell,
    Flame,
    Wrench,
    ChevronRight,
    CalendarDays,
} from 'lucide-react'

interface Amenity {
    id: string
    name: string
    description: string
    icon_name?: string
    base_price: number
    deposit_required?: boolean
    deposit_amount?: number
    color?: string
    status?: string
    capacity?: number
}

const getIcon = (name?: string) => {
    switch (name) {
        case 'PartyPopper': return PartyPopper
        case 'Waves': return Waves
        case 'Dumbbell': return Dumbbell
        case 'Flame': return Flame
        default: return Info
    }
}

type FilterKey = 'todas' | 'gratuitas' | 'pago'

export default function MobileAmenidadesClient({ amenities }: { amenities: Amenity[] }) {
    const [filter, setFilter] = useState<FilterKey>('todas')

    const filtered = useMemo(() => {
        if (filter === 'gratuitas') return amenities.filter((a) => Number(a.base_price || 0) === 0)
        if (filter === 'pago') return amenities.filter((a) => Number(a.base_price || 0) > 0)
        return amenities
    }, [amenities, filter])

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[rgba(248,249,250,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <h1 className="text-[20px] font-semibold leading-[28px] text-[#004AC6]">Amenidades</h1>
                <Link href="/mobile/avisos" className="flex h-10 w-10 items-center justify-center rounded-full">
                    <Bell size={18} className="text-[#191C1D]" />
                </Link>
            </header>

            <main className="flex flex-col gap-6 px-5 pb-8 pt-2">
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {([
                        { key: 'todas', label: 'Todas' },
                        { key: 'gratuitas', label: 'Gratuitas' },
                        { key: 'pago', label: 'Con costo' },
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

                <Link
                    href="/residente/amenidades/reservas"
                    className="flex w-full items-center justify-between rounded-[20px] bg-[#f3f4f5] p-4"
                >
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e1e3e4]">
                            <CalendarDays size={18} className="text-[#434655]" />
                        </span>
                        <div className="flex flex-col">
                            <p className="text-[12px] font-semibold tracking-[0.24px] text-[#191C1D]">Mis reservas</p>
                            <p className="text-[11px] font-medium text-[#434655]">Ver historial y próximas reservas</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-[#434655]" />
                </Link>

                <div className="flex flex-col gap-4 pb-6">
                    {filtered.length === 0 ? (
                        <div className="rounded-[20px] border border-[#c3c6d7] bg-white p-8 text-center text-[13px] text-[#434655]">
                            {amenities.length === 0
                                ? 'Tu condominio todavía no tiene amenidades registradas.'
                                : 'No hay amenidades en este filtro.'}
                        </div>
                    ) : (
                        filtered.map((amenity) => {
                            const Icon = getIcon(amenity.icon_name)
                            const isMaintenance = amenity.status === 'maintenance'
                            const accentColor = amenity.color || '#004AC6'
                            const isFree = Number(amenity.base_price || 0) === 0

                            return (
                                <Link
                                    key={amenity.id}
                                    href="/residente/amenidades"
                                    className={`block w-full overflow-hidden rounded-[24px] border border-[#c3c6d7] bg-white shadow-[0px_4px_20px_rgba(0,0,0,0.03)] ${
                                        isMaintenance ? 'opacity-60' : ''
                                    }`}
                                >
                                    <div
                                        className="relative flex h-[140px] items-center justify-center"
                                        style={{ backgroundImage: `linear-gradient(135deg, ${accentColor}33 0%, ${accentColor}14 100%)` }}
                                    >
                                        <span
                                            className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-[0px_4px_10px_rgba(0,0,0,0.08)]"
                                            style={{ color: accentColor }}
                                        >
                                            <Icon size={28} />
                                        </span>

                                        {isMaintenance ? (
                                            <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-[#fef3c7] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.5px] text-[#b45309]">
                                                <Wrench size={11} />
                                                En mantenimiento
                                            </span>
                                        ) : amenity.capacity ? (
                                            <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#434655]">
                                                <Users size={11} />
                                                {amenity.capacity}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className="flex items-center justify-between p-[17px]">
                                        <div className="min-w-0 flex-1 pr-3">
                                            <h3 className="truncate text-[16px] font-semibold text-[#191C1D]">{amenity.name}</h3>
                                            {amenity.description && (
                                                <p className="mt-0.5 line-clamp-2 text-[12px] text-[#434655]">{amenity.description}</p>
                                            )}
                                            <p className="mt-2 text-[13px] font-semibold" style={{ color: accentColor }}>
                                                {isFree ? 'Gratis' : `$${Number(amenity.base_price).toLocaleString('es-MX')}`}
                                                {amenity.deposit_required && amenity.deposit_amount
                                                    ? ` · Depósito $${Number(amenity.deposit_amount).toLocaleString('es-MX')}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <ChevronRight size={18} className="shrink-0 text-[#434655]" />
                                    </div>
                                </Link>
                            )
                        })
                    )}
                </div>
            </main>
        </div>
    )
}
