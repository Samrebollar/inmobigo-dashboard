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

  if (!user) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-black text-zinc-500">
        Sesión no encontrada. Por favor inicia sesión de nuevo.
      </div>
    )
  }

  try {
    const adminSupabase = createAdminClient()

    // 1. Get Profile for Name
    const { data: profile } = await adminSupabase
      .from('profiles')
      .select('full_name, avatar_url, role_new')
      .eq('id', user.id)
      .maybeSingle()

    const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario'
    const firstName = fullName.trim().split(' ')[0]

    // 2. Get Organization & Role Info (Multiple fallback strategy)
    const { data: orgUser } = await adminSupabase
      .from('organization_users')
      .select('organization_id, status, role_new')
      .eq('user_id', user.id)
      .maybeSingle()

    // Check if security user is linked via condominiums
    const { data: userCondos } = await adminSupabase
      .from('condominiums')
      .select('organization_id, name')
      .or(`admin_id.eq.${user.id},security_user_id.eq.${user.id}`)
      .limit(1)

    // Determine final context
    let finalOrganizationId = orgUser?.organization_id || 
                             (userCondos && userCondos.length > 0 ? userCondos[0].organization_id : null)

    // AUTO-ACTIVATION: If pending, make active
    if (orgUser && orgUser.status === 'pending') {
      await adminSupabase
        .from('organization_users')
        .update({ status: 'active', invited_at: new Date().toISOString() })
        .eq('user_id', user.id)
    }

    // If still no org, try fallback to any organization for staff/security
    if (!finalOrganizationId && (orgUser?.role_new === 'security' || profile?.role_new === 'security')) {
      const { data: anyOrg } = await adminSupabase.from('organizations').select('id').limit(1).maybeSingle()
      if (anyOrg) finalOrganizationId = anyOrg.id
    }

    const safeOrgId = finalOrganizationId || 'no-context'

    // 3. Fetch Condominium Name (Either from assigned condo or organization default)
    let condoName = userCondos && userCondos.length > 0 ? userCondos[0].name : null

    if (!condoName) {
        const { data: condoFallback } = await adminSupabase
          .from('condominiums')
          .select('name')
          .eq('organization_id', safeOrgId)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()
        condoName = condoFallback?.name
    }

    // 4. Fetch Statistics safely
    let pendingTicketsCount = 0
    try {
      const { count } = await adminSupabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', safeOrgId)
        .in('status', ['pending', 'in_progress', 'open'])
      pendingTicketsCount = count || 0
    } catch (e) {
      console.error('Error fetching tickets count:', e)
    }

    return (
      <SecurityDashboardAdminClient
        userEmail={user.email}
        userName={firstName}
        condoName={condoName || 'InmobiGo Control'}
        stats={{
          incidenciasPendientes: pendingTicketsCount,
          anuncios: 0
        }}
        recentActivity={[]}
      />
    )

  } catch (error) {
    console.error('Fatal error in SecurityDashboardPage:', error)
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center p-8 bg-black">
        <div className="rounded-full bg-zinc-900 p-4 ring-1 ring-white/10 mb-4">
          <Activity className="h-10 w-10 text-indigo-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Error de carga</h2>
        <p className="text-zinc-400 text-sm max-w-xs">
          No pudimos cargar tu panel de control. Por favor verifica tu conexión o contacta al administrador.
        </p>
      </div>
    )
  }
}
