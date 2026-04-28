'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
    if (!supabaseServiceKey) {
        return { success: false, error: 'Falta la SERVICE_ROLE_KEY en el servidor.' }
    }

    try {
        const supabase = createAdminClient(supabaseUrl, supabaseServiceKey)
        
        console.log('[createMaintenanceTicketServer] Bypass RLS via Admin Client. Payload:', payload)

        const { data, error } = await supabase
            .from('tickets')
            .insert({
                organization_id: payload.organization_id,
                condominium_id: payload.condominium_id,
                unit_id: payload.unit_id || null,
                resident_id: payload.resident_id || null,
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
