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
            const newUnit: Unit = {
                id: `demo-unit-${Math.random().toString(36).substr(2, 9)}`,
                ...unit,
                created_at: new Date().toISOString()
            }
            demoDb.saveUnit(newUnit)
            return newUnit
        }
        const supabase = createClient()
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
