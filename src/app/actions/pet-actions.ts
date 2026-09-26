'use server'

import { createAdminClient } from '@/utils/supabase/admin'

const PET_BROADCAST_WEBHOOK_URL = 'https://n8n.inmobigo.mx/webhook/mascotas-broadcast'
const PET_BROADCAST_WEBHOOK_SECRET = '90806e4535968d12ec7c6ade0726e0d4dbb2bb86ab86c934'

export async function createPetServer(payload: {
    organization_id: string
    condominium_id: string
    resident_id: string
    unit_id?: string
    name: string
    species: string
    breed?: string
    color?: string
    size?: string
    photo_url?: string
}) {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('pets')
            .insert({
                organization_id: payload.organization_id,
                condominium_id: payload.condominium_id,
                resident_id: payload.resident_id,
                unit_id: payload.unit_id || null,
                name: payload.name,
                species: payload.species,
                breed: payload.breed || null,
                color: payload.color || null,
                size: payload.size || null,
                photo_url: payload.photo_url || null,
            })
            .select()
            .single()

        if (error) {
            console.error('[createPetServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        await supabase.from('pet_events').insert({
            pet_id: data.id,
            organization_id: payload.organization_id,
            condominium_id: payload.condominium_id,
            action: 'registrada',
            details: `${payload.name} fue registrada.`,
        })

        return { success: true, pet: data }
    } catch (err: any) {
        console.error('[createPetServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function getPetsByResidentServer(residentId: string) {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('pets')
            .select('*')
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getPetsByResidentServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        return { success: true, pets: data || [] }
    } catch (err: any) {
        console.error('[getPetsByResidentServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function getPetsByCondominiumServer(condominiumId: string, excludeResidentId?: string) {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('pets')
            .select('*, residents(first_name, last_name), units(unit_number)')
            .eq('condominium_id', condominiumId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getPetsByCondominiumServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        const mapped = (data || [])
            .filter((p: any) => !excludeResidentId || p.resident_id !== excludeResidentId)
            .map((p: any) => ({
                ...p,
                owner_name: p.residents ? `${p.residents.first_name || ''} ${p.residents.last_name || ''}`.trim() : '',
                unit_number: p.units?.unit_number || null,
            }))

        return { success: true, pets: mapped }
    } catch (err: any) {
        console.error('[getPetsByCondominiumServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function deletePetServer(id: string) {
    try {
        const supabase = createAdminClient()
        const { error } = await supabase.from('pets').delete().eq('id', id)

        if (error) {
            console.error('[deletePetServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        console.error('[deletePetServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

async function notifyPetBroadcast(petId: string, action: 'perdida' | 'encontrada') {
    try {
        await fetch(PET_BROADCAST_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Broadcast-Secret': PET_BROADCAST_WEBHOOK_SECRET },
            body: JSON.stringify({ pet_id: petId, action }),
        })
    } catch (err) {
        console.error('[notifyPetBroadcast] Failed to trigger broadcast:', err)
    }
}

export async function reportPetLostServer(petId: string, notes?: string) {
    try {
        const supabase = createAdminClient()
        const { data: pet, error: fetchError } = await supabase.from('pets').select('*').eq('id', petId).maybeSingle()
        if (fetchError || !pet) {
            return { success: false, error: 'Mascota no encontrada.' }
        }

        const { error } = await supabase
            .from('pets')
            .update({ status: 'perdida', lost_at: new Date().toISOString(), lost_notes: notes || null })
            .eq('id', petId)

        if (error) {
            console.error('[reportPetLostServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        await supabase.from('pet_events').insert({
            pet_id: petId,
            organization_id: pet.organization_id,
            condominium_id: pet.condominium_id,
            action: 'perdida',
            details: notes || `${pet.name} fue reportada como perdida.`,
        })

        await notifyPetBroadcast(petId, 'perdida')

        return { success: true }
    } catch (err: any) {
        console.error('[reportPetLostServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function reportPetFoundServer(petId: string) {
    try {
        const supabase = createAdminClient()
        const { data: pet, error: fetchError } = await supabase.from('pets').select('*').eq('id', petId).maybeSingle()
        if (fetchError || !pet) {
            return { success: false, error: 'Mascota no encontrada.' }
        }

        const { error } = await supabase
            .from('pets')
            .update({ status: 'activa' })
            .eq('id', petId)

        if (error) {
            console.error('[reportPetFoundServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        await supabase.from('pet_events').insert({
            pet_id: petId,
            organization_id: pet.organization_id,
            condominium_id: pet.condominium_id,
            action: 'encontrada',
            details: `${pet.name} fue encontrada.`,
        })

        await notifyPetBroadcast(petId, 'encontrada')

        return { success: true }
    } catch (err: any) {
        console.error('[reportPetFoundServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}
