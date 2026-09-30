'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { deliverResidentInvitation } from '@/lib/resident-invitation'

const STAFF_ROLES = ['owner', 'admin', 'admin_condominio', 'admin_propiedad', 'manager', 'staff']

/** Solo el equipo de la organización dueña del condominio puede invitar a sus residentes. */
async function assertCanInvite(residentIds: string[]) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    const admin = createAdminClient()
    const { data: rows } = await admin
        .from('residents')
        .select('id, condominiums(organization_id)')
        .in('id', residentIds)
    const orgIds = Array.from(new Set((rows || []).map(r => (r.condominiums as { organization_id?: string } | null)?.organization_id).filter(Boolean))) as string[]
    if (orgIds.length === 0 || (rows || []).length !== residentIds.length) throw new Error('Residente no encontrado')

    for (const orgId of orgIds) {
        const [{ data: orgUser }, { data: org }] = await Promise.all([
            admin.from('organization_users').select('role_new').eq('user_id', user.id).eq('organization_id', orgId).maybeSingle(),
            admin.from('organizations').select('owner_id').eq('id', orgId).maybeSingle(),
        ])
        const allowed = org?.owner_id === user.id || STAFF_ROLES.includes(String(orgUser?.role_new || ''))
        if (!allowed) throw new Error('No autorizado')
    }
    return admin
}

/** Envía o reenvía la invitación de un residente (botón de la columna Acciones). */
export async function sendResidentInvitationAction(residentId: string) {
    try {
        const admin = await assertCanInvite([residentId])
        return await deliverResidentInvitation(admin, residentId)
    } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'No autorizado' }
    }
}

/** Invita en lote a los residentes recién creados por la carga masiva. */
export async function sendResidentInvitationsAction(residentIds: string[]) {
    const ids = Array.from(new Set(residentIds.filter(Boolean)))
    if (ids.length === 0) return { success: true, sent: 0, failed: 0 }
    try {
        const admin = await assertCanInvite(ids)
        let sent = 0
        let failed = 0
        for (const id of ids) {
            const r = await deliverResidentInvitation(admin, id)
            if (r.success) sent++
            else failed++
        }
        return { success: failed === 0, sent, failed }
    } catch (err) {
        return { success: false, sent: 0, failed: ids.length, error: err instanceof Error ? err.message : 'No autorizado' }
    }
}
