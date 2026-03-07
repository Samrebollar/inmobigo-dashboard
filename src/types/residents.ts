export type ResidentStatus = 'active' | 'inactive' | 'delinquent'

export interface Resident {
    id: string
    condominium_id: string
    organization_id?: string // Added for cross-reference
    unit_id?: string
    first_name: string
    last_name: string
    email: string
    phone: string
    status: ResidentStatus
    debt_amount: number
    created_at?: string
    // Linked data (optional for joins)
    unit_number?: string
    vehicles?: Vehicle[]
}

export interface CommunicationLog {
    id: string
    organization_id: string
    resident_id: string
    invoice_id?: string
    folio?: string
    type: 'reminder' | 'manual' | 'automated'
    method: 'n8n' | 'email' | 'whatsapp' | 'manual'
    message_type: 'suave' | 'firme' | 'formal' | 'escalar'
    days_overdue?: number
    metadata?: any
    created_at: string
}

export interface Vehicle {
    id: string
    resident_id: string
    plate: string
    brand: string
    color: string
}

export interface CreateResidentDTO {
    condominium_id: string
    unit_id?: string
    first_name: string
    last_name: string
    email: string
    phone: string
    status: ResidentStatus
    debt_amount?: number
    vehicles?: {
        plate: string
        brand: string
        color: string
    }[]
}

export interface UpdateResidentDTO extends Partial<CreateResidentDTO> { }
