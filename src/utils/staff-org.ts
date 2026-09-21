/**
 * Resuelve si un usuario autenticado es staff/admin de una organización (y
 * cuál), o el residente al que corresponde su propia sesión. Se usa en
 * server actions que necesitan autorizar acceso a datos multi-tenant sin
 * confiar en IDs que llegan del cliente.
 */

export async function resolveStaffOrganization(
    supabase: any,
    userId: string
): Promise<{ organizationId: string | null; isStaff: boolean }> {
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id, role_new')
        .eq('user_id', userId)
        .maybeSingle()

    const staffRoles = ['owner', 'admin', 'super_admin', 'manager', 'accountant', 'admin_condominio', 'admin_propiedad', 'staff', 'security']
    if (orgUser?.organization_id && staffRoles.includes(orgUser.role_new || '')) {
        return { organizationId: orgUser.organization_id, isStaff: true }
    }

    const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle()

    if (ownedOrg) {
        return { organizationId: ownedOrg.id, isStaff: true }
    }

    return { organizationId: null, isStaff: false }
}

export async function resolveResidentSelf(
    supabase: any,
    userId: string
): Promise<{ id: string; condominium_id: string | null } | null> {
    const { data: resident } = await supabase
        .from('residents')
        .select('id, condominium_id')
        .eq('user_id', userId)
        .maybeSingle()

    if (!resident) return null
    return { id: resident.id, condominium_id: resident.condominium_id ?? null }
}
