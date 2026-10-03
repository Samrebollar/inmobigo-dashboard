import { createAdminClient } from '@/utils/supabase/admin'
import { ensureResidentAuthUser } from '@/lib/resident-invitation'

/**
 * Invitación al Portal de Propietarios y Gestores. Igual que la de residentes:
 * la cuenta se crea sin correo de Supabase, se liga a unit_contacts.user_id y
 * el enlace de activación sale por n8n (webhook residente-invitacion).
 *
 * Solo debe llamarse desde código de servidor ya autorizado.
 */

type AdminClient = ReturnType<typeof createAdminClient>

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://app.inmobigo.mx'

export async function deliverUnitContactInvitation(admin: AdminClient, contactId: string): Promise<{ success: boolean; error?: string }> {
    const { data: contact } = await admin
        .from('unit_contacts')
        .select('id, kind, full_name, phone, email, user_id')
        .eq('id', contactId)
        .maybeSingle()
    if (!contact) return { success: false, error: 'Contacto no encontrado' }
    const email = String(contact.email || '').trim().toLowerCase()
    if (!email) return { success: false, error: 'Captura su correo para poder invitarlo al portal.' }

    try {
        const userId = contact.user_id || await ensureResidentAuthUser(admin, {
            email,
            firstName: contact.full_name,
            phone: contact.phone,
            portal: 'propietario',
        })
        if (!contact.user_id) {
            await admin.from('unit_contacts').update({ user_id: userId, updated_at: new Date().toISOString() }).eq('id', contact.id)
        }

        // Unidades del contacto, para el texto del correo
        const { data: units } = await admin
            .from('units')
            .select('unit_number, condominiums(name)')
            .or(`owner_contact_id.eq.${contact.id},co_owner_contact_id.eq.${contact.id},manager_contact_id.eq.${contact.id}`)
            .limit(20)
        const condos = Array.from(new Set((units || []).map((u: any) => u.condominiums?.name).filter(Boolean)))

        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: 'recovery', email })
        const tokenHash = linkData?.properties?.hashed_token
        if (linkError || !tokenHash) throw new Error(linkError?.message || 'No se pudo generar el enlace de activación')

        const link = `${APP_URL()}/activar-residente?e=${encodeURIComponent(email)}&token_hash=${encodeURIComponent(tokenHash)}&type=recovery`
        const base = process.env.N8N_BASE_URL || 'https://n8n.inmobigo.mx'
        const res = await fetch(`${base}/webhook/residente-invitacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                nombre: contact.full_name || (contact.kind === 'gestor' ? 'Gestor' : 'Propietario'),
                condominio: condos.join(', ') || 'tu condominio',
                unidad: (units || []).map((u: any) => u.unit_number).join(', '),
                link,
                tipo: contact.kind,
            }),
        })
        if (!res.ok) throw new Error(`El servicio de correo respondió ${res.status}`)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        console.error('🔴 [deliverUnitContactInvitation]', contactId, message)
        return { success: false, error: `No se pudo enviar la invitación: ${message}` }
    }
}
