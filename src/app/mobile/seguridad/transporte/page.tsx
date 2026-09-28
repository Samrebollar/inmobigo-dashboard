import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import MobileSeguridadTransporteClient from '@/components/mobile/seguridad/seguridad-transporte-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileSeguridadTransportePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const adminSupabase = createAdminClient()

    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: securityCondo } = await adminSupabase
        .from('condominiums')
        .select('organization_id')
        .eq('security_user_id', user.id)
        .limit(1)
        .maybeSingle()

    const organizationId = orgUser?.organization_id || securityCondo?.organization_id || null

    let notices: any[] = []
    if (organizationId) {
        const { data } = await adminSupabase
            .from('transport_notices')
            .select('*')
            .eq('organization_id', organizationId)
            .in('status', ['pending', 'received'])
            .order('created_at', { ascending: false })
        notices = data || []
    }

    return <MobileSeguridadTransporteClient initialNotices={notices} adminUserId={user.id} />
}
