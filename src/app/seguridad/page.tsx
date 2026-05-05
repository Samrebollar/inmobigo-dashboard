import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Activity } from 'lucide-react'
import SecurityDashboardAdminClient from '@/components/seguridad/security-dashboard-admin-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SecurityDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div>No autenticado</div>

  // 1. Get Profile for Name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'
  const firstName = fullName.trim().split(' ')[0]

  const adminSupabase = createAdminClient()

  // 2. Get Organization & Role Info
  const { data: orgUser } = await adminSupabase
    .from('organization_users')
    .select('organization_id, status, role_new')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!orgUser) {
     return (
       <div className="flex h-screen flex-col items-center justify-center p-10 text-center space-y-6 bg-black">
         <div className="rounded-full bg-zinc-900 p-4 ring-1 ring-white/10">
           <Activity className="h-10 w-10 text-indigo-500" />
         </div>
         <div className="max-w-md space-y-2">
           <h1 className="text-3xl font-bold text-white tracking-tight">Acceso Restringido</h1>
           <p className="text-zinc-400">Tu cuenta no está vinculada a ninguna organización activa.</p>
         </div>
       </div>
     )
  }

  // 3. AUTO-ACTIVATION: If pending, make active
  if (orgUser.status === 'pending') {
    await adminSupabase
      .from('organization_users')
      .update({ status: 'active', invited_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }

  const organizationId = orgUser.organization_id

  // 4. Fetch Condominium Name
  const { data: condominium } = await adminSupabase
    .from('condominiums')
    .select('name')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()

  // 5. Fetch Pending Incidents Count
  const { count: pendingTicketsCount } = await adminSupabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'in_progress', 'open'])

  return (
    <SecurityDashboardAdminClient
      userEmail={user.email}
      userName={firstName}
      condoName={condominium?.name || 'InmobiGo Control'}
      stats={{
        incidenciasPendientes: pendingTicketsCount || 0,
        anuncios: 0
      }}
      recentActivity={[]}
    />
  )
}
