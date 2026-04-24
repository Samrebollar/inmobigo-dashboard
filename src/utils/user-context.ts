import { createClient } from '@/utils/supabase/server'
import { Role } from '@/types/auth'

export async function getUserContext() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { user: null, role: null, businessType: null }
    }

    // Fetch user role and organization business type
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select(`
            role_new,
            organizations (
                business_type
            )
        `)
        .eq('user_id', user.id)
        .single()

    const businessType = (orgUser?.organizations as any)?.business_type || 'condominio'
    const role = orgUser?.role_new as Role || 'viewer'

    return {
        user,
        role,
        businessType
    }
}
