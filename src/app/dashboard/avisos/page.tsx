import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { AvisosClient } from '@/components/dashboard/avisos-client'
import { ResidentAnnouncementsClient } from '@/components/dashboard/resident-announcements-client'

export const dynamic = 'force-dynamic'

export default async function AvisosPage() {
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

  const { data: resident } = await supabase
    .from('residents')
    .select('*, condominiums(organization_id)')
    .eq('user_id', user.id)
    .maybeSingle()

  const organizationId = orgUser?.organization_id || resident?.condominiums?.organization_id

  if (!organizationId) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-zinc-500">
        No se encontró un contexto de organización para este usuario.
      </div>
    )
  }

  // Bypassing RLS for initial data load: Use admin client
  const adminSupabase = createAdminClient()
  
  // Unified announcement fetch
  const { data: initialAnnouncements } = await adminSupabase
    .from('announcements')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  // CASE 1: ADMINISTRATOR
  if (orgUser) {
    const { data: initialPasses } = await adminSupabase
      .from('visitor_passes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: initialAlerts } = await adminSupabase
      .from('package_alerts')
      .select('*')
      .eq('organization_id', organizationId)
      .in('status', ['pending', 'received'])
      .order('created_at', { ascending: false })
      .limit(50)

    const admin = {
      ...user,
      organization_id: organizationId,
      role: orgUser?.role,
      serverPassCount: initialPasses?.length || 0,
      serverAlertCount: initialAlerts?.length || 0,
      serverAnnCount: initialAnnouncements?.length || 0
    }

    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        <AvisosClient 
          admin={admin} 
          initialPasses={initialPasses || []} 
          initialAlerts={initialAlerts || []} 
          initialAnnouncements={initialAnnouncements || []}
        />
      </div>
    )
  }

  // CASE 2: RESIDENT
  return (
    <ResidentAnnouncementsClient 
      initialAnnouncements={initialAnnouncements || []}
    />
  )
}
