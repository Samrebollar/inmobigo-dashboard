export type OccupancyType = 'propietario' | 'inquilino' | 'vacacional' | 'desocupada'
export type PaymentResponsible = 'propietario' | 'gestor' | 'inquilino'
export type UnitContactKind = 'propietario' | 'gestor'

export interface UnitContact {
    id: string
    kind: UnitContactKind
    full_name: string
    phone: string | null
    email: string | null
    /** Ya tiene cuenta en el Portal de Propietarios y Gestores */
    has_access?: boolean
}

/** Contacto a guardar: existente (id) o nuevo (sin id). */
export interface UnitContactInput {
    id?: string | null
    full_name: string
    phone?: string | null
    email?: string | null
    /** Conservar el contacto ya asignado (id) sin modificarlo */
    keep?: boolean
}

export interface UnitOwnership {
    unit_id: string
    unit_number: string
    occupancy_type: OccupancyType
    payment_responsible: PaymentResponsible
    owner: UnitContact | null
    co_owner: UnitContact | null
    manager: UnitContact | null
    manager_can_pay: boolean
    /** Residentes que viven en la unidad (nombre), para mostrar al ocupante */
    occupants: string[]
}

export const OCCUPANCY_LABEL: Record<OccupancyType, string> = {
    propietario: 'Vive el propietario',
    inquilino: 'Rentada a inquilino',
    vacacional: 'Renta vacacional',
    desocupada: 'Desocupada',
}

export const PAYMENT_RESPONSIBLE_LABEL: Record<PaymentResponsible, string> = {
    propietario: 'Propietario',
    gestor: 'Gestor',
    inquilino: 'Inquilino',
}
