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

export interface SettingsCondominio {
    id?: string
    condominio_id: string
    recordatorios_dias_antes: number[]
    morosidad_dias_despues: number[]
    recargo_activo: boolean
    recargo_tipo: 'fijo' | 'porcentaje'
    recargo_valor: number
    recargo_dias_aplicar: number
    created_at?: string
    updated_at?: string
}
