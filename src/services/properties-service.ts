import { createClient } from '@/utils/supabase/client'
import { Condominium, CreateCondominiumDTO, UpdateCondominiumDTO } from '@/types/properties'

export const propertiesService = {
    async getByOrganization(organizationId: string): Promise<any[]> {
        const supabase = createClient()
        const { data: condos, error } = await supabase
            .from('condominiums')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching condominiums by organization (RAW):', error)
            throw new Error(`Error al cargar condominios: ${error.message} (${error.code})`)
        }

        if (!condos || condos.length === 0) return []

        // Fetch residents linked to these condos to get accurate active counts
        const condoIds = condos.map(c => c.id)
        const { data: residents } = await supabase
            .from('residents')
            .select('id, condominium_id')
            .in('condominium_id', condoIds)

        // Enhance condos with the real residents count
        return condos.map(condo => {
            const residentsCount = residents?.filter(r => r.condominium_id === condo.id).length || 0;
            return {
                ...condo,
                residents_count: residentsCount
            }
        })
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
