'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { getCallerResidentBlock } from '@/lib/resident-delinquency'

/**
 * Mensajería directa residente <-> administrador. Se opera siempre con el
 * cliente de sesión (no admin client): la tabla resident_messages tiene RLS
 * propia que ya restringe cada lado a su propio hilo/organización, así que
 * no hace falta (ni conviene) saltarla aquí.
 */

async function attachSenderAvatars(messages: any[]) {
    const senderIds = Array.from(new Set(messages.map(m => m.sender_id).filter(Boolean)))
    if (senderIds.length === 0) return messages

    // Un residente no puede leer el profile de su admin (ni viceversa entre
    // condominios distintos) con el cliente de sesión — misma limitación de
    // RLS de profiles resuelta en resolveProfileData. La foto de perfil no
    // es un dato sensible, así que se resuelve con el admin client.
    const adminSupabase = createAdminClient()
    const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, avatar_url')
        .in('id', senderIds)

    const avatarById: Record<string, string | null> = {}
    for (const p of profiles || []) avatarById[p.id] = p.avatar_url || null

    return messages.map(m => ({ ...m, sender_avatar_url: m.sender_id ? avatarById[m.sender_id] || null : null }))
}

async function getResidentContext(supabase: any, userId: string) {
    const { data: resident } = await supabase
        .from('residents')
        .select('id, first_name, last_name, condominium_id, condominiums(organization_id)')
        .eq('user_id', userId)
        .maybeSingle()

    if (!resident) return null

    return {
        residentId: resident.id as string,
        condominiumId: resident.condominium_id as string | null,
        organizationId: (resident.condominiums as any)?.organization_id as string | null,
        residentName: `${resident.first_name || ''} ${resident.last_name || ''}`.trim() || 'Residente',
    }
}

/**
 * Hilo del residente autenticado con su administrador. Marca como leídos
 * los mensajes del admin que el residente todavía no había visto.
 */
export async function getResidentMessageThreadAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', data: [] }

    const ctx = await getResidentContext(supabase, user.id)
    if (!ctx) return { success: false, error: 'Residente no encontrado', data: [] }

    const { data: messages, error } = await supabase
        .from('resident_messages')
        .select('*')
        .eq('resident_id', ctx.residentId)
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

    return { success: true, data: withAvatars, residentId: ctx.residentId }
}

export async function sendResidentMessageAction(body: string) {
    const trimmed = (body || '').trim()
    if (!trimmed) return { success: false, error: 'El mensaje no puede estar vacío' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const ctx = await getResidentContext(supabase, user.id)
    if (!ctx) return { success: false, error: 'Residente no encontrado' }
    if (!ctx.organizationId) return { success: false, error: 'Tu condominio no tiene una organización asignada' }

    const blocked = await getCallerResidentBlock(createAdminClient(), user.id, ctx.residentId)
    if (blocked) return { success: false, error: blocked }

    const { data, error } = await supabase
        .from('resident_messages')
        .insert({
            organization_id: ctx.organizationId,
            condominium_id: ctx.condominiumId,
            resident_id: ctx.residentId,
            sender_role: 'resident',
            sender_id: user.id,
            sender_name: ctx.residentName,
            body: trimmed,
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/residente/help')
    const [withAvatar] = await attachSenderAvatars([data])
    return { success: true, data: withAvatar }
}

export type AdminThreadType = 'resident' | 'security'

/**
 * Lista de hilos (uno por residente o por guardia de seguridad) para el
 * inbox del administrador, ordenados por el mensaje más reciente primero,
 * con conteo de no leídos.
 */
export async function getAdminMessageThreadsAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', data: [] }

    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser?.organization_id) return { success: false, error: 'No administras ninguna organización', data: [] }

    const { data: messages, error } = await supabase
        .from('resident_messages')
        .select('id, resident_id, security_user_id, sender_role, sender_name, body, created_at, read_at')
        .eq('organization_id', orgUser.organization_id)
        .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message, data: [] }

    const residentIds = Array.from(new Set((messages || []).map(m => m.resident_id).filter(Boolean)))
    const { data: residentsData } = residentIds.length > 0
        ? await supabase
            .from('residents')
            .select('id, first_name, last_name, user_id, units(unit_number)')
            .in('id', residentIds)
        : { data: [] as any[] }

    const residentById: Record<string, any> = {}
    for (const r of residentsData || []) residentById[r.id] = r

    const adminSupabase = createAdminClient()

    const residentUserIds = (residentsData || []).map(r => r.user_id).filter(Boolean)
    const avatarByUserId: Record<string, string | null> = {}
    if (residentUserIds.length > 0) {
        const { data: residentProfiles } = await adminSupabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', residentUserIds)
        for (const p of residentProfiles || []) avatarByUserId[p.id] = p.avatar_url || null
    }

    const securityUserIds = Array.from(new Set((messages || []).map(m => m.security_user_id).filter(Boolean)))
    const securityProfileById: Record<string, any> = {}
    if (securityUserIds.length > 0) {
        const { data: securityProfiles } = await adminSupabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', securityUserIds)
        for (const p of securityProfiles || []) securityProfileById[p.id] = p
    }

    const threadsByKey = new Map<string, any>()
    for (const m of messages || []) {
        const threadType: AdminThreadType = m.security_user_id ? 'security' : 'resident'
        const contextId = m.security_user_id || m.resident_id
        const key = `${threadType}:${contextId}`

        if (!threadsByKey.has(key)) {
            if (threadType === 'security') {
                const p = securityProfileById[contextId]
                threadsByKey.set(key, {
                    threadType,
                    contextId,
                    residentName: p?.full_name || m.sender_name || 'Guardia de Seguridad',
                    unitNumber: null,
                    residentAvatarUrl: p?.avatar_url || null,
                    lastMessage: m.body,
                    lastMessageAt: m.created_at,
                    lastSenderRole: m.sender_role,
                    unreadCount: 0,
                })
            } else {
                const r = residentById[contextId]
                threadsByKey.set(key, {
                    threadType,
                    contextId,
                    residentName: r ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : (m.sender_role === 'resident' ? m.sender_name : 'Residente'),
                    unitNumber: r?.units?.unit_number || null,
                    residentAvatarUrl: r?.user_id ? avatarByUserId[r.user_id] || null : null,
                    lastMessage: m.body,
                    lastMessageAt: m.created_at,
                    lastSenderRole: m.sender_role,
                    unreadCount: 0,
                })
            }
        }

        const isFromCounterpart = threadType === 'security' ? m.sender_role === 'security' : m.sender_role === 'resident'
        if (isFromCounterpart && !m.read_at) {
            threadsByKey.get(key).unreadCount += 1
        }
    }

    return { success: true, data: Array.from(threadsByKey.values()) }
}

/**
 * Hilo completo de un residente o guardia puntual, visto por el admin.
 * Marca como leídos los mensajes del residente/guardia que el admin
 * todavía no había visto.
 */
export async function getAdminThreadMessagesAction(contextId: string, threadType: AdminThreadType = 'resident') {
    if (!contextId) return { success: false, error: 'contextId requerido', data: [] }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', data: [] }

    const filterColumn = threadType === 'security' ? 'security_user_id' : 'resident_id'
    const counterpartRole = threadType === 'security' ? 'security' : 'resident'

    const { data: messages, error } = await supabase
        .from('resident_messages')
        .select('*')
        .eq(filterColumn, contextId)
        .order('created_at', { ascending: true })

    if (error) return { success: false, error: error.message, data: [] }

    const unreadCounterpartMessageIds = (messages || [])
        .filter(m => m.sender_role === counterpartRole && !m.read_at)
        .map(m => m.id)

    if (unreadCounterpartMessageIds.length > 0) {
        await supabase
            .from('resident_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadCounterpartMessageIds)
    }

    const withAvatars = await attachSenderAvatars(messages || [])

    return { success: true, data: withAvatars }
}

export async function sendAdminMessageAction(contextId: string, body: string, threadType: AdminThreadType = 'resident') {
    const trimmed = (body || '').trim()
    if (!contextId || !trimmed) return { success: false, error: 'Datos incompletos' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser?.organization_id) return { success: false, error: 'No administras ninguna organización' }

    let condominiumId: string | null = null
    if (threadType === 'security') {
        // Solo a miembros del equipo de seguridad de la propia organización
        const { data: member } = await createAdminClient()
            .from('organization_users')
            .select('user_id')
            .eq('organization_id', orgUser.organization_id)
            .eq('user_id', contextId)
            .eq('role_new', 'security')
            .maybeSingle()
        if (!member) return { success: false, error: 'Este miembro no pertenece a tu equipo de seguridad' }
    }
    if (threadType === 'resident') {
        const { data: resident } = await supabase
            .from('residents')
            .select('id, condominium_id')
            .eq('id', contextId)
            .maybeSingle()

        if (!resident) return { success: false, error: 'Residente no encontrado' }
        condominiumId = resident.condominium_id
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

    const senderName = profile?.full_name
        || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ')
        || 'Administración'

    const { data, error } = await supabase
        .from('resident_messages')
        .insert({
            organization_id: orgUser.organization_id,
            condominium_id: condominiumId,
            resident_id: threadType === 'resident' ? contextId : null,
            security_user_id: threadType === 'security' ? contextId : null,
            sender_role: 'admin',
            sender_id: user.id,
            sender_name: senderName,
            body: trimmed,
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/mensajes')
    revalidatePath('/seguridad/mensajes')
    const [withAvatar] = await attachSenderAvatars([data])
    return { success: true, data: withAvatar }
}

// Roles del panel que administran la organización (el guardia de seguridad
// también vive en organization_users, pero no administra la bandeja).
const ORG_ADMIN_ROLES = ['owner', 'admin', 'admin_condominio', 'admin_propiedad', 'super_admin']

async function getOrgAdminContext() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: orgUser } = await createAdminClient()
        .from('organization_users')
        .select('organization_id, role_new')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser?.organization_id || !ORG_ADMIN_ROLES.includes(orgUser.role_new)) return null
    return { userId: user.id, organizationId: orgUser.organization_id as string }
}

/**
 * Miembros del equipo de seguridad a los que el administrador puede
 * escribir desde Mensajes (su chat está en el panel de Seguridad > Ayuda).
 */
export async function getAdminTeamMembersAction() {
    const ctx = await getOrgAdminContext()
    if (!ctx) return { success: false, error: 'No autorizado', data: [] }

    const adminSupabase = createAdminClient()
    const { data: members } = await adminSupabase
        .from('organization_users')
        .select('user_id, role_new')
        .eq('organization_id', ctx.organizationId)
        .eq('role_new', 'security')
        .neq('user_id', ctx.userId)

    const userIds = (members || []).map(m => m.user_id).filter(Boolean)
    if (userIds.length === 0) return { success: true, data: [] }

    const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds)

    const data = userIds.map(id => {
        const p = (profiles || []).find(pr => pr.id === id)
        return { userId: id as string, name: p?.full_name || 'Guardia de Seguridad', avatarUrl: p?.avatar_url || null }
    }).sort((a, b) => a.name.localeCompare(b.name, 'es'))

    return { success: true, data }
}

/**
 * El administrador elimina una conversación completa (con un residente o
 * con un guardia). Se borra para ambos lados y no se puede deshacer.
 */
export async function deleteAdminThreadAction(contextId: string, threadType: AdminThreadType) {
    if (!contextId) return { success: false, error: 'Conversación no válida' }

    const ctx = await getOrgAdminContext()
    if (!ctx) return { success: false, error: 'Solo la administración puede eliminar conversaciones' }

    const filterColumn = threadType === 'security' ? 'security_user_id' : 'resident_id'
    const { error, count } = await createAdminClient()
        .from('resident_messages')
        .delete({ count: 'exact' })
        .eq('organization_id', ctx.organizationId)
        .eq(filterColumn, contextId)

    if (error) {
        console.error('[deleteAdminThreadAction]', error)
        return { success: false, error: 'No se pudo eliminar la conversación' }
    }

    revalidatePath('/dashboard/mensajes')
    return { success: true, deleted: count || 0 }
}
