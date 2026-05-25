import { createClient } from '@/utils/supabase/client'
import {
    ResidentInvoice,
    CreateInvoiceDTO,
    FinancialSummary,
    FinancialDashboard,
    ResidentDebtAging,
    generateFolio,
    getPaidAmount,
    Invoice
} from '@/types/finance'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Enriches a raw resident_invoice row with computed fields */
function enrichInvoice(inv: any): ResidentInvoice {
    return {
        ...inv,
        folio: generateFolio(inv.id),
        paid_amount: getPaidAmount(inv),
        // Flatten joined resident data if present
        resident_name: inv.residents
            ? `${inv.residents.first_name || ''} ${inv.residents.last_name || ''}`.trim() || null
            : (inv.resident_name || null),
        unit_number: inv.residents?.units?.unit_number || inv.unit_number || null,
        condominium_name: inv.condominiums?.name || inv.condominium_name || null,
        condominium_logo_url: inv.condominiums?.logo_url || inv.condominium_logo_url || null,
    }
}

/** Safe fallback for financial dashboard view */
function emptyDashboard(): FinancialDashboard {
    return {
        condominium_id: '',
        total_facturas: 0,
        residentes_morosos: 0,
        total_facturado: 0,
        total_cobrado: 0,
        deuda_total: 0,
        deuda_vencida: 0,
        deuda_pendiente: 0,
        total_pagado: 0,
    }
}

// Demo mock data ──────────────────────────────────────────────────────────────
function getDemoInvoices(condominiumId: string): ResidentInvoice[] {
    const now = new Date()
    return [
        {
            id: 'demo-inv-1',
            organization_id: 'demo-org',
            condominium_id: condominiumId,
            resident_id: 'demo-res-1',
            amount: 1500,
            balance_due: 0,
            status: 'paid',
            invoice_type: 'maintenance',
            description: 'Cuota de mantenimiento',
            due_date: now.toISOString(),
            created_at: now.toISOString(),
            folio: 'FAC-DEMO0001',
            paid_amount: 1500,
            unit_number: '101',
        },
        {
            id: 'demo-inv-2',
            organization_id: 'demo-org',
            condominium_id: condominiumId,
            resident_id: 'demo-res-2',
            amount: 1200,
            balance_due: 1200,
            status: 'pending',
            invoice_type: 'maintenance',
            description: 'Cuota de mantenimiento',
            due_date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
            created_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
            folio: 'FAC-DEMO0002',
            paid_amount: 0,
            unit_number: 'B-202',
        },
        {
            id: 'demo-inv-3',
            organization_id: 'demo-org',
            condominium_id: condominiumId,
            resident_id: 'demo-res-3',
            amount: 1800,
            balance_due: 1800,
            status: 'overdue',
            invoice_type: 'maintenance',
            description: 'Cuota de mantenimiento',
            due_date: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
            created_at: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
            folio: 'FAC-DEMO0003',
            paid_amount: 0,
            unit_number: 'C-303',
        },
    ]
}

// ─── FINANCE SERVICE ──────────────────────────────────────────────────────────
export const financeService = {

    // ── GET BY CONDOMINIUM ───────────────────────────────────────────────────
    async getByCondominium(condominiumId: string): Promise<ResidentInvoice[]> {
        if (condominiumId.startsWith('demo-')) {
            return getDemoInvoices(condominiumId)
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (
                    first_name,
                    last_name,
                    units (unit_number)
                ),
                condominiums (name, logo_url)
            `)
            .eq('condominium_id', condominiumId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[financeService.getByCondominium]', error.message)
            return []
        }

        return (data || []).map(enrichInvoice)
    },

    // ── GET BY CONDOMINIUMS (MULTIPLE) ───────────────────────────────────────
    async getByCondominiums(condominiumIds: string[]): Promise<ResidentInvoice[]> {
        if (condominiumIds.length === 0) return []
        const supabase = createClient()
        const { data, error } = await supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (
                    first_name,
                    last_name,
                    units (unit_number)
                ),
                condominiums (name, logo_url)
            `)
            .in('condominium_id', condominiumIds)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[financeService.getByCondominiums]', error.message)
            return []
        }

        return (data || []).map(enrichInvoice)
    },

    // ── FINANCIAL SUMMARY (from financial_dashboard_v) ───────────────────────
    async getFinancialSummary(condominiumId: string): Promise<FinancialSummary> {
        if (condominiumId.startsWith('demo-')) {
            return { total_billed: 4500, total_collected: 1500, total_pending: 1200, total_overdue: 1800 }
        }
        const supabase = createClient()
        try {
            const { data, error } = await supabase
                .from('financial_dashboard_v')
                .select('total_facturado, total_cobrado, deuda_pendiente, deuda_vencida')
                .eq('condominium_id', condominiumId)
                .maybeSingle()

            if (error || !data) throw error || new Error('No dashboard data')

            return {
                total_billed: Number(data.total_facturado || 0),
                total_collected: Number(data.total_cobrado || 0),
                total_pending: Number(data.deuda_pendiente || 0),
                total_overdue: Number(data.deuda_vencida || 0),
            }
        } catch (e) {
            console.error('[financeService.getFinancialSummary]', e)
            return { total_billed: 0, total_collected: 0, total_pending: 0, total_overdue: 0 }
        }
    },

    // ── GET DASHBOARD (financial_dashboard_v) ────────────────────────────────
    async getFinancialDashboard(condominiumId: string): Promise<FinancialDashboard> {
        if (condominiumId.startsWith('demo-')) {
            return {
                condominium_id: condominiumId,
                total_facturas: 3,
                residentes_morosos: 1,
                total_facturado: 4500,
                total_cobrado: 1500,
                deuda_total: 3000,
                deuda_vencida: 1800,
                deuda_pendiente: 1200,
                total_pagado: 1500,
            }
        }
        const supabase = createClient()
        try {
            const { data, error } = await supabase
                .from('financial_dashboard_v')
                .select('*')
                .eq('condominium_id', condominiumId)
                .maybeSingle()

            if (error) throw error
            return data ? (data as FinancialDashboard) : emptyDashboard()
        } catch (e) {
            console.error('[financeService.getFinancialDashboard]', e)
            return emptyDashboard()
        }
    },

    // ── CREATE INVOICE ───────────────────────────────────────────────────────
    async create(invoice: CreateInvoiceDTO): Promise<ResidentInvoice> {
        if (invoice.condominium_id.startsWith('demo-')) {
            return {
                id: `demo-inv-${Math.random().toString(36).substr(2, 9)}`,
                ...invoice,
                balance_due: invoice.amount,
                invoice_type: invoice.invoice_type || 'maintenance',
                folio: `FAC-DEMO${Date.now().toString().slice(-4)}`,
                paid_amount: 0,
                created_at: new Date().toISOString(),
            }
        }
        const supabase = createClient()

        if (!invoice.resident_id) {
            throw new Error('resident_id es obligatorio para crear una factura')
        }

        const { data, error } = await supabase
            .from('resident_invoices')
            .insert({
                organization_id: invoice.organization_id,
                condominium_id: invoice.condominium_id,
                resident_id: invoice.resident_id,
                amount: invoice.amount,
                balance_due: invoice.amount, // starts with full balance
                status: invoice.status,
                invoice_type: invoice.invoice_type || 'maintenance',
                due_date: invoice.due_date,
                description: invoice.description,
            })
            .select()
            .single()

        if (error) {
            console.error('[financeService.create]', error)
            throw new Error('Error al crear la factura')
        }

        return enrichInvoice(data)
    },

    // ── UPDATE INVOICE ───────────────────────────────────────────────────────
    async update(id: string, updates: Partial<ResidentInvoice>): Promise<ResidentInvoice> {
        if (id.startsWith('demo-')) {
            throw new Error('No se pueden editar facturas de demostración.')
        }

        const supabase = createClient()
        // Remove computed/virtual fields before updating
        const { folio, paid_amount, resident_name, unit_number, condominium_name, condominium_logo_url, ...safeUpdates } = updates

        const { data, error } = await supabase
            .from('resident_invoices')
            .update(safeUpdates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('[financeService.update]', error)
            throw new Error('Error al actualizar la factura')
        }

        return enrichInvoice(data)
    },

    // ── DELETE INVOICE ───────────────────────────────────────────────────────
    async delete(id: string): Promise<void> {
        if (id.startsWith('demo-')) {
            throw new Error('No se pueden eliminar facturas de demostración.')
        }

        const supabase = createClient()
        const { error } = await supabase
            .from('resident_invoices')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('[financeService.delete]', error)
            throw new Error('Error al eliminar la factura')
        }
    },

    // ── MARK AS PAID ─────────────────────────────────────────────────────────
    async markAsPaid(id: string, paidAmount?: number): Promise<ResidentInvoice> {
        if (id.startsWith('demo-')) {
            throw new Error('No se pueden editar facturas de demostración.')
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('resident_invoices')
            .update({
                status: 'paid',
                balance_due: 0,
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('[financeService.markAsPaid]', error)
            throw new Error('Error al marcar como pagado')
        }

        return enrichInvoice(data)
    },

    // ── GET GLOBAL INVOICES (all org) ────────────────────────────────────────
    async getGlobalInvoices(organizationId: string): Promise<ResidentInvoice[]> {
        if (organizationId === 'demo-org-id') {
            const now = new Date()
            const getRelativeDate = (daysAgo: number) => {
                const date = new Date(now)
                date.setDate(date.getDate() - daysAgo)
                return date.toISOString()
            }

            return [
                {
                    id: 'demo-inv-max-1', condominium_id: 'demo-condo-1',
                    organization_id: 'demo-org-id', resident_id: 'demo-res-1',
                    condominium_name: 'Torre Altura', unit_number: 'A-101',
                    resident_name: 'Juan Pérez', amount: 2500, balance_due: 0,
                    status: 'paid', due_date: getRelativeDate(5),
                    created_at: getRelativeDate(25), folio: 'FAC-DEMOMAX1',
                    invoice_type: 'maintenance', paid_amount: 2500,
                    description: 'Mantenimiento Mensual - Enero'
                },
                {
                    id: 'demo-inv-max-2', condominium_id: 'demo-condo-1',
                    organization_id: 'demo-org-id', resident_id: 'demo-res-2',
                    condominium_name: 'Torre Altura', unit_number: 'B-202',
                    resident_name: 'María García', amount: 1800, balance_due: 1800,
                    status: 'pending', due_date: getRelativeDate(-5),
                    created_at: getRelativeDate(10), folio: 'FAC-DEMOMAX2',
                    invoice_type: 'maintenance', paid_amount: 0,
                    description: 'Mantenimiento Mensual - Febrero'
                },
                {
                    id: 'demo-inv-max-3', condominium_id: 'demo-condo-2',
                    organization_id: 'demo-org-id', resident_id: 'demo-res-3',
                    condominium_name: 'Residencial del Valle', unit_number: '14-C',
                    resident_name: 'Carlos Rodríguez', amount: 3200, balance_due: 3200,
                    status: 'overdue', due_date: getRelativeDate(15),
                    created_at: getRelativeDate(45), folio: 'FAC-DEMOMAX3',
                    invoice_type: 'maintenance', paid_amount: 0,
                    description: 'Cuota de Mantenimiento Atrasada'
                },
                {
                    id: 'demo-inv-max-4', condominium_id: 'demo-condo-1',
                    organization_id: 'demo-org-id', resident_id: 'demo-res-4',
                    condominium_name: 'Torre Altura', unit_number: 'C-305',
                    resident_name: 'Ana López', amount: 4500, balance_due: 0,
                    status: 'paid', due_date: getRelativeDate(20),
                    created_at: getRelativeDate(50), folio: 'FAC-DEMOMAX4',
                    invoice_type: 'maintenance', paid_amount: 4500,
                    description: 'Fondo de Reserva Anual'
                },
            ]
        }

        const supabase = createClient()

        const { data: condos } = await supabase
            .from('condominiums')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('status', 'active')

        const condoIds = condos?.map(c => c.id) || []
        if (condoIds.length === 0) return []

        const { data, error } = await supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (
                    first_name,
                    last_name,
                    units (unit_number)
                ),
                condominiums (name, logo_url)
            `)
            .in('condominium_id', condoIds)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[financeService.getGlobalInvoices]', error)
            return []
        }

        return (data || []).map(enrichInvoice)
    },

    // ── GET INVOICES FOR REPORT ───────────────────────────────────────────────
    async getInvoicesForReport(organizationId: string, condominiumId: string | 'all', startDate: string, endDate: string): Promise<ResidentInvoice[]> {
        if (organizationId === 'demo-org-id') {
            return await this.getGlobalInvoices(organizationId)
        }

        const supabase = createClient()

        let condoIds: string[] = []
        if (condominiumId && condominiumId !== 'all') {
            condoIds = [condominiumId]
        } else {
            const { data: condos } = await supabase
                .from('condominiums')
                .select('id')
                .eq('organization_id', organizationId)
            condoIds = condos?.map(c => c.id) || []
        }

        if (condoIds.length === 0) return []

        const { data, error } = await supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (
                    first_name,
                    last_name,
                    units (unit_number)
                ),
                condominiums (name, logo_url)
            `)
            .in('condominium_id', condoIds)
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .order('due_date', { ascending: true })

        if (error) {
            console.error('[financeService.getInvoicesForReport]', error)
            return []
        }

        return (data || []).map(enrichInvoice)
    },

    // ── GET DELINQUENT INVOICES (via resident_debt_aging_v) ──────────────────
    async getDelinquentInvoices(organizationId: string, condominiumId: string | 'all'): Promise<ResidentInvoice[]> {
        if (organizationId === 'demo-org-id') {
            const all = await this.getGlobalInvoices(organizationId)
            return all.filter(inv => inv.status === 'overdue' || inv.status === 'pending')
        }

        const supabase = createClient()

        let condoIds: string[] = []
        if (condominiumId && condominiumId !== 'all') {
            condoIds = [condominiumId]
        } else {
            const { data: condos } = await supabase
                .from('condominiums')
                .select('id')
                .eq('organization_id', organizationId)
            condoIds = condos?.map(c => c.id) || []
        }

        if (condoIds.length === 0) return []

        const { data, error } = await supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (
                    first_name,
                    last_name,
                    units (unit_number)
                ),
                condominiums (name, logo_url)
            `)
            .in('condominium_id', condoIds)
            .or('status.eq.overdue,status.eq.pending')
            .order('due_date', { ascending: true })

        if (error) {
            console.error('[financeService.getDelinquentInvoices]', error)
            return []
        }

        return (data || []).map(enrichInvoice)
    },

    // ── GET INVOICE BY ID ────────────────────────────────────────────────────
    async getInvoiceById(id: string): Promise<ResidentInvoice | null> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (
                    first_name,
                    last_name,
                    units (unit_number)
                ),
                condominiums (name, address, logo_url)
            `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('[financeService.getInvoiceById]', error.message)
            return null
        }

        return enrichInvoice(data)
    },

    // ── GET BY UNIT (via resident → unit_id) ─────────────────────────────────
    async getByUnit(unitId: string): Promise<ResidentInvoice[]> {
        if (unitId.startsWith('demo-')) {
            return getDemoInvoices('demo-condo-1').slice(0, 1)
        }
        const supabase = createClient()

        // resident_invoices doesn't have unit_id. Get via residents table.
        const { data: residents } = await supabase
            .from('residents')
            .select('id')
            .eq('unit_id', unitId)
            .eq('status', 'active')

        const residentIds = residents?.map(r => r.id) || []
        if (residentIds.length === 0) return []

        const { data, error } = await supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (
                    first_name,
                    last_name,
                    units (unit_number)
                ),
                condominiums (name, logo_url)
            `)
            .in('resident_id', residentIds)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[financeService.getByUnit]', error)
            return []
        }

        return (data || []).map(enrichInvoice)
    },

    // ── GET BY RESIDENT ───────────────────────────────────────────────────────
    async getByResident(residentId: string): Promise<ResidentInvoice[]> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (
                    first_name,
                    last_name,
                    units (unit_number)
                ),
                condominiums (name, logo_url)
            `)
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[financeService.getByResident]', error)
            return []
        }

        return (data || []).map(enrichInvoice)
    },

    // ── RESIDENT DEBT AGING (resident_debt_aging_v) ───────────────────────────
    async getResidentDebtAging(condominiumId: string): Promise<ResidentDebtAging[]> {
        if (condominiumId.startsWith('demo-')) {
            return [
                {
                    resident_id: 'demo-res-3', condominium_id: condominiumId,
                    facturas_pendientes: 2, deuda_total: 3600, dias_max_atraso: 45,
                    nivel_riesgo: 'high', resident_name: 'Carlos R.', unit_number: 'C-303'
                },
                {
                    resident_id: 'demo-res-2', condominium_id: condominiumId,
                    facturas_pendientes: 1, deuda_total: 1200, dias_max_atraso: 12,
                    nivel_riesgo: 'medium', resident_name: 'María G.', unit_number: 'B-202'
                },
            ]
        }
        const supabase = createClient()
        try {
            const { data, error } = await supabase
                .from('resident_debt_aging_v')
                .select(`
                    *,
                    residents (
                        first_name,
                        last_name,
                        units (unit_number)
                    )
                `)
                .eq('condominium_id', condominiumId)
                .order('dias_max_atraso', { ascending: false })

            if (error) throw error

            return (data || []).map((row: any) => ({
                ...row,
                resident_name: row.residents
                    ? `${row.residents.first_name || ''} ${row.residents.last_name || ''}`.trim()
                    : null,
                unit_number: row.residents?.units?.unit_number || null,
            }))
        } catch (e) {
            console.error('[financeService.getResidentDebtAging]', e)
            return []
        }
    },

    // ── LEGACY RPC WRAPPERS (safe fallbacks) ──────────────────────────────────
    async getTotalIngresos(): Promise<number> {
        const supabase = createClient()
        try {
            const { data, error } = await supabase.rpc('get_total_ingresos')
            if (error) throw error
            const total = data && data.length > 0 ? data[0].total_ingresos : 0
            return Number(total) || 0
        } catch (e) {
            console.error('[financeService.getTotalIngresos]', e)
            return 0
        }
    },

    async getTasaCobranza(): Promise<number> {
        const supabase = createClient()
        try {
            const { data, error } = await supabase.rpc('get_tasa_cobranza')
            if (error) throw error
            const total = data && data.length > 0 ? data[0].tasa_cobranza : 0
            return Number(total) || 0
        } catch (e) {
            console.error('[financeService.getTasaCobranza]', e)
            return 0
        }
    },

    async getMorosidad(): Promise<{ total_facturas_vencidas: number, monto_vencido: number }> {
        const supabase = createClient()
        try {
            const { data, error } = await supabase.rpc('get_morosidad').single()
            if (error) throw error
            return {
                total_facturas_vencidas: Number((data as any)?.total_facturas_vencidas || 0),
                monto_vencido: Number((data as any)?.monto_vencido || 0)
            }
        } catch (e) {
            console.error('[financeService.getMorosidad]', e)
            return { total_facturas_vencidas: 0, monto_vencido: 0 }
        }
    },

    async getIncomeSummary(): Promise<Array<{ month: string, total_facturado: number, total_cobrado: number }>> {
        const supabase = createClient()
        try {
            const { data, error } = await supabase.rpc('get_income_summary_6_months')
            if (error) throw error
            return data?.map((item: any) => ({
                month: item.month,
                total_facturado: Number(item.total_facturado || 0),
                total_cobrado: Number(item.total_cobrado || 0)
            })) || []
        } catch (e) {
            console.error('[financeService.getIncomeSummary]', e)
            return []
        }
    },

    async getIncomeSummaryYear(condominiumId?: string): Promise<Array<{ month: string, total_cobrado: number, total_pendiente: number }>> {
        const supabase = createClient()
        try {
            const { data, error } = await supabase.rpc('get_income_summary_year', { p_condominium_id: condominiumId || null })
            if (error) throw error
            return data?.map((item: any) => ({
                month: item.month,
                total_cobrado: Number(item.total_cobrado || 0),
                total_pendiente: Number(item.total_pendiente || 0)
            })) || []
        } catch (e) {
            console.error('[financeService.getIncomeSummaryYear]', e)
            return []
        }
    },

    // ── DASHBOARD ANALYTICS (uses financial_dashboard_v + resident_invoices) ──
    async getDashboardAnalytics(organizationId: string, condominiumId?: string) {
        const supabase = createClient()
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        // 1. Fetch invoices from resident_invoices
        let invoiceQuery = supabase
            .from('resident_invoices')
            .select(`
                *,
                condominium_id,
                resident_id,
                condominiums (name),
                residents (
                    first_name,
                    last_name,
                    unit_id,
                    units (unit_number, condominium_id)
                )
            `)

        if (condominiumId && condominiumId !== 'all' && !condominiumId.startsWith('demo-')) {
            invoiceQuery = invoiceQuery.eq('condominium_id', condominiumId)
        } else {
            invoiceQuery = invoiceQuery.eq('organization_id', organizationId)
        }

        const { data: invoices } = await invoiceQuery

        // 2. Fetch Units for Expected Income and Deadlines
        let unitsQuery = supabase
            .from('units')
            .select('id, condominium_id, unit_number, monto_mensual, payment_deadline')

        if (condominiumId && condominiumId !== 'all' && !condominiumId.startsWith('demo-')) {
            unitsQuery = unitsQuery.eq('condominium_id', condominiumId)
        } else {
            unitsQuery = unitsQuery.eq('organization_id', organizationId)
        }
        const { data: units } = await unitsQuery

        // 3. Fetch Activity Data
        let residents: any[] = []
        let tickets: any[] = []
        let expenses: any[] = []

        try {
            let residentsQuery = supabase
                .from('residents')
                .select('*, condominiums(name), units(unit_number)')
                .order('created_at', { ascending: false })
                .limit(5)
            if (condominiumId && condominiumId !== 'all') residentsQuery = residentsQuery.eq('condominium_id', condominiumId)
            else residentsQuery = residentsQuery.eq('organization_id', organizationId)
            const { data } = await residentsQuery
            residents = data || []
        } catch (e) { console.error('Error fetching residents for activity:', e) }

        try {
            let ticketsQuery = supabase
                .from('tickets')
                .select('*, condominiums(name), units(unit_number)')
                .order('created_at', { ascending: false })
                .limit(5)
            if (condominiumId && condominiumId !== 'all') ticketsQuery = ticketsQuery.eq('condominium_id', condominiumId)
            const { data } = await ticketsQuery
            tickets = data || []
        } catch (e) { console.error('Error fetching tickets for activity:', e) }

        try {
            let expensesQuery = supabase
                .from('condo_expenses')
                .select('*, condominiums(name)')
                .order('created_at', { ascending: false })
                .limit(5)
            if (condominiumId && condominiumId !== 'all') expensesQuery = expensesQuery.eq('condominium_id', condominiumId)
            else expensesQuery = expensesQuery.eq('organization_id', organizationId)
            const { data } = await expensesQuery
            expenses = data || []
        } catch (e) { console.error('Error fetching expenses for activity:', e) }

        // CALCULATIONS
        const stats = {
            ingresosTotales: 0,
            ingresosTotalesAnterior: 0,
            deudaTotal: 0,
            tasaCobranza: 0,
            morosidadCount: 0,
            morosidadMonto: 0,
            incomeSummary: [] as any[],
            recentActivity: [] as any[]
        }

        const expectedMonthly = (units || []).reduce((sum, u) => sum + (Number(u.monto_mensual) || 0), 0)
        const monthlyData: Record<string, { cobrado: number, pendiente: number }> = {}
        const todayDay = now.getDate()

        // Build unit paid map from resident_invoices
        const unitPaidMap: Record<string, number> = {}
        ;(invoices || []).forEach((inv: any) => {
            const invDate = new Date(inv.created_at)
            if (inv.status === 'paid' && invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
                const unitId = inv.residents?.unit_id
                if (unitId) {
                    unitPaidMap[unitId] = (unitPaidMap[unitId] || 0) + inv.amount
                }
            }
        })

        const condoData: Record<string, {
            expected: number, collected: number,
            currentMonthMorosidad: number, historicalMorosidad: number,
            overdueUnits: number, unitCount: number
        }> = {}

        // Process units
        ;(units || []).forEach((u: any) => {
            const cId = u.condominium_id || 'org_total'
            if (!condoData[cId]) condoData[cId] = { expected: 0, collected: 0, currentMonthMorosidad: 0, historicalMorosidad: 0, overdueUnits: 0, unitCount: 0 }

            const quota = Number(u.monto_mensual) || 0
            const paidThisMonth = unitPaidMap[u.id] || 0
            condoData[cId].expected += quota
            condoData[cId].collected += paidThisMonth
            condoData[cId].unitCount += 1

            if (todayDay > (u.payment_deadline || 10) && paidThisMonth < quota) {
                condoData[cId].currentMonthMorosidad += (quota - paidThisMonth)
                condoData[cId].overdueUnits += 1
            }
        })

        // Process resident_invoices for historical debt
        ;(invoices || []).forEach((inv: any) => {
            const cId = inv.condominium_id || 'org_total'
            if (!condoData[cId]) condoData[cId] = { expected: 0, collected: 0, currentMonthMorosidad: 0, historicalMorosidad: 0, overdueUnits: 0, unitCount: 0 }

            const invDate = new Date(inv.created_at)
            const isHistorical = (invDate.getFullYear() < currentYear) ||
                (invDate.getFullYear() === currentYear && invDate.getMonth() < currentMonth)

            if ((inv.status === 'overdue' || inv.status === 'pending') && isHistorical) {
                condoData[cId].historicalMorosidad += (inv.balance_due ?? inv.amount)
            }
        })

        // Consolidate totals
        let finalIngresos = 0
        let finalMorosidad = 0
        let finalDeuda = 0
        let finalMorososCount = 0

        const activeCondoIds = (condominiumId && condominiumId !== 'all')
            ? Object.keys(condoData).filter(id => id === condominiumId)
            : Object.keys(condoData).filter(id => condoData[id].expected > 0)

        activeCondoIds.forEach(cId => {
            const d = condoData[cId]
            finalIngresos += d.collected
            const currentOverdue = (todayDay > 10) ? d.currentMonthMorosidad : 0
            finalMorosidad += d.historicalMorosidad + currentOverdue
            finalDeuda += d.currentMonthMorosidad + d.historicalMorosidad
            finalMorososCount += d.overdueUnits
        })

        stats.ingresosTotales = finalIngresos
        stats.morosidadMonto = finalMorosidad
        stats.deudaTotal = finalDeuda
        stats.morosidadCount = finalMorososCount
        stats.tasaCobranza = expectedMonthly > 0 ? (finalIngresos / expectedMonthly) * 100 : 0

        // Format Income Summary (12 months)
        const last12Months = []
        for (let i = 11; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1)
            const key = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
            let total_cobrado = monthlyData[key]?.cobrado || 0
            let total_pendiente = monthlyData[key]?.pendiente || 0
            if (i === 0) {
                total_cobrado = stats.ingresosTotales
                total_pendiente = stats.morosidadMonto
            }
            last12Months.push({ month: key, total_cobrado, total_pendiente })
        }
        stats.incomeSummary = last12Months

        // Build Activity Feed
        const aiInvoices = (invoices || [])
            .filter((inv: any) => inv.status === 'paid' || inv.status === 'overdue')
            .map((inv: any) => ({
                id: `inv_${inv.id}`,
                type: inv.status === 'paid' ? 'payment' : 'overdue',
                title: inv.status === 'paid' ? `Pago recibido` : `Pago vencido`,
                subtitle: `${inv.condominiums?.name || ''} - ${inv.residents?.units?.unit_number || ''}`,
                amount: inv.amount,
                date: new Date(inv.updated_at || inv.created_at),
                status: inv.status
            }))

        const aiTickets = (tickets || []).map((t: any) => ({
            id: `tkt_${t.id}`,
            type: 'incident',
            title: `Nueva incidencia: ${t.title}`,
            subtitle: `${t.condominiums?.name || ''} - ${t.units?.unit_number || ''}`,
            date: new Date(t.created_at),
            status: t.status
        }))

        const aiResidents = (residents || []).map((r: any) => ({
            id: `res_${r.id}`,
            type: 'resident',
            title: `Nuevo residente: ${r.first_name} ${r.last_name}`,
            subtitle: `${r.condominiums?.name || ''} - ${r.units?.unit_number || ''}`,
            date: new Date(r.created_at),
            status: 'active'
        }))

        const aiExpenses = (expenses || []).map((e: any) => ({
            id: `exp_${e.id}`,
            type: 'expense',
            title: `Gasto: ${e.description || 'Gasto operativo'}`,
            subtitle: e.condominiums?.name || 'Gastos generales',
            amount: e.amount,
            date: new Date(e.created_at || e.date || new Date()),
            status: 'paid'
        }))

        stats.recentActivity = [...aiInvoices, ...aiTickets, ...aiResidents, ...aiExpenses]
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .slice(0, 10)

        return stats
    }
}
