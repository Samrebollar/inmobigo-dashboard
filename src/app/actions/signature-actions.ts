'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { activatePendingReceipts, getSigningStatus, signedSignatureUrl, SECURITY_CANNOT_SIGN_ERROR } from '@/lib/payment-receipts'

const NON_TEAM_ROLES = ['resident', 'residente', 'tenant', 'viewer']
const MAX_SIGNATURE_BYTES = 700 * 1024

/**
 * Guarda la firma autógrafa digitalizada del usuario (PNG en data URL, dibujada
 * en pantalla o tomada de una foto). Cada versión se guarda en un archivo nuevo:
 * los recibos ya emitidos conservan la firma con la que se emitieron.
 */
export async function saveMySignatureAction(dataUrl: string): Promise<{ success: true; url: string | null; activated: number } | { success: false; error: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const admin = createAdminClient()
    const [{ data: member }, { data: ownedOrg }] = await Promise.all([
        admin.from('organization_users').select('role_new').eq('user_id', user.id).maybeSingle(),
        admin.from('organizations').select('id').eq('owner_id', user.id).limit(1).maybeSingle(),
    ])
    const role = String(member?.role_new || '')
    if (!ownedOrg && (!member || NON_TEAM_ROLES.includes(role))) {
        return { success: false, error: 'Solo el equipo de administración registra su firma' }
    }
    if (!ownedOrg && role === 'security') return { success: false, error: SECURITY_CANNOT_SIGN_ERROR }

    const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '')
    if (!match) return { success: false, error: 'La firma debe ser una imagen PNG' }
    const buffer = Buffer.from(match[1], 'base64')
    if (buffer.length < 200) return { success: false, error: 'La firma está vacía' }
    if (buffer.length > MAX_SIGNATURE_BYTES) return { success: false, error: 'La imagen de la firma es demasiado grande' }

    const path = `${user.id}/firma-${Date.now()}.png`
    const { error: uploadError } = await admin.storage.from('signatures').upload(path, buffer, { contentType: 'image/png', upsert: false })
    if (uploadError) return { success: false, error: `No se pudo guardar la firma: ${uploadError.message}` }

    const { error: profileError } = await admin
        .from('profiles')
        .update({ signature_path: path, signature_updated_at: new Date().toISOString() })
        .eq('id', user.id)
    if (profileError) return { success: false, error: profileError.message }

    // Recibos automáticos (Mercado Pago, saldo a favor, históricos) que esperaban esta firma
    const activated = await activatePendingReceipts(admin, user.id, path)

    return { success: true, url: await signedSignatureUrl(admin, path), activated }
}

/**
 * Estado de firma del usuario en sesión y de la matrícula SEDETUS de su
 * organización, para los avisos en las pantallas donde se registran pagos.
 */
export async function getMySigningStatusAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()
    const [{ data: member }, { data: ownedOrg }] = await Promise.all([
        admin.from('organization_users').select('organization_id').eq('user_id', user.id).maybeSingle(),
        admin.from('organizations').select('id').eq('owner_id', user.id).limit(1).maybeSingle(),
    ])
    const organizationId = member?.organization_id || ownedOrg?.id
    if (!organizationId) return null
    return getSigningStatus(admin, user.id, organizationId)
}
