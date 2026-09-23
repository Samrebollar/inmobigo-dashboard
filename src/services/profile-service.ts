import type { SupabaseClient } from '@supabase/supabase-js'

const ADMIN_LIKE_ROLES = ['super_admin', 'admin_condominio', 'admin_propiedad', 'owner', 'accountant', 'staff', 'security', 'admin']

export interface AdminContact {
    name: string
    phone: string | null
    email: string | null
    avatarUrl: string | null
}

export interface AccountStatus {
    isOverdue: boolean
    totalDebt: number
    nextDueDate: string | null
    nextAmount: number | null
}

export interface ProfilePageData {
    profile: any
    resident: any
    role: string
    isAdmin: boolean
    subscription: any
    organizationName: string | null
    organizationId: string | null
    adminContact: AdminContact | null
    accountStatus: AccountStatus | null
}

/**
 * Resolución única de los datos del Perfil, compartida por los 4 portales
 * (dashboard, seguridad, inquilino, residente) para evitar que cada uno
 * repita — y diverja de — la misma lógica de rol/suscripción/join.
 */
export async function resolveProfileData(supabase: SupabaseClient, user: any): Promise<ProfilePageData> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    const { data: resident } = await supabase
        .from('residents')
        .select('*, units(*), condominiums(*)')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('role_new, organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    let role = 'viewer'
    if (orgUser?.role_new) {
        role = orgUser.role_new
    } else if (profile?.role_new && profile.role_new !== 'resident') {
        role = profile.role_new
    } else if (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'admin_condominio' || user.user_metadata?.role === 'admin_propiedad') {
        role = user.user_metadata?.role
    } else if (resident || profile?.role_new === 'resident' || user.user_metadata?.role === 'resident') {
        role = 'resident'
    }

    const isAdmin = ADMIN_LIKE_ROLES.includes(role)

    const organizationId = orgUser?.organization_id || profile?.organization_id || (resident?.condominiums as any)?.organization_id || null

    let organizationName: string | null = null
    if (organizationId) {
        const { data: org } = await supabase
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
            .maybeSingle()
        organizationName = org?.name || null
    }

    let adminContact: AdminContact | null = null
    if (organizationId && !isAdmin) {
        // Un residente no tiene organization_id en su propio profile (solo el
        // staff lo tiene), así que la RLS de profiles ("mi org = organization_id
        // del profile de quien pregunta") nunca deja leer aquí con el cliente
        // de sesión. Es una sola fila de datos de contacto no sensibles del
        // admin de su propia organización, así que se usa el admin client.
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminSupabase = createAdminClient()
        const { data: adminProfile } = await adminSupabase
            .from('profiles')
            .select('full_name, email, phone, avatar_url')
            .eq('organization_id', organizationId)
            .in('role_new', ['super_admin', 'admin_condominio', 'admin_propiedad', 'owner'])
            .neq('id', user.id)
            .limit(1)
            .maybeSingle()

        if (adminProfile) {
            adminContact = {
                name: adminProfile.full_name || 'Administrador',
                phone: adminProfile.phone || null,
                email: adminProfile.email || null,
                avatarUrl: adminProfile.avatar_url || null,
            }
        }
    }

    let subscription: any = null
    if (organizationId) {
        let { data: activeSub } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('subscription_status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (!activeSub) {
            const { data: fallbackSub } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('organization_id', organizationId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()
            activeSub = fallbackSub
        }
        subscription = activeSub
    }

    let accountStatus: AccountStatus | null = null
    if (resident?.id) {
        const { data: pendingInvoices } = await supabase
            .from('resident_invoices')
            .select('amount, balance_due, status, due_date')
            .eq('resident_id', resident.id)
            .in('status', ['pending', 'overdue'])
            .order('due_date', { ascending: true })

        const invoices = pendingInvoices || []
        const totalDebt = invoices.reduce((sum: number, inv: any) => sum + Number(inv.balance_due ?? inv.amount ?? 0), 0)
        const isOverdue = invoices.some((inv: any) => inv.status === 'overdue')
        const next = invoices[0] || null

        accountStatus = {
            isOverdue,
            totalDebt,
            nextDueDate: next?.due_date || null,
            nextAmount: next ? Number(next.balance_due ?? next.amount ?? 0) : null,
        }
    }

    return { profile, resident, role, isAdmin, subscription, organizationName, organizationId, adminContact, accountStatus }
}
