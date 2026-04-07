'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export type AnnouncementPayload = {
    organization_id: string
    title: string
    message: string
    type: string
    priority: string
    event_date: string | null
    start_time: string | null
    end_time: string | null
    location: string | null
    visibility: string
    created_by: string
    is_active: boolean
    image_url?: string | null
}

export async function createAnnouncement(payload: AnnouncementPayload) {
    const supabase = createAdminClient()
    
    try {
        console.log('--- SERVER ACTION: Creating Announcement ---')
        
        const { data, error } = await supabase
            .from('announcements')
            .insert({
                ...payload,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('Server Action Error:', error)
            return { 
                success: false, 
                error: error.message || 'Error desconocido en el servidor' 
            }
        }

        return { 
            success: true, 
            data 
        }
    } catch (err: any) {
        console.error('Server Action Exception:', err)
        return { 
            success: false, 
            error: err.message || 'Excepción crítica en el servidor' 
        }
    }
}

/**
 * Obtiene los anuncios activos para una organización, filtrando por visibilidad (Bypass RLS)
 * @param organizationId El ID de la organización
 * @param propertyName El nombre de la propiedad del residente (opcional, para filtrar visibilidad específica)
 */
export async function getAnnouncementsAction(organizationId: string, propertyName?: string) {
    if (!organizationId) {
        console.warn('⚠️ [getAnnouncementsAction] No organizationId provided');
        return { success: false, error: 'ID de organización no proporcionado' };
    }

    const adminClient = createAdminClient();
    const now = new Date().toISOString();

    try {
        console.log(`🔍 [getAnnouncementsAction] Buscando anuncios para ORG: ${organizationId}${propertyName ? ` y Propiedad: ${propertyName}` : ''}`);

        let query = adminClient
            .from('announcements')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${now}`);

        // Si se proporciona un nombre de propiedad, filtramos por 'Todos' o por esa propiedad específica
        if (propertyName && propertyName !== 'N/A') {
            query = query.or(`visibility.eq.Todos,visibility.eq."${propertyName}"`);
        }

        const { data, error } = await query
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error('❌ [getAnnouncementsAction] Error Supabase:', error);
            return { success: false, error: error.message };
        }

        console.log(`📦 [getAnnouncementsAction] Anuncios encontrados: ${data?.length || 0}`);
        
        return { 
            success: true, 
            data: data || [] 
        };
    } catch (err: any) {
        console.error('❌ [getAnnouncementsAction] Excepción:', err);
        return { success: false, error: err.message || 'Error interno del servidor' };
    }
}

/**
 * Registra o actualiza la lectura/confirmación de un anuncio por parte de un residente
 */
export async function acknowledgeAnnouncementAction(payload: {
    announcement_id: string
    user_id: string
    announcement_title: string
    resident_name: string
    unit_name: string
    property_name: string
}) {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    try {
        console.log(`👁️ [acknowledgeAnnouncementAction] Registrando lectura para anuncio ID: ${payload.announcement_id} usuario: ${payload.user_id}`);

        // Verificamos si ya existe el registro para este usuario/anuncio
        const { data: existing, error: findError } = await supabase
            .from('announcement_views')
            .select('id')
            .eq('announcement_id', payload.announcement_id)
            .eq('user_id', payload.user_id)
            .maybeSingle();

        if (findError) {
            console.error('❌ [acknowledgeAnnouncementAction] Error al buscar registro:', findError);
            return { success: false, error: findError.message };
        }

        let result;
        if (existing) {
            // Si ya existe, actualizamos
            console.log(`🔄 [acknowledgeAnnouncementAction] Actualizando registro existente (ID: ${existing.id})`);
            result = await supabase
                .from('announcement_views')
                .update({
                    ...payload,
                    viewed_at: now,
                    acknowledged: true,
                    acknowledged_at: now
                })
                .eq('id', existing.id)
                .select()
                .single();
        } else {
            // Si no existe, insertamos
            console.log(`🆕 [acknowledgeAnnouncementAction] Insertando nuevo registro`);
            result = await supabase
                .from('announcement_views')
                .insert({
                    ...payload,
                    viewed_at: now,
                    acknowledged: true,
                    acknowledged_at: now
                })
                .select()
                .single();
        }

        if (result.error) {
            console.error('❌ [acknowledgeAnnouncementAction] Error Supabase:', result.error);
            return { success: false, error: result.error.message };
        }

        return { success: true, data: result.data };
    } catch (err: any) {
        console.error('❌ [acknowledgeAnnouncementAction] Excepción:', err);
        return { success: false, error: err.message || 'Error interno del servidor' };
    }
}

/**
 * Obtiene todos los logs de lectura para los anuncios de una organización
 */
export async function getAllAnnouncementViewsAction(organizationId: string) {
    const supabase = createAdminClient();

    try {
        console.log(`📊 [getAllAnnouncementViewsAction] Buscando logs de lectura para ORG: ${organizationId}`);

        // Primero obtenemos los IDs de los anuncios de esta organización
        const { data: announcements, error: annError } = await supabase
            .from('announcements')
            .select('id')
            .eq('organization_id', organizationId);

        if (annError) throw annError;
        
        const announcementIds = announcements?.map(a => a.id) || [];

        if (announcementIds.length === 0) return { success: true, data: [] };

        const { data, error } = await supabase
            .from('announcement_views')
            .select('*')
            .in('announcement_id', announcementIds)
            .order('acknowledged_at', { ascending: false });

        if (error) {
            console.error('❌ [getAllAnnouncementViewsAction] Error Supabase:', error);
            return { success: false, error: error.message };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        console.error('❌ [getAllAnnouncementViewsAction] Excepción:', err);
        return { success: false, error: err.message || 'Error interno del servidor' };
    }
}

/**
 * Elimina permanentemente un anuncio de la base de datos
 */
export async function deleteAnnouncementAction(id: string) {
    const supabase = createAdminClient();
    
    try {
        console.log(`🗑️ [deleteAnnouncementAction] ELIMINANDO PERMANENTEMENTE anuncio ID: ${id}`);
        
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ [deleteAnnouncementAction] Error Supabase:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (err: any) {
        console.error('❌ [deleteAnnouncementAction] Excepción:', err);
        return { success: false, error: err.message || 'Error interno del servidor' };
    }
}
