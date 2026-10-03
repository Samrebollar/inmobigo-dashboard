/**
 * Registro de cobro del propietario que no vive en la unidad: una fila de
 * `residents` con este role, sin cuenta ni correo, que existe solo para
 * asignarle la cuota de mantenimiento. No es un residente: se excluye de
 * listas, conteos de ocupación, avisos, seguridad e invitaciones.
 * (Sin dependencias de servidor: se usa también en componentes de cliente.)
 */
export const OWNER_RECORD_ROLE = 'propietario_no_residente'

/** Filtro PostgREST para `.or(...)`: residentes reales (role nulo o distinto). */
export const NOT_OWNER_RECORD = `role.is.null,role.neq.${OWNER_RECORD_ROLE}`

export function isOwnerRecord(resident: { role?: string | null } | null | undefined): boolean {
    return resident?.role === OWNER_RECORD_ROLE
}

type UnitBillingTarget = { occupancy_type?: string | null; payment_responsible?: string | null }

/**
 * La cuota de la unidad se le cobra al propietario que no vive ahí (o a su
 * gestor en su nombre). Si el dueño vive en la unidad, o si paga el inquilino,
 * se factura a los residentes como siempre.
 */
export function billsToOwnerRecord(unit: UnitBillingTarget | null | undefined): boolean {
    if (!unit) return false
    const occupancy = unit.occupancy_type || 'propietario'
    const responsible = unit.payment_responsible || 'propietario'
    return occupancy !== 'propietario' && responsible !== 'inquilino'
}
