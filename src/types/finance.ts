export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled'

export interface Invoice {
    id: string
    organization_id: string
    condominium_id: string
    unit_id?: string
    folio: string
    amount: number
    status: InvoiceStatus
    due_date: string
    description: string
    created_at: string
    paid_at?: string
    // Linked data
    unit_number?: string
    condominium_name?: string
    condominium_address?: string
    condominium_logo_url?: string
}

export interface CreateInvoiceDTO {
    organization_id: string
    condominium_id: string
    unit_id?: string
    amount: number
    status: InvoiceStatus
    due_date: string
    description: string
}

export interface FinancialSummary {
    total_billed: number
    total_collected: number
    total_pending: number
    total_overdue: number
}
