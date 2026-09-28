'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Debe coincidir con la palabra que pide el modal de confirmación
const DELETE_ACCOUNT_CONFIRMATION = 'ELIMINAR'

/**
 * El residente elimina su propia cuenta: se borran su acceso y su
 * información personal de la App (purge_resident_account). Su registro de
 * residente y su estado de cuenta se quedan con la administración.
 */
export async function deleteResidentAccountAction(confirmation: string) {
    if ((confirmation || '').trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION) {
        return { success: false, error: `Escribe ${DELETE_ACCOUNT_CONFIRMATION} para confirmar` }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const admin = createAdminClient()
    const { data: result, error } = await admin.rpc('purge_resident_account', { p_user: user.id, p_dry_run: false })
    if (error || !result?.ok) {
        console.error('[deleteResidentAccountAction] purge error:', error || result)
        return { success: false, error: result?.error || 'No se pudo eliminar la cuenta. Intenta de nuevo o contacta a tu administración.' }
    }

    // El usuario ya no existe: limpiar la sesión del navegador
    await supabase.auth.signOut()

    return { success: true }
}
