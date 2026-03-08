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
                    condominium_id: condominiumId,
                    unit_id: 'demo-unit-2',
                    unit_number: 'B-202',
                    amount: 1200,
                    status: 'pending',
                    due_date: new Date(now.getFullYear(), now.getMonth(), 10).toISOString(),
                    created_at: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
                    folio: 'INV-0002',
                },
                {
                    id: 'demo-inv-3',
                    condominium_id: condominiumId,
                    unit_id: 'demo-unit-3',
                    unit_number: 'C-303',
                    amount: 1800,
                    status: 'overdue',
                    due_date: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString(),
                    created_at: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
                    folio: 'INV-0003',
                },
                {
                    id: 'demo-inv-4',
                    condominium_id: condominiumId,
                    unit_id: 'demo-unit-4',
                    unit_number: 'D-404',
                    amount: 2500,
                    status: 'paid',
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

        const { data, error } = await supabase
            .from('invoices')
            .insert({ ...invoice, folio })
            .select()
            .single()

        if (error) throw error
        return data
    },

    async getGlobalInvoices(organizationId: string): Promise<Invoice[]> {
        if (organizationId === 'demo-org-id') {
            const now = new Date()
            const getRelativeDate = (daysAgo: number) => {
                const date = new Date(now)
                date.setDate(date.getDate() - daysAgo)
                return date.toISOString()
            }

            return [
                {
                    id: 'demo-inv-max-1',
                    condominium_id: 'demo-condo-1',
                    condominium_name: 'Torre Altura',
                    unit_number: 'A-101',
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
                units (unit_number)
            `)
            .in('condominium_id', condoIds)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data?.map(inv => ({
            ...inv,
            condominium_name: inv.condominiums?.name,
            unit_number: inv.units?.unit_number
        })) || []
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
        const supabase = createClient()
        const { data, error } = await supabase
            .from('invoices')
            .select(`
                *,
                condominiums (name),
                units (unit_number)
            `)
            .eq('unit_id', unitId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching unit invoices:', error)
            return []
        }

        return data?.map(inv => ({
            ...inv,
            condominium_name: inv.condominiums?.name,
            unit_number: inv.units?.unit_number
        })) || []
    }
}
