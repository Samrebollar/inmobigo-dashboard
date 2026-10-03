/**
 * Tipos de cargo especiales.
 *
 * amenity_deposit: depósito en garantía de una reserva de amenidad. Es dinero
 * del residente en resguardo, no un ingreso ni una deuda del condominio: no
 * cuenta en ingresos, morosidad, recargos ni recordatorios.
 * amenity_fee: cuota de uso de una amenidad (ingreso normal).
 * amenity_damage: parte retenida del depósito por daños (ingreso), pagada con
 * el propio depósito (payment_method DEPOSIT_RETAINED_METHOD).
 */
export const AMENITY_FEE_TYPE = 'amenity_fee'
export const AMENITY_DEPOSIT_TYPE = 'amenity_deposit'
export const AMENITY_DAMAGE_TYPE = 'amenity_damage'
export const DEPOSIT_RETAINED_METHOD = 'Depósito en garantía retenido'

export const isDepositInvoice = (inv: { invoice_type?: string | null } | null | undefined) =>
    inv?.invoice_type === AMENITY_DEPOSIT_TYPE

/** Quita los depósitos en garantía de una lista de cargos (no son deuda ni ingreso). */
export const withoutDeposits = <T extends { invoice_type?: string | null }>(list: T[] | null | undefined): T[] =>
    (list || []).filter((inv) => !isDepositInvoice(inv))

/** Cargos de una reserva de amenidad: se cobran y pagan desde la reserva, no en el estado de cuenta de cuotas. */
export const RESERVATION_INVOICE_TYPES = [AMENITY_FEE_TYPE, AMENITY_DEPOSIT_TYPE]
export const isReservationInvoice = (inv: { invoice_type?: string | null } | null | undefined) =>
    RESERVATION_INVOICE_TYPES.includes(inv?.invoice_type || '')
export const withoutReservationCharges = <T extends { invoice_type?: string | null }>(list: T[] | null | undefined): T[] =>
    (list || []).filter((inv) => !isReservationInvoice(inv))
/** Filtro PostgREST para excluir los cargos de reservas: `.not('invoice_type', 'in', RESERVATION_TYPES_FILTER)` */
export const RESERVATION_TYPES_FILTER = `(${RESERVATION_INVOICE_TYPES.join(',')})`
/** Filtro PostgREST para `.or(...)` que excluye los cargos de reservas sin perder los de tipo nulo. */
export const NOT_RESERVATION_CHARGE = `invoice_type.is.null,invoice_type.not.in.${RESERVATION_TYPES_FILTER}`
/** Filtro PostgREST para `.or(...)` que excluye solo los depósitos en garantía. */
export const NOT_DEPOSIT_CHARGE = `invoice_type.is.null,invoice_type.neq.${AMENITY_DEPOSIT_TYPE}`
