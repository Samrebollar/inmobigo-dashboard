import { createClient } from '@/utils/supabase/client'
import { Condominium, CreateCondominiumDTO, UpdateCondominiumDTO } from '@/types/properties'

export const propertiesService = {
    async getByOrganization(organizationId: string): Promise<any[]> {
        if (organizationId?.startsWith('demo-')) {
            const { demoDb } = await import('@/utils/demo-db')
            return demoDb.getProperties()
        }
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

    async getSettings(condominiumId: string): Promise<any> {
        // Skip DB query for demo properties
        if (condominiumId.startsWith('demo-')) {
            return null
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('settings_condominio')
            .select('*')
            .eq('condominio_id', condominiumId)
            .single()

        if (error) {
            // PGRST116: No rows found (Expected if no settings yet)
            // 42P01: Table does not exist (Expected in some environments)
            if (error.code === 'PGRST116' || error.code === '42P01') {
                return null
            }
            console.error('Error fetching settings_condominio:', error.message || error.code || error)
            return null
        }
        return data
    },

    async updateSettings(condominiumId: string, settings: any): Promise<void> {
        if (condominiumId.startsWith('demo-')) return
        const supabase = createClient()
        const { error } = await supabase
            .from('settings_condominio')
            .upsert({ 
                condominio_id: condominiumId,
                ...settings 
            }, { onConflict: 'condominio_id' })

        if (error) {
            console.error('Error updating settings_condominio:', error)
            throw new Error(`Error al guardar configuración: ${error.message} (${error.code})`)
        }
    },

    async update(id: string, updates: Partial<UpdateCondominiumDTO>): Promise<Condominium> {
        if (id.startsWith('demo-')) return updates as any
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
        if (id.startsWith('demo-')) return
        const supabase = createClient()
        const { error } = await supabase
            .from('condominiums')
            .update({ status: 'paused' })
            .eq('id', id)

        if (error) throw error
    },

    async delete(id: string): Promise<void> {
        if (id.startsWith('demo-')) return
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
