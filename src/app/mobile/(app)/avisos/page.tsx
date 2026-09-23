import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import MobileAvisosClient from '@/components/mobile/mobile-avisos-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileAvisosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const adminSupabase = createAdminClient()

    const { data: resident } = await adminSupabase
        .from('residents')
        .select('*, condominiums(organization_id)')
        .eq('user_id', user.id)
        .maybeSingle()

    const organizationId = (resident?.condominiums as any)?.organization_id

    if (!organizationId) {
        redirect('/residente/avisos')
    }

    const { data: announcementsData } = await adminSupabase
        .from('announcements')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(50)

    return <MobileAvisosClient announcements={announcementsData || []} />
}
