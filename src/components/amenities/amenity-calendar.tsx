'use client'

import { useCallback, useEffect, useState } from 'react'
import { format, isSameDay, isSameMonth, isToday } from 'date-fns'
import { getAmenityAvailabilityAction } from '@/app/actions/service-actions'
import { BOOKING_WINDOW_DAYS, PAID_MIN_DAYS_AHEAD, firstBookableDate, isExclusiveAmenity, lastBookableDate, operatesOn, todayMx } from '@/lib/amenity-booking'

type AmenityLike = { id: string; name: string; booking_mode?: string | null; use_days?: unknown; base_price?: number | null; deposit_required?: boolean | null; deposit_amount?: number | null }

export interface AmenityAvailability {
    occupied: Set<string>
    myActiveDate: string | null
    loading: boolean
    refresh: () => void
}

/** Fechas ocupadas de la amenidad y la reserva activa del usuario en ella. */
export function useAmenityAvailability(amenityId: string | null | undefined): AmenityAvailability {
    const [occupied, setOccupied] = useState<Set<string>>(new Set())
    const [myActiveDate, setMyActiveDate] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [version, setVersion] = useState(0)

    useEffect(() => {
        if (!amenityId) return
        let cancelled = false
        const load = async () => {
            setLoading(true)
            const result = await getAmenityAvailabilityAction(amenityId)
            if (cancelled) return
            if (result.success) {
                setOccupied(new Set(result.occupied))
                setMyActiveDate(result.myActiveDate)
            }
            setLoading(false)
        }
        load()
        return () => { cancelled = true }
    }, [amenityId, version])

    const refresh = useCallback(() => setVersion((v) => v + 1), [])
    return { occupied, myActiveDate, loading, refresh }
}

type DayState = 'available' | 'past' | 'too_soon' | 'out_of_window' | 'closed' | 'occupied'

function dayState(amenity: AmenityLike, iso: string, occupied: Set<string>): DayState {
    if (iso < todayMx()) return 'past'
    if (iso < firstBookableDate(amenity)) return 'too_soon'
    if (iso > lastBookableDate()) return 'out_of_window'
    if (!operatesOn(amenity, iso)) return 'closed'
    if (isExclusiveAmenity(amenity) && occupied.has(iso)) return 'occupied'
    return 'available'
}

/** Motivo por el que no se puede reservar esa fecha, o null si sí se puede. */
export function bookingBlockReason(amenity: AmenityLike, iso: string, availability: AmenityAvailability): string | null {
    if (availability.myActiveDate) {
        return `Ya tienes una reserva activa de ${amenity.name} (${availability.myActiveDate.split('-').reverse().join('/')}). Podrás apartar otra cuando pase o la canceles.`
    }
    switch (dayState(amenity, iso, availability.occupied)) {
        case 'past': return 'Elige una fecha a partir de hoy.'
        case 'too_soon': return `Esta amenidad tiene costo: resérvala con al menos ${PAID_MIN_DAYS_AHEAD} días de anticipación para pagar 48 horas antes.`
        case 'out_of_window': return `Solo puedes reservar con hasta ${BOOKING_WINDOW_DAYS} días de anticipación.`
        case 'closed': return `${amenity.name} no abre ese día.`
        case 'occupied': return 'Esa fecha ya está ocupada. Elige otra.'
        default: return null
    }
}

/** Cuadrícula del calendario de reservas: marca días ocupados, cerrados y fuera de la ventana. */
export function AmenityCalendarGrid({
    amenity,
    days,
    viewDate,
    bookingDate,
    onSelect,
    availability,
}: {
    amenity: AmenityLike
    days: Date[]
    viewDate: Date
    bookingDate: Date
    onSelect: (day: Date) => void
    availability: AmenityAvailability
}) {
    return (
        <>
            <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const iso = format(day, 'yyyy-MM-dd')
                    const state = dayState(amenity, iso, availability.occupied)
                    const isSelected = isSameDay(day, bookingDate) && state === 'available'
                    const isCurMonth = isSameMonth(day, viewDate)
                    const disabled = state !== 'available'
                    const title = state === 'occupied' ? 'Ocupado' : state === 'closed' ? 'Cerrado' : state === 'too_soon' ? `Mínimo ${PAID_MIN_DAYS_AHEAD} días de anticipación` : state === 'out_of_window' ? `Disponible ${BOOKING_WINDOW_DAYS} días antes` : undefined

                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            disabled={disabled}
                            title={title}
                            onClick={() => onSelect(day)}
                            className={`
                                relative h-12 w-full rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all
                                ${!isCurMonth ? 'opacity-20' : ''}
                                ${isSelected
                                    ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] z-10 scale-105'
                                    : state === 'occupied'
                                        ? 'bg-red-500/10 text-red-400 border border-red-500/20 cursor-not-allowed'
                                        : state === 'closed'
                                            ? 'text-zinc-700 line-through cursor-not-allowed'
                                            : disabled
                                                ? 'text-zinc-700 cursor-not-allowed'
                                                : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-white'
                                }
                            `}
                        >
                            {format(day, 'd')}
                            {state === 'occupied' && <span className="text-[8px] font-black uppercase leading-none">Ocupado</span>}
                            {isToday(day) && !isSelected && state !== 'occupied' && (
                                <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-500" />
                            )}
                        </button>
                    )
                })}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-zinc-500">
                {isExclusiveAmenity(amenity) && (
                    <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-red-500/30 border border-red-500/40" /> Ocupado</span>
                )}
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded bg-zinc-800" /> No disponible</span>
                <span>Reserva con {firstBookableDate(amenity) > todayMx() ? `${PAID_MIN_DAYS_AHEAD} a ` : 'hasta '}{BOOKING_WINDOW_DAYS} días de anticipación{isExclusiveAmenity(amenity) ? ' · se aparta el día completo' : ' · uso compartido'}</span>
            </div>
            {availability.myActiveDate && (
                <p className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    Ya tienes una reserva activa de {amenity.name} para el {availability.myActiveDate.split('-').reverse().join('/')}. Podrás apartar otra cuando pase o la canceles.
                </p>
            )}
        </>
    )
}
