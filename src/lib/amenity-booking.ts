/**
 * Reglas de reserva de amenidades (compartidas por cliente y servidor).
 *
 * - Uso exclusivo: se aparta el día completo. Una reserva pendiente o
 *   aprobada ocupa la fecha; si se cancela o rechaza, se libera.
 * - Uso compartido (gimnasio, alberca): no bloquea fechas.
 * - Cada residente puede tener 1 reserva activa por amenidad.
 * - Se reserva con hasta BOOKING_WINDOW_DAYS días de anticipación.
 */
export const BOOKING_WINDOW_DAYS = 10
/** Amenidades con costo: se reservan con al menos estos días, para pagar 48 h antes. */
export const PAID_MIN_DAYS_AHEAD = 3
/** El pago de una reserva vence estas horas antes del evento. */
export const PAYMENT_DEADLINE_HOURS = 48
export const ACTIVE_RESERVATION_STATUSES = ['pending', 'approved']

export type BookingMode = 'exclusivo' | 'compartido'

export const isExclusiveAmenity = (amenity: { booking_mode?: string | null } | null | undefined) =>
    (amenity?.booking_mode || 'exclusivo') !== 'compartido'

/** Fecha de hoy en Cancún/CDMX como yyyy-MM-dd. */
export function todayMx(): string {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
}

/** yyyy-MM-dd sumando días a una fecha yyyy-MM-dd (sin desfases de zona horaria). */
export function addDaysIso(iso: string, days: number): string {
    const [y, m, d] = iso.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d + days))
    return date.toISOString().slice(0, 10)
}

export function lastBookableDate(): string {
    return addDaysIso(todayMx(), BOOKING_WINDOW_DAYS)
}

/** Día de la semana ('0' domingo … '6' sábado) de una fecha yyyy-MM-dd. */
export function weekdayOf(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number)
    return String(new Date(Date.UTC(y, m - 1, d)).getUTCDay())
}

/** La amenidad abre ese día (según los días de uso configurados; sin configurar = todos). */
export function operatesOn(amenity: { use_days?: unknown } | null | undefined, iso: string): boolean {
    const days = Array.isArray(amenity?.use_days) ? (amenity!.use_days as unknown[]).map(String) : null
    if (!days || days.length === 0) return true
    return days.includes(weekdayOf(iso))
}

type PricedAmenity = { base_price?: number | string | null; deposit_required?: boolean | null; deposit_amount?: number | string | null }

export const amenityFee = (a: PricedAmenity | null | undefined) => Math.max(0, Number(a?.base_price || 0))
export const amenityDeposit = (a: PricedAmenity | null | undefined) => (a?.deposit_required ? Math.max(0, Number(a?.deposit_amount || 0)) : 0)
export const amenityHasCost = (a: PricedAmenity | null | undefined) => amenityFee(a) + amenityDeposit(a) > 0

/** Primera fecha reservable: hoy, o en 3 días si la amenidad tiene costo. */
export function firstBookableDate(amenity: PricedAmenity | null | undefined): string {
    return addDaysIso(todayMx(), amenityHasCost(amenity) ? PAID_MIN_DAYS_AHEAD : 0)
}

/** Límite de pago: 48 h antes del inicio del día del evento (hora de Cancún/CDMX, UTC-6). */
export function paymentDueAt(reservationDate: string): string {
    const start = new Date(`${reservationDate}T00:00:00-06:00`)
    return new Date(start.getTime() - PAYMENT_DEADLINE_HOURS * 3600 * 1000).toISOString()
}
