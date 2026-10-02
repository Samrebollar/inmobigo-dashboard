'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeMexicanPhone } from '@/utils/phone-utils'
import { ORG_OWNER_ROLES } from '@/services/admin-identity-service'
import type { AdminIdentity, AdminIdentityInput, CommitteeMember } from '@/types/admin-identity'

/**
 * Solo el admin/dueño real de la organización edita la ficha pública del
 * administrador (staff, contador o seguridad no). Devuelve su organization_id.
 */
async function requireOrgOwner(): Promise<{ organizationId: string } | { error: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const admin = createAdminClient()
    const { data: orgUser } = await admin
        .from('organization_users')
        .select('role_new, organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser?.organization_id || !ORG_OWNER_ROLES.includes(orgUser.role_new)) {
        return { error: 'Solo el administrador de la organización puede editar esta información' }
    }
    return { organizationId: orgUser.organization_id }
}

const clean = (value: unknown): string | null => {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    return trimmed ? trimmed.slice(0, 500) : null
}

const cleanDate = (value: unknown): string | null => {
    const v = clean(value)
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

const cleanPhone = (value: unknown): string | null => {
    const v = clean(value)
    return v ? normalizeMexicanPhone(v) || v : null
}

export async function saveAdminIdentityAction(input: AdminIdentityInput): Promise<{ success: true; identity: AdminIdentity } | { success: false; error: string }> {
    const auth = await requireOrgOwner()
    if ('error' in auth) return { success: false, error: auth.error }

    const adminType = input.admin_type === 'empresa' || input.admin_type === 'comite' ? input.admin_type : null
    if (!adminType) return { success: false, error: 'Selecciona si el administrador es una Empresa o un Comité' }

    const rfc = clean(input.rfc)?.toUpperCase() || null
    if (adminType === 'empresa' && rfc && !/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc)) {
        return { success: false, error: 'El RFC no tiene un formato válido (12 o 13 caracteres)' }
    }

    const issue = cleanDate(input.sedetus_issue_date)
    const expiry = cleanDate(input.sedetus_expiry_date)
    if (issue && expiry && expiry < issue) {
        return { success: false, error: 'La vigencia de la acreditación SEDETUS no puede ser anterior a su fecha de emisión' }
    }

    const members: CommitteeMember[] = (Array.isArray(input.committee_members) ? input.committee_members : [])
        .slice(0, 20)
        .map((m) => ({
            name: clean(m?.name) || '',
            position: clean(m?.position) || 'Vocal',
            unit: clean(m?.unit),
            phone: cleanPhone(m?.phone),
            email: clean(m?.email),
        }))
        .filter((m) => m.name)

    // Solo se guardan los campos del tipo elegido, para que al cambiar de
    // Empresa a Comité (o al revés) no queden publicados datos del otro tipo.
    const isEmpresa = adminType === 'empresa'
    const row = {
        organization_id: auth.organizationId,
        admin_type: adminType,
        is_public: input.is_public !== false,
        display_name: clean(input.display_name),
        logo_url: clean(input.logo_url),
        legal_name: isEmpresa ? clean(input.legal_name) : null,
        rfc: isEmpresa ? rfc : null,
        legal_representative: isEmpresa ? clean(input.legal_representative) : null,
        fiscal_address: isEmpresa ? clean(input.fiscal_address) : null,
        website: isEmpresa ? clean(input.website) : null,
        committee_period_start: isEmpresa ? null : cleanDate(input.committee_period_start),
        committee_period_end: isEmpresa ? null : cleanDate(input.committee_period_end),
        assembly_date: isEmpresa ? null : cleanDate(input.assembly_date),
        committee_members: isEmpresa ? [] : members,
        contact_phone: cleanPhone(input.contact_phone),
        contact_email: clean(input.contact_email),
        office_address: clean(input.office_address),
        office_hours: clean(input.office_hours),
        description: clean(input.description),
        // La acreditación SEDETUS aplica a Empresa y a Comité por igual
        sedetus_registration_number: clean(input.sedetus_registration_number)?.toUpperCase() || null,
        sedetus_holder_name: clean(input.sedetus_holder_name),
        sedetus_issue_date: cleanDate(input.sedetus_issue_date),
        sedetus_expiry_date: cleanDate(input.sedetus_expiry_date),
        sedetus_document_url: clean(input.sedetus_document_url),
        updated_at: new Date().toISOString(),
    }

    const admin = createAdminClient()
    const { data, error } = await admin
        .from('admin_public_profiles')
        .upsert(row, { onConflict: 'organization_id' })
        .select('*')
        .single()

    if (error) return { success: false, error: error.message }
    return { success: true, identity: { ...data, committee_members: data.committee_members || [] } }
}

/** Genera un token nuevo: los QR impresos anteriormente dejan de funcionar. */
export async function regenerateAdminQrAction(): Promise<{ success: true; token: string } | { success: false; error: string }> {
    const auth = await requireOrgOwner()
    if ('error' in auth) return { success: false, error: auth.error }

    const token = crypto.randomUUID()
    const admin = createAdminClient()
    const { error } = await admin
        .from('admin_public_profiles')
        .update({ public_token: token, updated_at: new Date().toISOString() })
        .eq('organization_id', auth.organizationId)

    if (error) return { success: false, error: error.message }
    return { success: true, token }
}
