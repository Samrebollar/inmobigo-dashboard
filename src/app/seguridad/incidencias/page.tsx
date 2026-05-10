import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Activity } from 'lucide-react'
import IncidenciasClient from '@/components/seguridad/incidencias/incidencias-client'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function IncidenciasPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
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

    // 2. Get Organization & Role Info
    const { data: orgUser } = await adminSupabase
      .from('organization_users')
      .select('organization_id, status, role_new')
      .eq('user_id', user.id)
      .maybeSingle()

    const { data: userCondos } = await adminSupabase
      .from('condominiums')
      .select('organization_id, name')
      .or(`admin_id.eq.${user.id},security_user_id.eq.${user.id}`)
      .limit(1)

    let finalOrganizationId = orgUser?.organization_id || 
                             (userCondos && userCondos.length > 0 ? userCondos[0].organization_id : null)

    if (!finalOrganizationId && (orgUser?.role_new === 'security' || profile?.role_new === 'security')) {
      const { data: anyOrg } = await adminSupabase.from('organizations').select('id').limit(1).maybeSingle()
      if (anyOrg) finalOrganizationId = anyOrg.id
    }

    const safeOrgId = finalOrganizationId || 'no-context'

    // 3. Fetch Condominium Name
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

    // 4. Fetch all available condominiums
    const { data: availableCondos } = await adminSupabase
      .from('condominiums')
      .select('id, name')
      .eq('organization_id', safeOrgId)
      .eq('status', 'active')

    return (
      <IncidenciasClient
        userEmail={user.email}
        userName={firstName}
        condoName={condoName || 'InmobiGo Control'}
        organizationId={safeOrgId}
        availableCondos={availableCondos || []}
      />
    )

  } catch (error) {
    console.error('Fatal error in IncidenciasPage:', error)
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center p-8 bg-black">
        <div className="rounded-full bg-zinc-900 p-4 ring-1 ring-white/10 mb-4">
          <Activity className="h-10 w-10 text-rose-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Error de carga</h2>
        <p className="text-zinc-400 text-sm max-w-xs">
          No pudimos cargar el panel de incidencias. Por favor verifica tu conexión o contacta al administrador.
        </p>
      </div>
    )
  }
}
