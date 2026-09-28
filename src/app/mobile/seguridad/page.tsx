import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import MobileSeguridadDashboardClient from '@/components/mobile/seguridad/seguridad-dashboard-client'
import { getActiveShiftServer } from '@/app/actions/security-ops-actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileSeguridadPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const adminSupabase = createAdminClient()

    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: securityCondo } = await adminSupabase
        .from('condominiums')
        .select('organization_id, name')
        .eq('security_user_id', user.id)
        .limit(1)
        .maybeSingle()

    const organizationId = orgUser?.organization_id || securityCondo?.organization_id || null

    const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guardia'
    const firstName = fullName.trim().split(' ')[0]

    let pendingPassesToday = 0
    let pendingPackages = 0
    let pendingTransport = 0
    let openTickets = 0
    let recentPasses: any[] = []

    if (organizationId) {
        const todayStr = new Date().toISOString().slice(0, 10)

        const { count: passesCount } = await adminSupabase
            .from('visitor_passes')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'pending')
            .eq('visit_date', todayStr)

        const { count: packagesCount } = await adminSupabase
            .from('package_alerts')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'pending')

        const { count: transportCount } = await adminSupabase
            .from('transport_notices')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .eq('status', 'pending')

        const { count: ticketsCount } = await adminSupabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', organizationId)
            .in('status', ['open', 'in_progress'])

        const { data: recent } = await adminSupabase
            .from('visitor_passes')
            .select('id, visitor_name, unit_name, status, visit_date, start_time, used_at, created_at')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(5)

        pendingPassesToday = passesCount || 0
        pendingPackages = packagesCount || 0
        pendingTransport = transportCount || 0
        openTickets = ticketsCount || 0
        recentPasses = recent || []
    }

    const activeShiftResult = await getActiveShiftServer(user.id)

    return (
        <MobileSeguridadDashboardClient
            firstName={firstName}
            avatarUrl={profile?.avatar_url || null}
            condominiumName={securityCondo?.name || null}
            pendingPassesToday={pendingPassesToday}
            pendingPackages={pendingPackages}
            pendingTransport={pendingTransport}
            openTickets={openTickets}
            recentPasses={recentPasses}
            organizationId={organizationId}
            condominiumId={null}
            guardId={user.id}
            guardName={fullName}
            activeShift={activeShiftResult.shift}
        />
    )
}
