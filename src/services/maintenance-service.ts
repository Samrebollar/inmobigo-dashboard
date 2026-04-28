import { createClient } from '@/utils/supabase/client'
import { Ticket, CreateTicketDTO, UpdateTicketDTO } from '@/types/tickets'

export const maintenanceService = {
    async getByOrganization(organizationId: string): Promise<Ticket[]> {
        const supabase = createClient()
        // Fetch tickets
        const { data, error } = await supabase
            .from('tickets')
            .select(`
                *,
                condominiums (name),
                units (unit_number),
                residents (first_name, last_name)
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[maintenanceService.getByOrganization] db error:', error)
            throw error
        }

        return data?.map((t: any) => ({
            ...t,
            condominium_name: t.condominiums?.name || 'N/A',
            unit_number: t.units?.unit_number || 'N/A',
            resident_name: t.residents ? `${t.residents.first_name} ${t.residents.last_name || ''}`.trim() : 'Clara Licona'
        })) || []
    },

    async getByResident(residentId: string): Promise<Ticket[]> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('tickets')
            .select(`
                *,
                condominiums (name),
                units (unit_number)
            `)
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false })

        if (error) throw error

        return data?.map(t => ({
            ...t,
            condominium_name: t.condominiums?.name,
            unit_number: t.units?.unit_number
        })) || []
    },

    async create(ticket: CreateTicketDTO): Promise<Ticket> {
        const supabase = createClient()
        console.log('[maintenanceService.create] Payload:', ticket)
        
        const { data, error } = await supabase
            .from('tickets')
            .insert(ticket)
            .select()

        if (error) {
            console.error('[maintenanceService.create] DB ERROR:', error)
            throw error
        }
        
        if (!data || data.length === 0) {
            console.warn('[maintenanceService.create] No data returned from insert (likely RLS). Re-fetching or returning fallback.')
            return ticket as any
        }
        
        return data[0]
    },

    async update(id: string, updates: UpdateTicketDTO): Promise<Ticket> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    }
}
