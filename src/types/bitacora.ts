// src/types/bitacora.ts
// TypeScript types for Bitácora Inteligente module

export type EventType = 'access' | 'delivery' | 'amenity'
export type BitacoraStatus = 'active' | 'pending' | 'completed' | 'expired' | 'cancelled'
export type SourceTable = 'visitor_passes' | 'package_alerts' | 'amenity_reservations'
export type VisitorType =
    | 'visit' | 'family' | 'friend' | 'provider' | 'technician'
    | 'contractor' | 'domestic' | 'guest' | 'event' | 'delivery' | 'amenity' | 'other'

export interface BitacoraEntry {
    id: string
    event_type: EventType
    organization_id: string
    condominium_id?: string
    condominium_name?: string
    unit_number?: string
    person_name: string
    authorized_by?: string
    guard_name?: string
    checkpoint?: string
    checked_in_at?: string
    checked_out_at?: string
    duration_minutes?: number
    status: BitacoraStatus
    source_table: SourceTable
    source_id: string
    visitor_type?: VisitorType
    company?: string
    amenity_name?: string
    created_at: string
}

export interface BitacoraKPIs {
    accesos_hoy: number
    entregas_hoy: number
    amenidades_activas: number
    personas_dentro: number
    total_entradas: number
    total_salidas: number
    movimientos_hoy: number
    tiempo_promedio_min: number
}

export interface BitacoraFilters {
    search?: string
    event_type?: EventType | 'all'
    status?: BitacoraStatus | 'all'
    date_from?: string
    date_to?: string
    unit?: string
    guard?: string
    condominium_id?: string
}

export const EVENT_TYPE_CONFIG: Record<EventType, {
    label: string
    color: string
    bg: string
    border: string
    icon: string
}> = {
    access: {
        label: 'Acceso',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/10',
        border: 'border-indigo-500/20',
        icon: 'DoorOpen',
    },
    delivery: {
        label: 'Entrega',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        icon: 'Package',
    },
    amenity: {
        label: 'Amenidad',
        color: 'text-purple-400',
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        icon: 'Calendar',
    },
}

export const STATUS_CONFIG: Record<BitacoraStatus, {
    label: string
    color: string
    bg: string
}> = {
    active: {
        label: 'Dentro',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
    },
    pending: {
        label: 'Pendiente',
        color: 'text-zinc-400',
        bg: 'bg-zinc-500/10',
    },
    completed: {
        label: 'Salió',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
    },
    expired: {
        label: 'Expirado',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
    },
    cancelled: {
        label: 'Cancelado',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
    },
}

export const VISITOR_TYPE_LABELS: Record<VisitorType, string> = {
    visit: 'Visita',
    family: 'Familiar',
    friend: 'Amigo',
    provider: 'Proveedor',
    technician: 'Técnico',
    contractor: 'Contratista',
    domestic: 'Personal Doméstico',
    guest: 'Invitado',
    event: 'Evento',
    delivery: 'Repartidor',
    amenity: 'Amenidad',
    other: 'Otro',
}

export const COURIER_ICONS: Record<string, string> = {
    'mercado libre': '🟡',
    'amazon': '📦',
    'dhl': '🔴',
    'estafeta': '🟠',
    'fedex': '🟣',
    'uber eats': '🟢',
    'didi food': '🟠',
    'rappi': '🟠',
    'entrega': '📦',
}
