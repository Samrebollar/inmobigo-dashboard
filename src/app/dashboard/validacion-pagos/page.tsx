import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PaymentValidationClient } from '@/components/dashboard/validacion-pagos/validacion-pagos-client'

export default async function ValidacionPagosPage() {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    // Check if Admin/Staff
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('role_new, organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: profile } = await supabase
        .from('profiles')
        .select('role_new')
        .eq('id', user.id)
        .maybeSingle()

    let role = 'viewer'
    if (orgUser?.role_new) role = orgUser.role_new
    else if (profile?.role_new) role = profile.role_new

    const isStaff = ['owner', 'admin', 'manager', 'accountant', 'admin_condominio', 'admin_propiedad', 'staff', 'security'].includes(role)

    if (!isStaff) {
        redirect('/dashboard')
    }

    let organizationId = orgUser?.organization_id

    // Fallback if not in organization_users (e.g. legacy owners)
    if (!organizationId) {
        const { data: ownedOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
        organizationId = ownedOrg?.id
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <PaymentValidationClient organizationId={organizationId || ''} />
        </div>
    )
}
