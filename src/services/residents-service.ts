import { createClient } from '@/utils/supabase/client'
import { Resident, CreateResidentDTO, UpdateResidentDTO } from '@/types/residents'
import { demoDb } from '@/utils/demo-db'

export const residentsService = {
    async getByCondominium(condominiumId: string): Promise<Resident[]> {
        if (condominiumId.startsWith('demo-')) {
            const residents = demoDb.getResidents(condominiumId)
            const units = demoDb.getUnits(condominiumId)
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
            const existing = demoDb.getResidents(resident.condominium_id)
            if (resident.phone) {
                const dup = existing.find(r => r.phone === resident.phone)
                if (dup) {
                    throw new Error(`Duplicado: El teléfono ${resident.phone} ya está registrado para el residente ${dup.first_name} ${dup.last_name}.`)
                }
            }
            if (resident.email) {
                const dup = existing.find(r => r.email.toLowerCase() === resident.email.toLowerCase())
                if (dup) {
                    throw new Error(`Duplicado: El correo ${resident.email} ya está registrado para el residente ${dup.first_name} ${dup.last_name}.`)
                }
            }
            const residentId = `demo-res-${Math.random().toString(36).substr(2, 9)}`
            const newResident: Resident = {
                id: residentId,
                ...resident,
                debt_amount: resident.debt_amount ?? 0,
                vehicles: resident.vehicles?.map((v, i) => ({
                    id: `demo-veh-${i}-${Math.random().toString(36).substr(2, 9)}`,
                    resident_id: residentId,
                    plate: v.plate,
                    brand: v.brand,
                    color: v.color
                })),
                created_at: new Date().toISOString()
            }
            demoDb.saveResident(newResident)
            return newResident
        }
        const supabase = createClient()

        // 0. Verify duplicates by email in same condo
        if (resident.email) {
            const { data: existingEmail } = await supabase
                .from('residents')
                .select('first_name, last_name, units(unit_number)')
                .eq('condominium_id', resident.condominium_id)
                .eq('email', resident.email.trim().toLowerCase())
                .maybeSingle()

            if (existingEmail) {
                const name = `${existingEmail.first_name} ${existingEmail.last_name}`;
                const unit = (existingEmail as any).units?.unit_number || 'sin asignar';
                throw new Error(`Duplicado: El correo ${resident.email} ya está registrado para el residente ${name} en la unidad ${unit}.`)
            }
        }

        // 1. Verify duplicates by phone in same condo
        if (resident.phone) {
            const { data: existingPhone } = await supabase
                .from('residents')
                .select('first_name, last_name, units(unit_number)')
                .eq('condominium_id', resident.condominium_id)
                .eq('phone', resident.phone)
                .maybeSingle()

            if (existingPhone) {
                const name = `${existingPhone.first_name} ${existingPhone.last_name}`;
                const unit = (existingPhone as any).units?.unit_number || 'sin asignar';
                throw new Error(`Duplicado: El teléfono ${resident.phone} ya está registrado para el residente ${name} en la unidad ${unit}.`)
            }
        }

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
        // Uses resident_invoices (new financial architecture)
        if (newResident.debt_amount && newResident.debt_amount > 0) {
            // Get the correct organization_id for this condominium
            const { data: condo } = await supabase
                .from('condominiums')
                .select('organization_id')
                .eq('id', newResident.condominium_id)
                .single()

            const orgId = condo?.organization_id

            if (orgId) {
                const invoicePayload = {
                    organization_id: orgId,
                    condominium_id: newResident.condominium_id,
                    resident_id: newResident.id,
                    amount: newResident.debt_amount,
                    balance_due: newResident.debt_amount,
                    status: 'pending',
                    invoice_type: 'initial_balance',
                    description: 'Saldo inicial',
                    due_date: new Date().toISOString(),
                }

                const { error: invoiceError } = await supabase
                    .from('resident_invoices')
                    .insert(invoicePayload)

                if (invoiceError) {
                    console.error('Error creating initial balance invoice in resident_invoices:', invoiceError)
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
