import { createClient } from '@/utils/supabase/client'
import { Condominium, CreateCondominiumDTO, UpdateCondominiumDTO } from '@/types/properties'

export const propertiesService = {
    async getByOrganization(organizationId: string): Promise<Condominium[]> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('condominiums')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching condominiums by organization (RAW):', error)
            console.error('Error fetching condominiums by organization (STR):', JSON.stringify(error, null, 2))
            throw new Error(`Error al cargar condominios: ${error.message} (${error.code})`)
        }
        return data || []
    },

    async getById(id: string): Promise<Condominium | null> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('condominiums')
            .select('*')
            .eq('id', id)
            .single()

        if (error) return null
        return data
    },

    async create(condo: CreateCondominiumDTO): Promise<Condominium> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('condominiums')
            .insert(condo)
            .select()
            .single()

        if (error) {
            console.error('Error inserting condominium:', error)
            throw new Error(`Error al crear condominio: ${error.message} (${error.code})`)
        }
        return data
    },

    async update(id: string, updates: Partial<UpdateCondominiumDTO>): Promise<Condominium> {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('condominiums')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async deactivate(id: string): Promise<void> {
        const supabase = createClient()
        const { error } = await supabase
            .from('condominiums')
            .update({ status: 'paused' })
            .eq('id', id)

        if (error) throw error
    },

    async delete(id: string): Promise<void> {
        const supabase = createClient()
        const { error } = await supabase
            .from('condominiums')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('Error deleting condominium:', error)
            throw new Error(`Error al eliminar condominio: ${error.message} (${error.code})`)
        }
    }
}
