import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getUserContext } from '@/utils/user-context'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export const revalidate = 0

export default async function DashboardPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Resolve User Role (Support for profiles & organization_users)
    const adminSupabase = createAdminClient()

    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('role_new')
        .eq('id', user.id)
        .maybeSingle()

    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('role_new, organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: resident } = await adminSupabase
        .from('residents')
        .select('condominiums(organization_id)')
        .eq('user_id', user.id)
        .maybeSingle()

    let role = 'viewer'
    if (orgUser?.role_new) {
        role = orgUser.role_new
    } else if (profile?.role_new && profile.role_new !== 'resident' && profile.role_new !== 'tenant') {
        role = profile.role_new
    } else if (resident || profile?.role_new === 'resident' || profile?.role_new === 'tenant' || user.user_metadata?.role === 'resident' || user.user_metadata?.role === 'tenant') {
        role = 'resident' 
    } else if (user.user_metadata?.role) {
        role = user.user_metadata.role
    }

    // Determine associated business_type
    let orgId = orgUser?.organization_id || (resident?.condominiums as any)?.organization_id
    let businessType = 'condominio'

    if (orgId) {
        const { data: org } = await adminSupabase
            .from('organizations')
            .select('business_type')
            .eq('id', orgId)
            .maybeSingle()
        if (org?.business_type) {
            businessType = org.business_type
        }
    }


    if (role === 'resident' || role === 'tenant') {
        if (businessType === 'propiedades') {
            role = 'tenant'
        } else {
            role = 'resident'
        }
    }

    // Redirección basada en Rol de Usuario
    if (role === 'resident') {
        redirect('/residente')
    }

    if (role === 'tenant') {
        redirect('/inquilino')
    }
    
    // Redirección inteligente para Admins / Staff basada en el business_type

    if (businessType === 'propiedades') {
        redirect('/dashboard/inicio-propiedades')
    } else {
        redirect('/dashboard/inicio-condominio')
    }
}


