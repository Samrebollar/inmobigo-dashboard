export type UnitStatus = 'occupied' | 'vacant' | 'maintenance'

export interface Unit {
    id: string
    condominium_id: string
    unit_number: string
    floor: string
    type: string
    status: UnitStatus
    size_m2?: number
    created_at?: string
}

export interface CreateUnitDTO {
    condominium_id: string
    unit_number: string
    floor: string
    type: string
    status: UnitStatus
    size_m2?: number
}

export interface UpdateUnitDTO extends Partial<CreateUnitDTO> { }
