import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = ReturnType<typeof createAdminClient>

// Roles que NO pueden mover dinero (registrar pagos, saldo a favor, corte de caja).
// Seguridad sí: su panel tiene Gestión de Cobranza (cobro en caseta).
const NON_FINANCE_ROLES = ['resident', 'residente', 'viewer']

/**
 * ¿El usuario administra (o es auxiliar de) la organización dueña del
 * condominio? Devuelve el organization_id si puede operar finanzas.
 */
export async function getFinanceOrgForCondo(admin: AdminClient, userId: string, condominiumId: string): Promise<string | null> {
    const { data: condo } = await admin.from('condominiums').select('organization_id').eq('id', condominiumId).maybeSingle()
    if (!condo?.organization_id) return null
    return (await canOperateOrgFinance(admin, userId, condo.organization_id)) ? condo.organization_id : null
}

export async function canOperateOrgFinance(admin: AdminClient, userId: string, organizationId: string): Promise<boolean> {
    const [{ data: org }, { data: member }] = await Promise.all([
        admin.from('organizations').select('owner_id').eq('id', organizationId).maybeSingle(),
        admin.from('organization_users').select('role_new').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle(),
    ])
    if (org?.owner_id === userId) return true
    if (!member) return false
    return !NON_FINANCE_ROLES.includes(String(member.role_new || ''))
}
