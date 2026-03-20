import { createClient } from '@/utils/supabase/client'
import { Unit, CreateUnitDTO, UpdateUnitDTO } from '@/types/units'
import { demoDb } from '@/utils/demo-db'

export const unitsService = {
    async getByCondominium(condominiumId: string): Promise<Unit[]> {
        if (condominiumId.startsWith('demo-')) {
            return demoDb.getUnits(condominiumId)
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('units')
            .select('*')
            .eq('condominium_id', condominiumId)
            .order('unit_number', { ascending: true })

        if (error) {
            console.error('Error fetching units (RAW):', error)
            console.error('Error fetching units (STR):', JSON.stringify(error, null, 2))
            throw error
        }
        return data || []
    },

    async create(unit: CreateUnitDTO): Promise<Unit> {
        if (unit.condominium_id.startsWith('demo-')) {
            if (existingUnits.length >= 5) {
                throw new Error('Has alcanzado el límite de unidades en el modo demostración. Para administrar más de 5 unidades, te invitamos a crear un condominio real desde tu panel principal.')
            }

            const newUnit: Unit = {
                id: `demo-unit-${Math.random().toString(36).substr(2, 9)}`,
                ...unit,
                created_at: new Date().toISOString()
            }
            demoDb.saveUnit(newUnit)
            return newUnit
        }
        
        const supabase = createClient()
        
        // 1. Get organization_id for this condominium
        const { data: condo, error: condoError } = await supabase
            .from('condominiums')
            .select('organization_id')
            .eq('id', unit.condominium_id)
            .single()
            
        if (condoError || !condo) {
            throw new Error('No se pudo verificar el condominio.')
        }
        
        const organizationId = condo.organization_id

        // 2. Get active subscription limit
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('unit_limit')
            .eq('organization_id', organizationId)
            .eq('subscription_status', 'active')
            .maybeSingle()
            
        // Default to a base limit if no active subscription is found (e.g. Free/Base limit)
        const limit = subscription?.unit_limit || 10

        // 3. Count total active units across ALL condominiums in the organization
        // We first need to get all condominium IDs for this organization
        const { data: allCondos } = await supabase
            .from('condominiums')
            .select('id')
            .eq('organization_id', organizationId)
            
        const condoIds = allCondos?.map(c => c.id) || []
        
        if (condoIds.length > 0) {
            const { count, error: countError } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .in('condominium_id', condoIds)
                
            if (countError) {
                console.error('Error counting units:', countError)
            } else if (count !== null && count >= limit) {
                throw new Error(`Has alcanzado el máximo de unidades permitidas (${limit}) de acuerdo a tu plan actual. Para seguir creciendo, te invitamos a mejorar tu suscripción.`)
            }
        }

        // 4. Proceed with creation
        const { data, error } = await supabase
            .from('units')
            .insert(unit)
            .select()
            .single()

        if (error) {
            console.error('Error creating unit (RAW):', error)
            console.error('Error creating unit (STR):', JSON.stringify(error, null, 2))
            throw error
        }
        return data
    },

    async bulkCreate(units: CreateUnitDTO[]): Promise<Unit[]> {
        if (!units || units.length === 0) return []

        if (units[0].condominium_id.startsWith('demo-')) {
            const existingUnits = demoDb.getUnits(units[0].condominium_id)
            if (existingUnits.length + units.length > 5) {
                throw new Error(`Atención: Estás intentando registrar ${units.length} unidades y ya cuentas con ${existingUnits.length}. El límite en modo demostración es de 5. Crea un condominio real para poder agregar más propiedades.`)
            }

            const newUnits: Unit[] = units.map(u => ({
                id: `demo-unit-${Math.random().toString(36).substr(2, 9)}`,
                ...u,
                created_at: new Date().toISOString()
            }))
            newUnits.forEach(u => demoDb.saveUnit(u))
            return newUnits
        }

        const supabase = createClient()

        // 1. Get organization_id for these units (assuming all go to the same condo/org for bulk upload)
        const targetCondoId = units[0].condominium_id
        const { data: condo, error: condoError } = await supabase
            .from('condominiums')
            .select('organization_id')
            .eq('id', targetCondoId)
            .single()

        if (condoError || !condo) {
            throw new Error('No se pudo verificar el condominio para la carga masiva.')
        }

        const organizationId = condo.organization_id

        // 2. Get active subscription limit
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('unit_limit')
            .eq('organization_id', organizationId)
            .eq('subscription_status', 'active')
            .maybeSingle()

        const limit = subscription?.unit_limit || 10

        // 3. Count total active units across ALL condominiums in the organization
        const { data: allCondos } = await supabase
            .from('condominiums')
            .select('id')
            .eq('organization_id', organizationId)

        const condoIds = allCondos?.map(c => c.id) || []
        let currentCount = 0

        if (condoIds.length > 0) {
            const { count, error: countError } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .in('condominium_id', condoIds)

            if (countError) {
                console.error('Error counting units for bulk upload:', countError)
            } else if (count !== null) {
                currentCount = count
            }
        }

        // 4. Validate limit against incoming array size
        if (currentCount + units.length > limit) {
             throw new Error(`No es posible procesar ${units.length} unidades adicionales. Tu plan actual cubre un máximo de ${limit} unidades y ya registras ${currentCount}. Te invitamos a mejorar tu suscripción para ampliar tu capacidad.`)
        }

        // 5. Proceed with bulk insert
        const { data, error } = await supabase
            .from('units')
            .insert(units)
            .select()

        if (error) {
            console.error('Error in bulkCreate (RAW):', error)
            throw error
        }

        return data || []
    },

    async update(id: string, updates: UpdateUnitDTO): Promise<Unit> {
        if (id.startsWith('demo-')) {
            const units = demoDb.getUnits()
            const existing = units.find(u => u.id === id)
            const updated = { ...existing, ...updates } as Unit
            demoDb.saveUnit(updated)
            return updated
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('units')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string): Promise<void> {
        if (id.startsWith('demo-')) {
            demoDb.deleteUnit(id)
            return
        }
        const supabase = createClient()
        const { error } = await supabase
            .from('units')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async deleteAll(condominiumId: string): Promise<void> {
        if (condominiumId.startsWith('demo-')) {
            const units = demoDb.getUnits(condominiumId)
            units.forEach(u => demoDb.deleteUnit(u.id))
            return
        }
        const supabase = createClient()
        const { error } = await supabase
            .from('units')
            .delete()
            .eq('condominium_id', condominiumId)

        if (error) throw error
    }
}
