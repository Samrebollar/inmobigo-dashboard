export interface Condominium {
    id: string
    organization_id: string
    name: string
    slug: string
    type: 'residential' | 'commercial' | 'mixed'
    country: string
    state: string
    city: string
    address: string
    units_total: number
    billing_day: number
    currency: 'MXN' | 'USD'
    status: 'active' | 'paused'
    created_at?: string
}

export interface CreateCondominiumDTO {
    organization_id: string
    name: string
    slug: string
    type: 'residential' | 'commercial' | 'mixed'
    country: string
    state: string
    city: string
    address: string
    units_total: number
    billing_day: number
    currency: 'MXN' | 'USD'
    status: 'active' | 'paused'
}

export interface UpdateCondominiumDTO extends Partial<CreateCondominiumDTO> {
    id: string
}
