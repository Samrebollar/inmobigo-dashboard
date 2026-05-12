import { createClient } from '@/utils/supabase/client'
import { Invoice, CreateInvoiceDTO, FinancialSummary } from '@/types/finance'

export const financeService = {
    async getByCondominium(condominiumId: string): Promise<Invoice[]> {
        if (condominiumId.startsWith('demo-')) {
            // Check if we have demo invoices
            // For now, let's return some high-quality mock data so the charts look good
            const now = new Date()
            const mockInvoices: Invoice[] = [
                {
                    id: 'demo-inv-1',
                    organization_id: 'demo-org',
                    condominium_id: condominiumId,
                    unit_id: 'demo-unit-1',
                    unit_number: '101',
                    amount: 1500,
                    status: 'paid',
                    description: 'Cuota de mantenimiento',
                    due_date: now.toISOString(),
                    created_at: now.toISOString(),
                    folio: 'INV-0001'
                },
                {
                    id: 'demo-inv-2',
                    organization_id: 'demo-org',
                    condominium_id: condominiumId,
                    unit_id: 'demo-unit-2',
                    unit_number: 'B-202',
                    amount: 1200,
                    status: 'pending',
                    description: 'Cuota de mantenimiento',
                    due_date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
                    created_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
                    folio: 'INV-0002',
                },
                {
                    id: 'demo-inv-3',
                    organization_id: 'demo-org',
                    condominium_id: condominiumId,
                    unit_id: 'demo-unit-3',
                    unit_number: 'C-303',
                    amount: 1800,
                    status: 'overdue',
                    description: 'Cuota de mantenimiento',
                    due_date: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
                    created_at: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
                    folio: 'INV-0003',
                },
                {
                    id: 'demo-inv-4',
                    organization_id: 'demo-org',
                    condominium_id: condominiumId,
                    unit_id: 'demo-unit-4',
                    unit_number: 'D-404',
                    amount: 2500,
                    status: 'paid',
                    description: 'Cuota de mantenimiento',
                    due_date: new Date(now.getFullYear(), now.getMonth() - 1, 5).toISOString(),
                    created_at: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
                    folio: 'INV-0004',
                    type: 'reserve_fund'
                }
            ]
            return mockInvoices
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('invoices')
            .select(`
        *,
        units (
          unit_number
        )
      `)
            .eq('condominium_id', condominiumId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data?.map(inv => ({
            ...inv,
            unit_number: inv.units?.unit_number
        })) || []
    },

    async getByCondominiums(condominiumIds: string[]): Promise<Invoice[]> {
        if (condominiumIds.length === 0) return []
        const supabase = createClient()
        const { data, error } = await supabase
            .from('invoices')
            .select(`
        *,
        units (
          unit_number
        )
      `)
            .in('condominium_id', condominiumIds)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data?.map(inv => ({
            ...inv,
            unit_number: inv.units?.unit_number
        })) || []
    },

    async getFinancialSummary(condominiumId: string): Promise<FinancialSummary> {
        const invoices = await this.getByCondominium(condominiumId)

        return invoices.reduce((acc, inv) => {
            acc.total_billed += inv.amount

            if (inv.status === 'paid') {
                acc.total_collected += inv.amount
            } else if (inv.status === 'pending') {
                acc.total_pending += inv.amount
            } else if (inv.status === 'overdue') {
                acc.total_overdue += inv.amount
            }

            return acc
        }, {
            total_billed: 0,
            total_collected: 0,
            total_pending: 0,
            total_overdue: 0
        })
    },

    async create(invoice: CreateInvoiceDTO): Promise<Invoice> {
        if (invoice.condominium_id.startsWith('demo-')) {
            const folio = `INV-DEMO-${Date.now().toString().slice(-4)}`
            const newInvoice: Invoice = {
                id: `demo-inv-${Math.random().toString(36).substr(2, 9)}`,
                ...invoice,
                folio,
                created_at: new Date().toISOString()
            }
            // Optional: Save to demoDb for cross-page persistence
            // demoDb.saveInvoice(newInvoice) 
            return newInvoice
        }
        const supabase = createClient()

        // Generate simple folio if not provided (mock logic, ideally DB function)
        const folio = `INV-${Date.now().toString().slice(-6)}`

        if (!invoice.unit_id) {
            throw new Error('unit_id es obligatorio para crear una factura')
        }

        const { data: residentData, error: residentError } = await supabase
            .from('residents')
            .select('id')
            .eq('unit_id', invoice.unit_id)
            .eq('status', 'active')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        if (residentError) {
            console.error('Error fetching active resident:', residentError.message)
            throw new Error('Error al validar el residente de la unidad')
        }

        if (!residentData?.id) {
            throw new Error('No existe residente activo para esta unidad')
        }

        const assignedResidentId = residentData.id

        console.log(`[Invoice Creation] unit_id: ${invoice.unit_id} | resident_id: ${assignedResidentId} | date: ${new Date().toISOString()}`)

        const payloadToInsert = { 
            ...invoice, 
            folio,
            resident_id: assignedResidentId
        }

        const { data, error } = await supabase
            .from('invoices')
            .insert(payloadToInsert)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async update(id: string, updates: Partial<Invoice>): Promise<Invoice> {
        if (id.startsWith('demo-')) {
            throw new Error('No se pueden editar facturas de demostración.')
        }

        const supabase = createClient()
        const { data, error } = await supabase
            .from('invoices')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('[financeService.update] error:', error)
            throw new Error('Error al actualizar la factura')
        }

        return data
    },

    async delete(id: string): Promise<void> {
        if (id.startsWith('demo-')) {
            throw new Error('No se pueden eliminar facturas de demostración.')
        }

        const supabase = createClient()
        const { error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('[financeService.delete] error:', error)
            throw new Error('Error al eliminar la factura')
        }
    },

    async getGlobalInvoices(organizationId: string): Promise<Invoice[]> {
        if (organizationId === 'demo-org-id') {
            const now = new Date()
            const getRelativeDate = (daysAgo: number) => {
                const date = new Date(now)
                date.setDate(date.getDate() - daysAgo)
                return date.toISOString()
            }

            const demoInvoices = [
                {
                    id: 'demo-inv-max-1',
                    condominium_id: 'demo-condo-1',
                    condominium_name: 'Torre Altura',
                    unit_number: 'A-101',
                    resident_name: 'Juan Pérez',
                    amount: 2500,
                    status: 'paid',
                    due_date: getRelativeDate(5),
                    created_at: getRelativeDate(25),
                    folio: 'INV-2024-001',
                    type: 'maintenance',
                    description: 'Mantenimiento Mensual - Enero'
                },
                {
                    id: 'demo-inv-max-2',
                    condominium_id: 'demo-condo-1',
                    condominium_name: 'Torre Altura',
                    unit_number: 'B-202',
                    resident_name: 'María García',
                    amount: 1800,
                    status: 'pending',
                    due_date: getRelativeDate(-5), // 5 days in future
                    created_at: getRelativeDate(10),
                    folio: 'INV-2024-002',
                    type: 'maintenance',
                    description: 'Mantenimiento Mensual - Febrero'
                },
                {
                    id: 'demo-inv-max-3',
                    condominium_id: 'demo-condo-2',
                    condominium_name: 'Residencial del Valle',
                    unit_number: '14-C',
                    resident_name: 'Carlos Rodríguez',
                    amount: 3200,
                    status: 'overdue',
                    due_date: getRelativeDate(15),
                    created_at: getRelativeDate(45),
                    folio: 'INV-2024-003',
                    type: 'maintenance',
                    description: 'Cuota de Mantenimiento Atrasada'
                },
                {
                    id: 'demo-inv-max-4',
                    condominium_id: 'demo-condo-1',
                    condominium_name: 'Torre Altura',
                    unit_number: 'C-305',
                    resident_name: 'Ana López',
                    amount: 4500,
                    status: 'paid',
                    due_date: getRelativeDate(20),
                    created_at: getRelativeDate(50),
                    folio: 'INV-2024-004',
                    type: 'reserve_fund',
                    description: 'Fondo de Reserva Anual'
                },
                {
                    id: 'demo-inv-max-5',
                    condominium_id: 'demo-condo-2',
                    condominium_name: 'Residencial del Valle',
                    unit_number: '05-B',
                    resident_name: 'Luis Martínez',
                    amount: 1500,
                    status: 'paid',
                    due_date: getRelativeDate(30),
                    created_at: getRelativeDate(60),
                    folio: 'INV-2024-005',
                    type: 'maintenance',
                    description: 'Mantenimiento Mensual'
                },
                {
                    id: 'demo-inv-max-6',
                    condominium_id: 'demo-condo-1',
                    condominium_name: 'Torre Altura',
                    unit_number: 'D-401',
                    amount: 2100,
                    status: 'cancelled',
                    due_date: getRelativeDate(10),
                    created_at: getRelativeDate(30),
                    folio: 'INV-2024-006',
                    type: 'maintenance',
                    description: 'Factura Correctiva (Cancelada)'
                },
                {
                    id: 'demo-inv-max-7',
                    condominium_id: 'demo-condo-3',
                    condominium_name: 'Plaza Comercial Norte',
                    unit_number: 'L-12',
                    amount: 8500,
                    status: 'pending',
                    due_date: getRelativeDate(-2),
                    created_at: getRelativeDate(15),
                    folio: 'INV-2024-007',
                    type: 'maintenance',
                    description: 'Renta Local Comercial'
                },
                {
                    id: 'demo-inv-max-8',
                    condominium_id: 'demo-condo-2',
                    condominium_name: 'Residencial del Valle',
                    unit_number: '12-A',
                    amount: 1800,
                    status: 'paid',
                    due_date: getRelativeDate(40),
                    created_at: getRelativeDate(70),
                    folio: 'INV-2024-008',
                    type: 'maintenance',
                    description: 'Mantenimiento Mensual'
                }
            ]
            return demoInvoices
        }
        const supabase = createClient()

        // 1. Get all active condos for org
        const { data: condos } = await supabase
            .from('condominiums')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('status', 'active')

        const condoIds = condos?.map(c => c.id) || []

        if (condoIds.length === 0) return []

        // 2. Fetch invoices
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                condominiums (name),
                units (
                    unit_number,
                    residents (first_name, last_name)
                ),
                residents (first_name, last_name)
            `)
            .in('condominium_id', condoIds)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data?.map(inv => {
            let res = (inv as any).residents;
            if (!res || (Array.isArray(res) && res.length === 0)) {
                res = inv.units?.residents;
            }
            if (Array.isArray(res) && res.length > 0) res = res[0];

            const rName = res ? `${res.first_name || ''} ${res.last_name || ''}`.trim() : null

            return {
                ...inv,
                condominium_name: inv.condominiums?.name,
                unit_number: inv.units?.unit_number,
                resident_name: rName || null
            }
        }) || []
    },

    async getInvoicesForReport(organizationId: string, condominiumId: string | 'all', startDate: string, endDate: string): Promise<Invoice[]> {
        if (organizationId === 'demo-org-id') {
            // Return some mock data for demo
            return await this.getGlobalInvoices(organizationId)
        }

        const supabase = createClient()
        
        let condoIds: string[] = []
        if (condominiumId && condominiumId !== 'all') {
            condoIds = [condominiumId]
        } else {
            // Fetch all active condos for org
            const { data: condos } = await supabase
                .from('condominiums')
                .select('id')
                .eq('organization_id', organizationId)
                // .eq('status', 'active') // Keep it simple, fetch all org condos
            condoIds = condos?.map(c => c.id) || []
        }

        if (condoIds.length === 0) return []

        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                condominiums (name, logo_url),
                units (
                    unit_number,
                    residents (first_name, last_name)
                ),
                residents (first_name, last_name)
            `)
            .in('condominium_id', condoIds)
            .gte('due_date', startDate)
            .lte('due_date', endDate)
            .order('due_date', { ascending: true })

        if (error) {
            console.error('Error fetching invoices for report:', error)
            throw error
        }

        return data?.map(inv => {
            let res = (inv as any).residents;
            if (!res || (Array.isArray(res) && res.length === 0)) {
                res = inv.units?.residents;
            }
            if (Array.isArray(res) && res.length > 0) res = res[0];

            const rName = res ? `${res.first_name || ''} ${res.last_name || ''}`.trim() : null

            return {
                ...inv,
                condominium_name: inv.condominiums?.name,
                condominium_logo_url: inv.condominiums?.logo_url,
                unit_number: inv.units?.unit_number,
                resident_name: rName || null
            }
        }) || []
    },

    async getDelinquentInvoices(organizationId: string, condominiumId: string | 'all'): Promise<Invoice[]> {
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
            .from('invoices')
            .select(`
                *,
                condominiums (name, logo_url),
                units (
                    unit_number,
                    residents (first_name, last_name)
                ),
                residents (first_name, last_name)
            `)
            .in('condominium_id', condoIds)
            .eq('status', 'overdue')
            // No limit or date range padding, getting all historical overdue

        if (error) {
            console.error('Error fetching delinquent invoices:', error)
            throw error
        }

        return data?.map(inv => {
            let res = (inv as any).residents;
            if (!res || (Array.isArray(res) && res.length === 0)) {
                res = inv.units?.residents;
            }
            if (Array.isArray(res) && res.length > 0) res = res[0];

            const rName = res ? `${res.first_name || ''} ${res.last_name || ''}`.trim() : null

            return {
                ...inv,
                condominium_name: inv.condominiums?.name,
                condominium_logo_url: inv.condominiums?.logo_url,
                unit_number: inv.units?.unit_number,
                resident_name: rName || null
            }
        }) || []
    },

    async getInvoiceById(id: string): Promise<Invoice | null> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                condominiums (
                    name,
                    address,
                    logo_url
                ),
                units (
                    unit_number,
                    floor
                )
            `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching invoice:', JSON.stringify(error, null, 2))
            console.error('Error details:', error.message, error.details, error.hint)
            return null
        }

        return {
            ...data,
            condominium_name: data.condominiums?.name,
            condominium_address: data.condominiums?.address,
            condominium_logo_url: data.condominiums?.logo_url,
            unit_number: data.units?.unit_number,
        }
    },

    async getByUnit(unitId: string): Promise<Invoice[]> {
        if (unitId.startsWith('demo-')) {
            const mockInvoices: Invoice[] = [
                {
                    id: 'demo-inv-unit-1',
                    condominium_id: 'demo-condo-1',
                    unit_id: unitId,
                    amount: 2500,
                    status: 'paid',
                    description: 'Mantenimiento Mensual - Enero',
                    due_date: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    folio: 'INV-DEMO-001'
                }
            ]
            
            return mockInvoices
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                condominiums (name),
                units (
                    unit_number,
                    residents (first_name, last_name)
                ),
                residents (first_name, last_name)
            `)
            .eq('unit_id', unitId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching unit invoices:', error)
            return []
        }

        return data?.map(inv => {
            let res = (inv as any).residents;
            if (!res || (Array.isArray(res) && res.length === 0)) {
                res = inv.units?.residents;
            }
            if (Array.isArray(res) && res.length > 0) res = res[0];

            const rName = res ? `${res.first_name || ''} ${res.last_name || ''}`.trim() : null
            
            return {
                ...inv,
                condominium_name: inv.condominiums?.name,
                unit_number: inv.units?.unit_number,
                resident_name: rName || null
            }
        }) || []
    },

    async getByResident(residentId: string): Promise<Invoice[]> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                condominiums (name),
                units (
                    unit_number,
                    residents (first_name, last_name)
                ),
                residents (first_name, last_name)
            `)
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching resident invoices:', error)
            return []
        }

        return data?.map(inv => {
            let res = (inv as any).residents;
            if (!res || (Array.isArray(res) && res.length === 0)) {
                res = inv.units?.residents;
            }
            if (Array.isArray(res) && res.length > 0) res = res[0];

            const rName = res ? `${res.first_name || ''} ${res.last_name || ''}`.trim() : null
            
            return {
                ...inv,
                condominium_name: inv.condominiums?.name,
                unit_number: inv.units?.unit_number,
                resident_name: rName || null
            }
        }) || []
    },

    async getTotalIngresos(): Promise<number> {

        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_total_ingresos')
        
        if (error) {
            console.error('[financeService.getTotalIngresos] error:', error)
            return 0
        }
        
        // El RPC retorna: [{ total_ingresos: number }]
        const total = data && data.length > 0 ? data[0].total_ingresos : 0
        return Number(total) || 0
    },

    async getTasaCobranza(): Promise<number> {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_tasa_cobranza')
        
        if (error) {
            console.error('[financeService.getTasaCobranza] error:', error)
            return 0
        }
        
        const total = data && data.length > 0 ? data[0].tasa_cobranza : 0
        return Number(total) || 0
    },

    async getMorosidad(): Promise<{ total_facturas_vencidas: number, monto_vencido: number }> {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_morosidad').single()
        
        if (error) {
            console.error('[financeService.getMorosidad] error:', error)
            return { total_facturas_vencidas: 0, monto_vencido: 0 }
        }
        
        return {
            total_facturas_vencidas: Number(data?.total_facturas_vencidas || 0),
            monto_vencido: Number(data?.monto_vencido || 0)
        }
    },

    async getIncomeSummary(): Promise<Array<{ month: string, total_facturado: number, total_cobrado: number }>> {
        const supabase = createClient()
        const { data, error } = await supabase.rpc('get_income_summary_6_months')
        
        if (error) {
            console.error('[financeService.getIncomeSummary] error:', error)
            return []
        }
        
        return data?.map((item: any) => ({
            month: item.month,
            total_facturado: Number(item.total_facturado || 0),
            total_cobrado: Number(item.total_cobrado || 0)
        })) || []
    },

    async getIncomeSummaryYear(condominiumId?: string): Promise<Array<{ month: string, total_cobrado: number, total_pendiente: number }>> {
        const supabase = createClient()
        // If condominiumId is not defined, supabase handles it as null which matches our RPC default
        const { data, error } = await supabase.rpc('get_income_summary_year', { p_condominium_id: condominiumId || null })
        
        if (error) {
            console.error('[financeService.getIncomeSummaryYear] error:', error)
            return []
        }
        
        return data?.map((item: any) => ({
            month: item.month,
            total_cobrado: Number(item.total_cobrado || 0),
            total_pendiente: Number(item.total_pendiente || 0)
        })) || []
    },

    async getDashboardAnalytics(organizationId: string, condominiumId?: string) {
        const supabase = createClient()
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        const prevMonthDate = new Date(currentYear, currentMonth - 1, 1)
        const prevMonth = prevMonthDate.getMonth()
        const prevYear = prevMonthDate.getFullYear()

        // 1. Fetch Invoices
        let invoiceQuery = supabase
            .from('invoices')
            .select(`
                *,
                condominium_id,
                unit_id,
                resident_id,
                condominiums (name),
                units (unit_number, condominium_id)
            `)
        
        if (condominiumId && condominiumId !== 'all' && !condominiumId.startsWith('demo-')) {
            invoiceQuery = invoiceQuery.eq('condominium_id', condominiumId)
        } else {
            invoiceQuery = invoiceQuery.eq('organization_id', organizationId)
        }

        const { data: invoices } = await invoiceQuery;

        // 2. Fetch Units for "Expected Income" and Deadlines
        let unitsQuery = supabase.from('units').select('id, condominium_id, unit_number, monto_mensual, payment_deadline, residents(id)')
        if (condominiumId && condominiumId !== 'all' && !condominiumId.startsWith('demo-')) {
            unitsQuery = unitsQuery.eq('condominium_id', condominiumId)
        } else {
            unitsQuery = unitsQuery.eq('organization_id', organizationId)
        }
        const { data: units } = await unitsQuery

        // 3. Fetch Activity Data (Residents, Tickets, Expenses)
        // Wrap in try-catch to avoid total failure if one table has schema issues
        let residents: any[] = []
        let tickets: any[] = []
        let expenses: any[] = []

        try {
            let residentsQuery = supabase.from('residents').select('*, condominiums(name), units(unit_number)').order('created_at', { ascending: false }).limit(5)
            if (condominiumId && condominiumId !== 'all') residentsQuery = residentsQuery.eq('condominium_id', condominiumId)
            else residentsQuery = residentsQuery.eq('organization_id', organizationId)
            const { data } = await residentsQuery
            residents = data || []
        } catch (e) { console.error('Error fetching residents for activity:', e) }

        try {
            let ticketsQuery = supabase.from('tickets').select('*, condominiums(name), units(unit_number)').order('created_at', { ascending: false }).limit(5)
            if (condominiumId && condominiumId !== 'all') ticketsQuery = ticketsQuery.eq('condominium_id', condominiumId)
            const { data } = await ticketsQuery
            tickets = data || []
        } catch (e) { console.error('Error fetching tickets for activity:', e) }

        try {
            // Using 'condo_expenses' instead of 'movements'
            let expensesQuery = supabase.from('condo_expenses').select('*, condominiums(name)').order('created_at', { ascending: false }).limit(5)
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

        const morosos = new Set()
        const monthlyData: Record<string, { cobrado: number, pendiente: number }> = {};

        const todayDay = now.getDate();
        
        // Build a map of unit_id -> total paid this month (handles partial payments correctly)
        const unitPaidMap: Record<string, number> = {};
        (invoices || []).forEach(inv => {
            const invDate = new Date(inv.created_at);
            if (inv.status === 'paid' && invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
                if (inv.unit_id) {
                    unitPaidMap[inv.unit_id] = (unitPaidMap[inv.unit_id] || 0) + inv.amount;
                }
            }
        });

        // 3. CORE CALCULATION ENGINE (CLEAN SLATE)
        const condoData: Record<string, { expected: number, collected: number, currentMonthMorosidad: number, historicalMorosidad: number, overdueUnits: number, unitCount: number }> = {};

        // Initialize and process units
        (units || []).forEach((u: any) => {
            const cId = u.condominium_id || 'org_total';
            if (!condoData[cId]) condoData[cId] = { expected: 0, collected: 0, currentMonthMorosidad: 0, historicalMorosidad: 0, overdueUnits: 0, unitCount: 0 };
            
            const quota = Number(u.monto_mensual) || 0;
            const paidThisMonth = unitPaidMap[u.id] || 0;
            condoData[cId].expected += quota;
            condoData[cId].collected += paidThisMonth;
            condoData[cId].unitCount += 1;

            // If unit paid LESS than quota after deadline -> it's overdue (handles partial payments)
            if (todayDay > (u.payment_deadline || 10) && paidThisMonth < quota) {
                condoData[cId].currentMonthMorosidad += (quota - paidThisMonth);
                condoData[cId].overdueUnits += 1;
            }
        });

        // Process invoices for historical debt only (previous months)
        (invoices || []).forEach(inv => {
            const cId = inv.condominium_id || (inv.units as any)?.condominium_id || 'org_total';
            if (!condoData[cId]) condoData[cId] = { expected: 0, collected: 0, currentMonthMorosidad: 0, historicalMorosidad: 0, overdueUnits: 0, unitCount: 0 };

            const invDate = new Date(inv.created_at);
            const isHistorical = (invDate.getFullYear() < currentYear) || (invDate.getFullYear() === currentYear && invDate.getMonth() < currentMonth);

            if ((inv.status === 'overdue' || inv.status === 'pending') && isHistorical) {
                condoData[cId].historicalMorosidad += (inv.balance_due ?? inv.amount);
            }
        });

        // Consolidate totals
        let finalIngresos = 0;
        let finalMorosidad = 0;
        let finalDeuda = 0;
        let finalMorososCount = 0;

        const activeCondoIds = (condominiumId && condominiumId !== 'all') 
            ? Object.keys(condoData).filter(id => id === condominiumId)
            : Object.keys(condoData).filter(id => condoData[id].expected > 0); // Only condos with active units

        activeCondoIds.forEach(cId => {
            const d = condoData[cId];
            finalIngresos += d.collected;
            
            // currentMonthMorosidad = sum of (quota - paid) for each overdue unit
            // This correctly handles partial payments
            const currentOverdue = (todayDay > 10) ? d.currentMonthMorosidad : 0;
            
            finalMorosidad += d.historicalMorosidad + currentOverdue;
            finalDeuda += d.currentMonthMorosidad + d.historicalMorosidad;
            finalMorososCount += d.overdueUnits;
        });

        stats.ingresosTotales = finalIngresos;
        stats.morosidadMonto = finalMorosidad;
        stats.deudaTotal = finalDeuda;
        stats.morosidadCount = finalMorososCount;
        stats.tasaCobranza = expectedMonthly > 0 ? (finalIngresos / expectedMonthly) * 100 : 0;

        // Format Income Summary
        const last12Months = []
        for (let i = 11; i >= 0; i--) {
            const d = new Date(currentYear, currentMonth - i, 1)
            const key = d.toLocaleDateString('es-MX', { month: 'short', year: '2-digit' })
            
            let total_cobrado = monthlyData[key]?.cobrado || 0
            let total_pendiente = monthlyData[key]?.pendiente || 0
            
            // For current month, sync chart with the KPI cards
            if (i === 0) {
                total_cobrado = stats.ingresosTotales
                total_pendiente = stats.morosidadMonto
            }

            last12Months.push({
                month: key,
                total_cobrado,
                total_pendiente
            })
        }
        stats.incomeSummary = last12Months

        // Build Activity Feed
        const aiInvoices = (invoices || [])
            .filter(inv => inv.status === 'paid' || inv.status === 'overdue')
            .map(inv => ({
                id: `inv_${inv.id}`,
                type: inv.status === 'paid' ? 'payment' : 'overdue',
                title: inv.status === 'paid' ? `Pago recibido` : `Pago vencido`,
                subtitle: `${inv.condominiums?.name || ''} - ${inv.units?.unit_number || ''}`,
                amount: inv.amount,
                date: new Date(inv.updated_at || inv.created_at),
                status: inv.status
            }))

        const aiTickets = (tickets || []).map(t => ({
            id: `tkt_${t.id}`,
            type: 'incident',
            title: `Nueva incidencia: ${t.title}`,
            subtitle: `${t.condominiums?.name || ''} - ${t.units?.unit_number || ''}`,
            date: new Date(t.created_at),
            status: t.status
        }))

        const aiResidents = (residents || []).map(r => ({
            id: `res_${r.id}`,
            type: 'resident',
            title: `Nuevo residente: ${r.first_name} ${r.last_name}`,
            subtitle: `${r.condominiums?.name || ''} - ${r.units?.unit_number || ''}`,
            date: new Date(r.created_at),
            status: 'active'
        }))

        const aiExpenses = (expenses || []).map(e => ({
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
