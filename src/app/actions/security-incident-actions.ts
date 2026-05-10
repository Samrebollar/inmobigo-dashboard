'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export type SecurityIncidentPayload = {
    organization_id: string
    condominium_id: string
    title: string
    description: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    location: string
    guard_name: string
    images: string[] // Combined photos and videos
}

export async function createSecurityIncidentAction(payload: SecurityIncidentPayload) {
    const supabase = createAdminClient()
    
    try {
        console.log('--- SERVER ACTION: Creating Security Incident ---')
        
        // Enhance description with guard name and location for persistence
        const enhancedDescription = `[OFICIAL: ${payload.guard_name}] [UBICACIÓN: ${payload.location}]\n\n${payload.description}`

        const { data, error } = await supabase
            .from('tickets')
            .insert({
                organization_id: payload.organization_id,
                condominium_id: payload.condominium_id,
                title: payload.title,
                description: enhancedDescription,
                priority: payload.priority,
                category: 'security',
                status: 'open',
                images: payload.images,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Server Action Error:', error)
            return { 
                success: false, 
                error: error.message || 'Error al guardar la incidencia en la base de datos.' 
            }
        }

        revalidatePath('/seguridad/incidencias')
        
        return { 
            success: true, 
            data 
        }
    } catch (err: any) {
        console.error('Server Action Exception:', err)
        return { 
            success: false, 
            error: err.message || 'Error crítico en el servidor al procesar la incidencia.' 
        }
    }
}

export async function getSecurityIncidentsAction(organizationId: string, condominiumId?: string) {
    if (!organizationId) return { success: false, error: 'ID de organización no proporcionado' }

    const supabase = createAdminClient()

    try {
        let query = supabase
            .from('tickets')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('category', 'security')
            .order('created_at', { ascending: false })

        if (condominiumId) {
            query = query.eq('condominium_id', condominiumId)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching incidents:', error)
            return { success: false, error: error.message }
        }

        // Map back to the UI format
        const mappedData = (data || []).map(t => {
            // Extract guard name and location from description if possible
            const guardMatch = t.description?.match(/\[OFICIAL: (.*?)\]/)
            const locMatch = t.description?.match(/\[UBICACIÓN: (.*?)\]/)
            const cleanDesc = t.description?.replace(/\[OFICIAL: .*?\] \[UBICACIÓN: .*?\]\n\n/, '')

            const images: string[] = t.images || []
            const photoUrls = images.filter(url => url.match(/\.(jpg|jpeg|png|webp|gif|svg)$/i))
            const videoUrls = images.filter(url => url.match(/\.(mp4|webm|ogg|mov)$/i))

            return {
                id: t.id,
                priority: t.priority === 'urgent' ? 'Urgente' : 
                          t.priority === 'high' ? 'Alta' : 
                          t.priority === 'medium' ? 'Media' : 'Baja',
                title: t.title,
                desc: cleanDesc || t.description,
                time: new Date(t.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }),
                loc: locMatch ? locMatch[1] : 'No especificada',
                guard: guardMatch ? guardMatch[1] : 'Oficial',
                status: t.status === 'open' ? 'Nuevo' : 
                        t.status === 'in_progress' ? 'En revisión' : 
                        t.status === 'resolved' ? 'Atendido' : 'Cerrado',
                color: t.priority === 'urgent' ? 'rose' : 
                       t.priority === 'high' ? 'blue' : 
                       t.priority === 'medium' ? 'amber' : 'zinc',
                condoId: t.condominium_id,
                photoUrls: photoUrls,
                videoUrls: videoUrls
            }
        })

        return { success: true, data: mappedData }
    } catch (err: any) {
        console.error('Exception fetching incidents:', err)
        return { success: false, error: err.message }
    }
}

export async function deleteSecurityIncidentAction(id: string) {
    if (!id) return { success: false, error: 'ID de incidencia no proporcionado' }

    const supabase = createAdminClient()

    try {
        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', id)

        if (error) throw error

        revalidatePath('/seguridad/incidencias')
        return { success: true }
    } catch (error: any) {
        console.error('Error in deleteSecurityIncidentAction:', error)
        return { success: false, error: error.message }
    }
}
