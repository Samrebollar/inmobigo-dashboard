import { createAdminClient } from '@/utils/supabase/admin'
import type { AdminIdentity } from '@/types/admin-identity'

export const ORG_OWNER_ROLES = ['super_admin', 'admin_condominio', 'admin_propiedad', 'owner']

const SELECT_COLUMNS = '*'

function normalize(row: any): AdminIdentity {
    return {
        ...row,
        committee_members: Array.isArray(row?.committee_members) ? row.committee_members : [],
    }
}

/**
 * Devuelve la ficha pública del administrador de la organización, creándola
 * (con su token de QR) la primera vez que el admin entra a Mi Perfil, para que
 * el QR exista desde el inicio.
 */
export async function getOrCreateAdminIdentity(organizationId: string, defaults: Partial<AdminIdentity> = {}): Promise<AdminIdentity | null> {
    const admin = createAdminClient()

    const { data: existing, error } = await admin
        .from('admin_public_profiles')
        .select(SELECT_COLUMNS)
        .eq('organization_id', organizationId)
        .maybeSingle()

    if (error) {
        console.error('[admin-identity] Error leyendo ficha:', error.message)
        return null
    }
    if (existing) return normalize(existing)

    const { data: created, error: insertError } = await admin
        .from('admin_public_profiles')
        .insert({ organization_id: organizationId, ...defaults })
        .select(SELECT_COLUMNS)
        .single()

    if (insertError) {
        console.error('[admin-identity] Error creando ficha:', insertError.message)
        return null
    }
    return normalize(created)
}

export interface PublicAdminCard {
    identity: AdminIdentity
    organizationName: string | null
    condominiums: { name: string; address: string | null }[]
}

/** Datos que muestra la página pública del QR. Null si el token no existe o la ficha no es pública. */
export async function getPublicAdminCard(token: string): Promise<PublicAdminCard | null> {
    if (!/^[0-9a-f-]{36}$/i.test(token)) return null

    const admin = createAdminClient()
    const { data: row } = await admin
        .from('admin_public_profiles')
        .select(SELECT_COLUMNS)
        .eq('public_token', token)
        .maybeSingle()

    if (!row || !row.is_public) return null

    const [{ data: org }, { data: condos }] = await Promise.all([
        admin.from('organizations').select('name').eq('id', row.organization_id).maybeSingle(),
        admin.from('condominiums').select('*').eq('organization_id', row.organization_id).order('name'),
    ])

    return {
        identity: normalize(row),
        organizationName: org?.name || null,
        condominiums: (condos || []).map((c: any) => ({ name: c.name, address: c.address || null })),
    }
}
