'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

/**
 * Mensajería directa guardia de seguridad <-> administrador. Comparte la
 * tabla resident_messages con el chat de residentes (misma organización,
 * mismo inbox del admin), distinguiendo el hilo por security_user_id en
 * vez de resident_id. Se opera con el cliente de sesión: la RLS de la
 * tabla ya restringe cada lado a su propio hilo/organización.
 */

async function attachSenderAvatars(messages: any[]) {
    const senderIds = Array.from(new Set(messages.map(m => m.sender_id).filter(Boolean)))
    if (senderIds.length === 0) return messages

    const adminSupabase = createAdminClient()
    const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', senderIds)

    const avatarById: Record<string, string | null> = {}
    for (const p of profiles || []) avatarById[p.id] = p.avatar_url || null

    return messages.map(m => ({ ...m, sender_avatar_url: m.sender_id ? avatarById[m.sender_id] || null : null }))
}

async function getSecurityContext(userId: string) {
    const adminSupabase = createAdminClient()

    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', userId)
        .maybeSingle()

    let organizationId = orgUser?.organization_id || null
    let condominiumId: string | null = null

    const { data: condo } = await adminSupabase
        .from('condominiums')
        .select('id, organization_id')
        .or(`admin_id.eq.${userId},security_user_id.eq.${userId}`)
        .limit(1)
        .maybeSingle()

    if (condo) {
        condominiumId = condo.id
        organizationId = organizationId || condo.organization_id
    }

    if (!organizationId) return null

    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name')
        .eq('id', userId)
        .maybeSingle()

    return {
        organizationId: organizationId as string,
        condominiumId,
        userName: profile?.full_name || 'Guardia',
    }
}

/**
 * Hilo del guardia autenticado con el administrador de su organización.
 * Marca como leídos los mensajes del admin que el guardia no había visto.
 */
export async function getSecurityMessageThreadAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', data: [] }

    const ctx = await getSecurityContext(user.id)
    if (!ctx) return { success: false, error: 'No se encontró tu organización', data: [] }

    const { data: messages, error } = await supabase
        .from('resident_messages')
        .select('*')
        .eq('security_user_id', user.id)
        .order('created_at', { ascending: true })

    if (error) return { success: false, error: error.message, data: [] }

    const unreadAdminMessageIds = (messages || [])
        .filter(m => m.sender_role === 'admin' && !m.read_at)
        .map(m => m.id)

    if (unreadAdminMessageIds.length > 0) {
        await supabase
            .from('resident_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadAdminMessageIds)
    }

    const withAvatars = await attachSenderAvatars(messages || [])

    return { success: true, data: withAvatars, securityUserId: user.id }
}

export async function sendSecurityMessageAction(body: string) {
    const trimmed = (body || '').trim()
    if (!trimmed) return { success: false, error: 'El mensaje no puede estar vacío' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const ctx = await getSecurityContext(user.id)
    if (!ctx) return { success: false, error: 'No se encontró tu organización' }

    const { data, error } = await supabase
        .from('resident_messages')
        .insert({
            organization_id: ctx.organizationId,
            condominium_id: ctx.condominiumId,
            security_user_id: user.id,
            sender_role: 'security',
            sender_id: user.id,
            sender_name: ctx.userName,
            body: trimmed,
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/seguridad/help')
    const [withAvatar] = await attachSenderAvatars([data])
    return { success: true, data: withAvatar }
}
