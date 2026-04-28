import { createClient } from '@/utils/supabase/client'
import { Resident, CreateResidentDTO, UpdateResidentDTO } from '@/types/residents'
import { demoDb } from '@/utils/demo-db'

export const residentsService = {
    async getByCondominium(condominiumId: string): Promise<Resident[]> {
        if (condominiumId.startsWith('demo-')) {
            const residents = demoDb.getResidents(condominiumId)
            const units = demoDb.getUnits(condominiumId)
            try {
                const fs = require('fs')
                const path = require('path')
                const filePath = path.join(process.cwd(), 'src', 'data', 'payment-validations.json')
                if (fs.existsSync(filePath)) {
                    const fileData = fs.readFileSync(filePath, 'utf8')
                    const validations = JSON.parse(fileData)
                    
                    return residents.map(r => {
                        const unitNum = units.find(u => u.id === r.unit_id)?.unit_number
                        const approved = validations.filter((v: any) => v.status === 'aprobado' && v.unit === unitNum)
                        const totalApproved = approved.reduce((sum: number, v: any) => sum + v.amount, 0)
                        const newDebt = Math.max(0, Number(r.debt_amount || 0) - totalApproved)
                        
                        return {
                            ...r,
                            debt_amount: newDebt,
                            unit_number: unitNum
                        }
                    })
                }
            } catch (e) {
                console.error('[residentsService.getByCondominium] error parsing validations:', e)
            }
            
            return residents.map(r => ({
                ...r,
                unit_number: units.find(u => u.id === r.unit_id)?.unit_number
            }))
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('residents')
            .select(`
        *,
        units (
          unit_number
        ),
        vehicles (*)
      `)
            .eq('condominium_id', condominiumId)
            .order('first_name', { ascending: true })

        if (error) throw error

        // Transform to flatten unit_number if needed
        return data?.map(r => ({
            ...r,
            unit_number: r.units?.unit_number
        })) || []
    },

    async getByCondominiums(condominiumIds: string[]): Promise<Resident[]> {
        if (condominiumIds.length === 0) return []
        const supabase = createClient()
        const { data, error } = await supabase
            .from('residents')
            .select(`
        *,
        units (
          unit_number
        ),
        vehicles (*)
      `)
            .in('condominium_id', condominiumIds)
            .order('first_name', { ascending: true })

        if (error) throw error

        return data?.map(r => ({
            ...r,
            unit_number: r.units?.unit_number
        })) || []
    },

    async getById(id: string): Promise<Resident | null> {
        if (id.startsWith('demo-')) {
            const residents = demoDb.getResidents()
            const resident = residents.find(r => r.id === id)
            if (!resident) return null
            const unit = demoDb.getUnits().find(u => u.id === resident.unit_id)
            try {
                const fs = require('fs')
                const path = require('path')
                const filePath = path.join(process.cwd(), 'src', 'data', 'payment-validations.json')
                if (fs.existsSync(filePath)) {
                    const fileData = fs.readFileSync(filePath, 'utf8')
                    const validations = JSON.parse(fileData)
                    
                    const approved = validations.filter((v: any) => v.status === 'aprobado' && v.unit === unit?.unit_number)
                    const totalApproved = approved.reduce((sum: number, v: any) => sum + v.amount, 0)
                    
                    const newDebt = Math.max(0, Number(resident.debt_amount || 0) - totalApproved)
                    
                    return {
                        ...resident,
                        debt_amount: newDebt,
                        unit_number: unit?.unit_number
                    }
                }
            } catch (e) {
                console.error('[residentsService.getById] error parsing validations:', e)
            }
            
            return {
                ...resident,
                unit_number: unit?.unit_number
            }
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('residents')
            .select(`
        *,
        units (
          unit_number
        ),
        vehicles (*)
      `)
            .eq('id', id)
            .single()

        if (error) {
            console.error('Error fetching resident:', error)
            return null
        }

        return {
            ...data,
            unit_number: data.units?.unit_number
        }
    },

    async create(resident: CreateResidentDTO): Promise<Resident> {
        if (resident.condominium_id.startsWith('demo-')) {
            const newResident: Resident = {
                id: `demo-res-${Math.random().toString(36).substr(2, 9)}`,
                ...resident,
                created_at: new Date().toISOString()
            }
            demoDb.saveResident(newResident)
            return newResident
        }
        const supabase = createClient()
        // ... existing implementation ...
        const { vehicles, ...residentData } = resident
        const { data: newResident, error: residentError } = await supabase
            .from('residents')
            .insert(residentData)
            .select()
            .single()

        if (residentError) throw residentError

        if (vehicles && vehicles.length > 0) {
            const vehicleInserts = vehicles.map(v => ({
                resident_id: newResident.id,
                plate: v.plate,
                brand: v.brand,
                color: v.color
            }))
            await supabase.from('vehicles').insert(vehicleInserts)
        }

        // Automatic Invoice Creation for Initial Balance (Saldo Inicial)
        if (newResident.debt_amount && newResident.debt_amount > 0) {
            // First, get the correct organization_id for this condominium
            const { data: condo } = await supabase
                .from('condominiums')
                .select('organization_id')
                .eq('id', newResident.condominium_id)
                .single()

            const orgId = condo?.organization_id

            if (orgId) {
                const folio = `INV-${Date.now().toString().slice(-6)}`
                const invoicePayload = {
                    organization_id: orgId,
                    condominium_id: newResident.condominium_id,
                    resident_id: newResident.id,
                    unit_id: newResident.unit_id || null, // Handle optionally empty string vs null
                    amount: newResident.debt_amount,
                    paid_amount: 0,
                    balance_due: newResident.debt_amount,
                    status: 'pending',
                    description: 'Saldo inicial',
                    due_date: new Date().toISOString(),
                    folio
                }

                const { error: invoiceError } = await supabase
                    .from('invoices')
                    .insert(invoicePayload)

                if (invoiceError) {
                    console.error('Error creating initial balance invoice:', invoiceError)
                }
            }
        }

        return newResident
    },

    async update(id: string, updates: UpdateResidentDTO): Promise<Resident> {
        if (id.startsWith('demo-')) {
            const residents = demoDb.getResidents()
            const existing = residents.find(r => r.id === id)
            const updated = { ...existing, ...updates } as Resident
            demoDb.saveResident(updated)
            return updated
        }
        const supabase = createClient()
        const { data, error } = await supabase
            .from('residents')
            .update(updates)
            .eq('id', id)
            .select()
            .single()

        if (error) throw error
        return data
    },

    async delete(id: string): Promise<void> {
        if (id.startsWith('demo-')) {
            demoDb.deleteResident(id)
            return
        }
        const supabase = createClient()
        const { error } = await supabase
            .from('residents')
            .delete()
            .eq('id', id)

        if (error) throw error
    },

    async deleteAll(condominiumId: string): Promise<void> {
        if (condominiumId.startsWith('demo-')) {
            const residents = demoDb.getResidents(condominiumId)
            residents.forEach(r => demoDb.deleteResident(r.id))
            return
        }
        const supabase = createClient()
        const { error } = await supabase
            .from('residents')
            .delete()
            .eq('condominium_id', condominiumId)

        if (error) throw error
    },

    async checkPreApproval(email: string): Promise<{ exists: boolean, registered: boolean }> {
        if (email.includes('demo@')) {
            return { exists: true, registered: false }
        }
        
        const supabase = createClient()
        const { data, error } = await supabase
            .from('residents')
            .select('id, is_registered')
            .eq('email', email)
            .maybeSingle()
            
        if (error) {
            console.error('Error checking pre-approval:', error)
            return { exists: false, registered: false }
        }
        
        return {
            exists: !!data,
            registered: data?.is_registered || false
        }
    }
}
