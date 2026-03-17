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
                units (unit_number)
            `)
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[maintenanceService.getByOrganization] db error:', error)
            throw error
        }

        // We can't join directly to residents sometimes due to schema issues, so let's fetch profiles manually or omit
        return data?.map(t => ({
            ...t,
            condominium_name: t.condominiums?.name || 'N/A',
            unit_number: t.units?.unit_number || 'N/A',
            resident_name: 'Residente' // Fallback for now to prevent app crash
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
        const { data, error } = await supabase
            .from('tickets')
            .insert(ticket)
            .select()
            .single()

        if (error) throw error
        return data
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
