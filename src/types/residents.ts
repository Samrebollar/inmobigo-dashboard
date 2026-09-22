export type ResidentStatus = 'active' | 'inactive' | 'delinquent'

// Categorías de deuda previa que un residente puede traer arrastrando al darlo
// de alta. 'maintenance' entra al mismo mecanismo que las cuotas normales
// (recibe un mes y se factura como invoice_type='maintenance'); el resto son
// cargos de una sola vez sin ciclo mensual.
export type DebtCategory = 'maintenance' | 'fine' | 'special_assessment' | 'water' | 'electricity' | 'other'

export interface DebtLineItem {
    category: DebtCategory
    // 'YYYY-MM' — obligatorio solo cuando category === 'maintenance'
    month?: string
    amount: number
    note?: string
}

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
    credit_amount?: number
    created_at?: string
    fecha_ingreso?: string
    facturacion_activa?: boolean
    // Linked data (optional for joins)
    unit_number?: string
    payment_deadline?: number
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
    // Desglose de la deuda previa por categoría/mes (alta manual). Cuando se
    // manda esto, el servidor crea una factura real por cada línea en vez de
    // guardar un solo número suelto en debt_amount.
    debt_items?: DebtLineItem[]
    credit_amount?: number
    vehicles?: {
        plate: string
        brand: string
        color: string
    }[]
}

export interface UpdateResidentDTO extends Partial<CreateResidentDTO> { }
