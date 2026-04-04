import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { AvisosClient } from '@/components/dashboard/avisos-client'

export const dynamic = 'force-dynamic'

export default async function AvisosPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: orgUser } = await supabase
    .from('organization_users')
    .select('organization_id, role')
    .eq('user_id', user.id)
    .single()

  // Bypassing RLS for initial data load: Use admin client to see all organization data
  const adminSupabase = createAdminClient()
  
  const { data: initialPasses } = await adminSupabase
    .from('visitor_passes')
    .select('*')
    .eq('organization_id', orgUser?.organization_id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: initialAlerts } = await adminSupabase
    .from('package_alerts')
    .select('*')
    .eq('organization_id', orgUser?.organization_id)
    .in('status', ['pending', 'received'])
    .order('created_at', { ascending: false })
    .limit(50)

  // For visual backwards compatibility, construct a unified "admin" object
  const admin = {
    ...user,
    organization_id: orgUser?.organization_id,
    role: orgUser?.role,
    serverPassCount: initialPasses?.length || 0,
    serverAlertCount: initialAlerts?.length || 0
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">
      <AvisosClient 
        admin={admin} 
        initialPasses={initialPasses || []} 
        initialAlerts={initialAlerts || []} 
      />
    </div>
  )
}
