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

  // Determine user role and context using admin client to bypass RLS issues
  const adminSupabase = createAdminClient()
  
  const { data: orgUser } = await adminSupabase
    .from('organization_users')
    .select('organization_id, role_new')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: resident } = await adminSupabase
    .from('residents')
    .select('*, condominiums(organization_id)')
    .eq('user_id', user.id)
    .maybeSingle()

  // 3. Fallback: If not in organization_users, check if they are the OWNER of any organization
  let finalOrganizationId = orgUser?.organization_id || resident?.condominiums?.organization_id
  let userRole = orgUser?.role_new || 'admin_propiedad' // Default to admin for owners

  if (!finalOrganizationId) {
    const { data: ownedOrg } = await adminSupabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle()
    
    if (ownedOrg) {
      finalOrganizationId = ownedOrg.id
    }
  }

  if (!finalOrganizationId) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-zinc-500">
        No se encontró un contexto de organización para este usuario.
      </div>
    )
  }

  // Unified announcement fetch
  
  // Unified announcement fetch
  const { data: initialAnnouncements } = await adminSupabase
    .from('announcements')
    .select('*')
    .eq('organization_id', finalOrganizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch available condominiums for filtering
  const { data: availableCondos } = await adminSupabase
    .from('condominiums')
    .select('id, name')
    .eq('organization_id', finalOrganizationId)
    .eq('status', 'active')

  // CASE 1: ADMINISTRATOR / OWNER
  // If orgUser exists OR it's not a resident, treat as Admin context
  if (orgUser || !resident) {
    const { data: rawPasses, error: passesError } = await adminSupabase
      .from('visitor_passes')
      .select('*')
      .eq('organization_id', finalOrganizationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (passesError) {
      console.error('[AvisosPage] Error fetching visitor_passes:', passesError)
    }

    const { data: rawAlerts, error: alertsError } = await adminSupabase
      .from('package_alerts')
      .select('*')
      .eq('organization_id', finalOrganizationId)
      .in('status', ['pending', 'received'])
      .order('created_at', { ascending: false })
      .limit(50)

    if (alertsError) {
      console.error('[AvisosPage] Error fetching package_alerts:', alertsError)
    }

    // No hay foreign key declarada de visitor_passes.unit_id / package_alerts.unit_id
    // hacia units.id en la base de datos, así que el embed de PostgREST
    // (`.select('*, units(condominium_id)')`) falla en silencio y devuelve
    // data=null. Resolvemos condominium_id nosotros mismos con una sola
    // consulta extra a `units`, sin depender de esa relación.
    const unitIds = Array.from(new Set([
      ...(rawPasses || []).map((p: any) => p.unit_id),
      ...(rawAlerts || []).map((a: any) => a.unit_id),
    ].filter(Boolean)))

    let unitCondoMap: Record<string, string> = {}
    if (unitIds.length > 0) {
      const { data: unitsData } = await adminSupabase
        .from('units')
        .select('id, condominium_id')
        .in('id', unitIds)

      unitCondoMap = Object.fromEntries(
        (unitsData || []).map((u: any) => [u.id, u.condominium_id])
      )
    }

    const attachCondo = (row: any) => ({
      ...row,
      units: { condominium_id: unitCondoMap[row.unit_id] || null },
    })

    const initialPasses = (rawPasses || []).map(attachCondo)
    const initialAlerts = (rawAlerts || []).map(attachCondo)

    const admin = {
      ...user,
      organization_id: finalOrganizationId,
      role: userRole,
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
          availableCondos={availableCondos || []}
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
