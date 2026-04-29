'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function createMaintenanceTicketServer(payload: {
    organization_id: string
    condominium_id: string
    unit_id?: string
    resident_id?: string
    title: string
    description: string
    priority: string
    category: string
    status: string
    images: string[]
}) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
        return { success: false, error: 'Falta la SERVICE_ROLE_KEY en el servidor.' }
    }

    try {
        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)
        
        console.log('[createMaintenanceTicketServer] Bypass RLS via Admin Client. Payload:', payload)

        if (!payload.resident_id) {
            console.error('[createMaintenanceTicketServer] ERROR: resident_id cannot be null')
            return { success: false, error: 'El ID del residente es requerido (resident_id).' }
        }

        const { data, error } = await supabase
            .from('tickets')
            .insert({
                organization_id: payload.organization_id,
                condominium_id: payload.condominium_id,
                unit_id: payload.unit_id || null,
                resident_id: payload.resident_id,
                title: payload.title,
                description: payload.description,
                priority: payload.priority,
                category: payload.category,
                status: payload.status,
                images: payload.images
            })
            .select()

        if (error) {
            console.error('[createMaintenanceTicketServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        console.log('[createMaintenanceTicketServer] Ticket created successfully!', data)
        return { success: true, data: data?.[0] }
    } catch (err: any) {
        console.error('[createMaintenanceTicketServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function getTicketsByResidentServer(residentId: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
        return { success: false, error: 'Falta la SERVICE_ROLE_KEY en el servidor.' }
    }
    try {
        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)
        const { data, error } = await supabase
            .from('tickets')
            .select(`
                *,
                condominiums (name),
                units (unit_number)
            `)
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getTicketsByResidentServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        const mapped = data?.map((t: any) => ({
            ...t,
            condominium_name: t.condominiums?.name,
            unit_number: t.units?.unit_number
        })) || []

        console.log(`[getTicketsByResidentServer] Found ${mapped.length} tickets for resident ${residentId}`)
        return { success: true, tickets: mapped }
    } catch (err: any) {
        console.error('[getTicketsByResidentServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function deleteMaintenanceTicketServer(id: string) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
        return { success: false, error: 'Falta la SERVICE_ROLE_KEY en el servidor.' }
    }
    try {
        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)
        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', id)

        if (error) {
            console.error('[deleteMaintenanceTicketServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        console.log(`[deleteMaintenanceTicketServer] Ticket ${id} deleted successfully.`)
        return { success: true }
    } catch (err: any) {
        console.error('[deleteMaintenanceTicketServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}
