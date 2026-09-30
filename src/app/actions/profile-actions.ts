'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeMexicanPhone } from '@/utils/phone-utils'

/**
 * Cuando un usuario cambia su teléfono en Mi Perfil, el número también debe
 * cambiar en los demás lugares donde se guarda:
 *  - profiles.whatsapp_notificaciones: a donde n8n manda los avisos de
 *    administrador por WhatsApp (resumen semanal, alertas, escalamientos,
 *    vencimiento del plan). Solo aplica al equipo, no a residentes.
 *  - auth user_metadata.phone: copia guardada al crear la cuenta.
 * Solo modifica la cuenta de la sesión actual.
 */
export async function syncMyPhoneAction(rawPhone: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const phone = normalizeMexicanPhone(rawPhone || '')
    const admin = createAdminClient()

    const { data: profile } = await admin.from('profiles').select('role_new').eq('id', user.id).maybeSingle()
    const isResident = !profile?.role_new || profile.role_new === 'resident'

    const updates: Record<string, string | null> = { phone: phone || null }
    if (!isResident) updates.whatsapp_notificaciones = phone || null

    const { error: profileError } = await admin.from('profiles').update(updates).eq('id', user.id)
    if (profileError) return { success: false, error: profileError.message }

    const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...(user.user_metadata || {}), phone: phone || null },
    })
    if (authError) return { success: false, error: authError.message }

    return { success: true, phone }
}
