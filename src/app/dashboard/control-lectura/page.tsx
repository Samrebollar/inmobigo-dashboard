import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { ControlLecturaClient } from '@/components/dashboard/control-lectura-client'

export const dynamic = 'force-dynamic'

export default async function ControlLecturaPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Determine user role and context
  const { data: orgUser } = await supabase
    .from('organization_users')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!orgUser) {
    // Only admins/staff can see this page
    redirect('/dashboard')
  }

  const organizationId = orgUser.organization_id

  // Bypassing RLS for initial data load: Use admin client
  const adminSupabase = createAdminClient()
  
  // Fetch initial announcements for the filter
  const { data: announcements } = await adminSupabase
    .from('announcements')
    .select('id, title')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  // Fetch initial reading logs
  // First get the IDs of the announcements
  const announcementIds = announcements?.map(a => a.id) || []

  let initialViews = []
  if (announcementIds.length > 0) {
    const { data: views } = await adminSupabase
      .from('announcement_views')
      .select('*')
      .in('announcement_id', announcementIds)
      .order('acknowledged_at', { ascending: false })
    
    initialViews = views || []
  }

  // Fetch total residents for percentage calculation
  const { count: totalResidents } = await adminSupabase
    .from('residents')
    .select('*, condominiums!inner(organization_id)', { count: 'exact', head: true })
    .eq('condominiums.organization_id', organizationId)

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
      <ControlLecturaClient 
        initialViews={initialViews}
        announcements={announcements || []}
        organizationId={organizationId}
        totalResidents={totalResidents || 0}
      />
    </div>
  )
}
