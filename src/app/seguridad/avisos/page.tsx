import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { AvisosClient } from '@/components/seguridad/avisos-client'
import { ResidentAnnouncementsClient } from '@/components/seguridad/resident-announcements-client'

export const dynamic = 'force-dynamic'

export default async function AvisosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  try {
    const adminSupabase = createAdminClient()
    
    // 1. Get Org User context
    const { data: orgUser } = await adminSupabase
      .from('organization_users')
      .select('organization_id, role_new')
      .eq('user_id', user.id)
      .maybeSingle()

    // 2. Get Resident context
    const { data: resident } = await adminSupabase
      .from('residents')
      .select('*, condominiums(organization_id)')
      .eq('user_id', user.id)
      .maybeSingle()

    // 3. Fallback for Security/Staff: Search across condominiums
    const { data: userCondos } = await adminSupabase
      .from('condominiums')
      .select('organization_id')
      .or(`admin_id.eq.${user.id},security_user_id.eq.${user.id}`)
      .limit(1)

    // Determine final context
    let finalOrganizationId = orgUser?.organization_id || 
                             resident?.condominiums?.organization_id ||
                             (userCondos && userCondos.length > 0 ? userCondos[0].organization_id : null)

    let userRole = orgUser?.role_new || (resident ? 'resident' : 'security')

    // If still no org, try fallback to any organization to avoid null crash
    if (!finalOrganizationId) {
      const { data: anyOrg } = await adminSupabase.from('organizations').select('id').limit(1).maybeSingle()
      if (anyOrg) finalOrganizationId = anyOrg.id
    }

    const safeOrgId = finalOrganizationId || 'no-context'

    // Fetch initial data
    const { data: initialAnnouncements } = await adminSupabase
      .from('announcements')
      .select('*')
      .eq('organization_id', safeOrgId)
      .order('created_at', { ascending: false })
      .limit(50)

    // Decide which client to render
    const isStaffOrSecurity = orgUser || !resident || userRole === 'security'

    if (isStaffOrSecurity) {
      const { data: initialPasses } = await adminSupabase
        .from('visitor_passes')
        .select('*')
        .eq('organization_id', safeOrgId)
        .order('created_at', { ascending: false })
        .limit(50)

      const { data: initialAlerts } = await adminSupabase
        .from('package_alerts')
        .select('*')
        .eq('organization_id', safeOrgId)
        .in('status', ['pending', 'received'])
        .order('created_at', { ascending: false })
        .limit(50)

      const adminData = {
        id: user.id,
        email: user.email,
        organization_id: safeOrgId,
        role: userRole,
        serverPassCount: initialPasses?.length || 0,
        serverAlertCount: initialAlerts?.length || 0,
        serverAnnCount: initialAnnouncements?.length || 0
      }

      return (
        <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
          <AvisosClient 
            admin={adminData} 
            initialPasses={initialPasses || []} 
            initialAlerts={initialAlerts || []} 
            initialAnnouncements={initialAnnouncements || []}
          />
        </div>
      )
    }

    return (
      <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
        <ResidentAnnouncementsClient 
          initialAnnouncements={initialAnnouncements || []}
        />
      </div>
    )

  } catch (error) {
    console.error('Fatal error in AvisosPage:', error)
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center p-8 bg-black">
        <h2 className="text-xl font-bold text-white mb-2">Error de conexión</h2>
        <p className="text-zinc-500 text-sm max-w-xs">
          Hubo un problema al cargar los avisos. Por favor, actualiza la página o contacta a soporte.
        </p>
      </div>
    )
  }
}

