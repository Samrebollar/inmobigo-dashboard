export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Ticket {
    id: string
    organization_id: string
    condominium_id: string
    unit_id?: string
    resident_id?: string
    title: string
    description: string
    status: TicketStatus
    priority: TicketPriority
    category?: string
    images?: string[]
    assigned_to?: string          // user_id of staff
    created_at: string
    updated_at: string
    resolved_at?: string

    // v2 additive columns
    location?: string
    reported_by_name?: string
    resolution_notes?: string
    assigned_to_name?: string

    // Joins
    condominium_name?: string
    unit_number?: string
    resident_name?: string
    assigned_staff_name?: string
}

export interface CreateTicketDTO {
    organization_id: string
    condominium_id: string
    unit_id?: string
    resident_id?: string
    title: string
    description: string
    priority: TicketPriority
    status: TicketStatus
    category?: string
    images?: string[]
    location?: string
    reported_by_name?: string
}

export interface UpdateTicketDTO {
    status?: TicketStatus
    priority?: TicketPriority
    assigned_to?: string
    assigned_to_name?: string
    description?: string
    images?: string[]
    location?: string
    resolution_notes?: string
    resolved_at?: string
}

