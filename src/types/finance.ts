// ============================================================
// TIPOS DE LA NUEVA ARQUITECTURA FINANCIERA
// Basado en: resident_invoices, financial_dashboard_v, resident_debt_aging_v
// NO usar la tabla antigua `invoices` para nuevas funcionalidades.
// ============================================================

// ─── STATUS ──────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled'
export type InvoiceType = 'maintenance' | 'initial_balance' | 'manual_payment' | 'custom'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

// ─── TABLA PRINCIPAL: resident_invoices ───────────────────────────────────────
export interface ResidentInvoice {
    id: string
    organization_id: string
    condominium_id: string
    resident_id: string
    amount: number
    balance_due: number
    status: InvoiceStatus
    invoice_type: InvoiceType
    due_date: string
    description?: string
    created_at: string
    updated_at?: string
    payment_method?: string | null
    payment_provider?: string | null

    // Joined data (optional, from joins)
    resident_name?: string
    unit_number?: string
    condominium_name?: string
    condominium_logo_url?: string
    condominium_address?: string // enriched from joins

    // Computed helpers (NO column en DB — generados por el servicio o componentes)
    folio?: string          // generado del id: `FAC-${id.substring(0,8).toUpperCase()}`
    paid_amount?: number    // calculado: Math.max(0, amount - balance_due)
    paid_at?: string        // NO existe en resident_invoices — solo backward compat con componentes viejos
    unit_id?: string        // NO existe en resident_invoices — solo backward compat
    payment_link?: string   // NO existe en resident_invoices — solo backward compat
    payment_folio?: string  // folio del recibo de pago emitido (efectivo). Coincide con `payment_provider` si existe, sino con `folio`
}

// ─── VISTA: financial_dashboard_v ─────────────────────────────────────────────
// Una fila por condominium_id. Filtrar con .eq('condominium_id', id)
export interface FinancialDashboard {
    condominium_id: string
    organization_id?: string
    total_facturas: number
    residentes_morosos: number
    total_facturado: number
    total_cobrado: number
    deuda_total: number
    deuda_vencida: number
    deuda_pendiente: number
    total_pagado: number
}

// ─── VISTA: resident_debt_aging_v ─────────────────────────────────────────────
export interface ResidentDebtAging {
    resident_id: string
    condominium_id: string
    facturas_pendientes: number
    deuda_total: number
    factura_mas_antigua?: string
    factura_mas_reciente?: string
    dias_max_atraso: number
    nivel_riesgo: RiskLevel

    // Joined data (optional)
    resident_name?: string
    unit_number?: string
}

// ─── TABLA: resident_monthly_charges ─────────────────────────────────────────
export interface ResidentMonthlyCharge {
    id: string
    resident_id: string
    condominium_id: string
    organization_id: string
    amount: number
    period_month: number  // 1-12
    period_year: number
    status: InvoiceStatus
    created_at: string
}

// ─── TIPOS LEGACY (para compatibilidad en funciones existentes) ───────────────
// Mantener el tipo Invoice como alias de ResidentInvoice para migración gradual
export type Invoice = ResidentInvoice

export interface CreateInvoiceDTO {
    organization_id: string
    condominium_id: string
    resident_id: string
    amount: number
    status: InvoiceStatus
    invoice_type?: InvoiceType
    due_date: string
    description?: string
    payment_method?: string
    paid_at?: string
    paid_amount?: number
    balance_due?: number
}

export interface FinancialSummary {
    total_billed: number
    total_collected: number
    total_pending: number
    total_overdue: number
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
/** Genera un folio visual desde el UUID de la factura */
export function generateFolio(id: string): string {
    return `FAC-${id.substring(0, 8).toUpperCase()}`
}

/** Calcula el monto pagado desde amount y balance_due */
export function getPaidAmount(invoice: ResidentInvoice): number {
    return Math.max(0, (invoice.amount || 0) - (invoice.balance_due || 0))
}
