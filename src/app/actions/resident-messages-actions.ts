'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

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

/**
 * Lista de hilos (uno por residente) para el inbox del administrador,
 * ordenados por el mensaje más reciente primero, con conteo de no leídos.
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
        .select('id, resident_id, sender_role, sender_name, body, created_at, read_at')
        .eq('organization_id', orgUser.organization_id)
        .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message, data: [] }

    const residentIds = Array.from(new Set((messages || []).map(m => m.resident_id)))
    const { data: residentsData } = residentIds.length > 0
        ? await supabase
            .from('residents')
            .select('id, first_name, last_name, user_id, units(unit_number)')
            .in('id', residentIds)
        : { data: [] as any[] }

    const residentById: Record<string, any> = {}
    for (const r of residentsData || []) residentById[r.id] = r

    const residentUserIds = (residentsData || []).map(r => r.user_id).filter(Boolean)
    const avatarByUserId: Record<string, string | null> = {}
    if (residentUserIds.length > 0) {
        const adminSupabase = createAdminClient()
        const { data: residentProfiles } = await adminSupabase
            .from('profiles')
            .select('id, avatar_url')
            .in('id', residentUserIds)
        for (const p of residentProfiles || []) avatarByUserId[p.id] = p.avatar_url || null
    }

    const threadsByResident = new Map<string, any>()
    for (const m of messages || []) {
        if (!threadsByResident.has(m.resident_id)) {
            const r = residentById[m.resident_id]
            threadsByResident.set(m.resident_id, {
                residentId: m.resident_id,
                residentName: r ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : (m.sender_role === 'resident' ? m.sender_name : 'Residente'),
                unitNumber: r?.units?.unit_number || null,
                residentAvatarUrl: r?.user_id ? avatarByUserId[r.user_id] || null : null,
                lastMessage: m.body,
                lastMessageAt: m.created_at,
                lastSenderRole: m.sender_role,
                unreadCount: 0,
            })
        }
        if (m.sender_role === 'resident' && !m.read_at) {
            threadsByResident.get(m.resident_id).unreadCount += 1
        }
    }

    return { success: true, data: Array.from(threadsByResident.values()) }
}

/**
 * Hilo completo de un residente puntual, visto por el admin. Marca como
 * leídos los mensajes del residente que el admin todavía no había visto.
 */
export async function getAdminThreadMessagesAction(residentId: string) {
    if (!residentId) return { success: false, error: 'residentId requerido', data: [] }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado', data: [] }

    const { data: messages, error } = await supabase
        .from('resident_messages')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: true })

    if (error) return { success: false, error: error.message, data: [] }

    const unreadResidentMessageIds = (messages || [])
        .filter(m => m.sender_role === 'resident' && !m.read_at)
        .map(m => m.id)

    if (unreadResidentMessageIds.length > 0) {
        await supabase
            .from('resident_messages')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadResidentMessageIds)
    }

    const withAvatars = await attachSenderAvatars(messages || [])

    return { success: true, data: withAvatars }
}

export async function sendAdminMessageAction(residentId: string, body: string) {
    const trimmed = (body || '').trim()
    if (!residentId || !trimmed) return { success: false, error: 'Datos incompletos' }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser?.organization_id) return { success: false, error: 'No administras ninguna organización' }

    const { data: resident } = await supabase
        .from('residents')
        .select('id, condominium_id')
        .eq('id', residentId)
        .maybeSingle()

    if (!resident) return { success: false, error: 'Residente no encontrado' }

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
            condominium_id: resident.condominium_id,
            resident_id: residentId,
            sender_role: 'admin',
            sender_id: user.id,
            sender_name: senderName,
            body: trimmed,
        })
        .select()
        .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/dashboard/mensajes')
    const [withAvatar] = await attachSenderAvatars([data])
    return { success: true, data: withAvatar }
}
