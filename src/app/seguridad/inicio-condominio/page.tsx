import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { DashboardHeader } from '@/components/seguridad/seguridadHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DollarSign, Building, Users, Activity, TrendingUp, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Wrench } from 'lucide-react'
import AdminDashboardCondominioClient from '@/components/seguridad/admin-dashboard-condominio-client'
import ResidentDashboardCondominioClient from '@/components/seguridad/resident-dashboard-condominio-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const forceView = params.view
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div>No autenticado</div>

  // 1. Get Profile for Name and Avatar
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  const metaFirstName = user.user_metadata?.first_name
  const metaLastName = user.user_metadata?.last_name
  const metaFullName = user.user_metadata?.full_name
  
  const fullName = profile?.full_name || metaFullName || (metaFirstName ? `${metaFirstName} ${metaLastName || ''}` : '') || ''
  const firstName = fullName ? fullName.trim().split(' ')[0] : (user.email?.split('@')[0] || 'Usuario')

  const adminSupabase = createAdminClient()

  // 2. Determine Identity (Admin vs Resident)
  // Check if Admin (Owner/Staff)
  const { data: orgUser } = await adminSupabase
    .from('organization_users')
    .select('role, organization:organizations(*)')
    .eq('user_id', user.id)
    .maybeSingle()

  // Check if Resident
  const { data: resident, error: residentError } = await supabase
    .from('residents')
    .select('*, condominiums(name, organization_id), units(unit_number)')
    .eq('user_id', user.id)
    .maybeSingle()

  const isMetadataResident = user.user_metadata?.role === 'resident'
  const isResident = !!resident || isMetadataResident || forceView === 'resident'

  // --- RESIDENT VIEW ---
  // If forceView=resident is present in the URL, or user is metadata resident or in residents table
  if (isResident) {
    const mockResident = {
      ...(resident || {
        first_name: firstName,
        last_name: '',
        condominiums: { name: 'Condominio Demo' },
        units: { unit_number: 'A-101' },
        debt_amount: 2500,
        last_payment_amount: 2500,
        active_tickets_count: 1,
        paid_installments_count: 10,
      }),
      user_id: user.id,
      organization_id: resident?.organization_id || (resident?.condominiums as any)?.organization_id || orgUser?.organization?.id || user.user_metadata?.organization_id
    }
    
    return (
      <>
        {/* DEBUG/DEMO FLAG */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
           <div className="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg text-center">
            VISTA: RESIDENTE ACTIVADA
          </div>
          {forceView === 'resident' && (
            <Link href="/seguridad" className="bg-zinc-800 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg hover:bg-zinc-700 text-center">
              VOLVER A ADMIN
            </Link>
          )}
        </div>
        <ResidentDashboardCondominioClient 
          resident={mockResident} 
          userName={firstName} 
        />
      </>
    )
  }

  // --- ADMIN VIEW ---
  // Fallback to previous logic for Org Owner
  // We use the fetched orgUser to get organization
  // If not in orgUser, try fetching Organization directly as owner (legacy check)

  let organization: any = orgUser?.organization

  if (!organization) {
    // Fallback: Check if owner directly
    const { data: ownerOrg } = await adminSupabase
      .from('organizations')
      .select(`*`)
      .eq('owner_id', user.id)
      .maybeSingle()
    organization = ownerOrg as any
  }

  // --- UNAUTHENTICATED / UNCONFIGURED STATE ---
  if (!organization) {
    const userRole = user.user_metadata?.role || user.user_metadata?.user_type || profile?.role
    const isIntendedAdmin = ['admin', 'owner', 'admin_condominio', 'admin_propiedad', 'admin_propiedades'].includes(userRole)

    const isPropertyManager = userRole === 'admin_propiedad' || userRole === 'admin_propiedades'
    
    const emptyTitle = isPropertyManager 
      ? 'Configura tu Portafolio' 
      : 'Configura tu Condominio'

    const emptyDesc = isPropertyManager
      ? 'Tu cuenta está lista. Ahora necesitas registrar tu primer portafolio para comenzar a gestionar propiedades.'
      : 'Para comenzar, necesitas registrar tu organización o condominio.'

    const buttonLabel = isPropertyManager ? 'Ir a Propiedades' : 'Crear Organización'
    // Redirect to the module where they can actually create the items
    const buttonHref = isPropertyManager ? '/seguridad/propiedades' : '/onboarding'

    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="rounded-full bg-zinc-900 p-4 ring-1 ring-white/10">
          <Activity className="h-10 w-10 text-indigo-500" />
        </div>

        <div className="max-w-md space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isIntendedAdmin ? emptyTitle : 'Cuenta no vinculada'}
          </h1>
          <p className="text-zinc-400">
            {isIntendedAdmin
              ? emptyDesc
              : 'Tu cuenta ha sido creada, pero aún no estás vinculado a ninguna unidad.'}
          </p>
        </div>

        {isIntendedAdmin && (
          <div className="w-full max-w-sm">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-10 shadow-lg shadow-indigo-500/20">
              <Link href={buttonHref} className="w-full h-full flex items-center justify-center">
                {buttonLabel}
              </Link>
            </Button>
          </div>
        )}

        {!isIntendedAdmin && (
          <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-sm text-zinc-500">
            Tu correo: <span className="text-white font-medium">{user.email}</span>
          </div>
        )}
      </div>
    )
  }

  // --- SUBSCRIPTION STATUS ---
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('next_payment_date, subscription_status')
    .eq('organization_id', organization.id)
    .maybeSingle()

  let daysRemaining = 999
  if (subscription?.next_payment_date) {
    const nextPayment = new Date(subscription.next_payment_date)
    const now = new Date()
    const diffTime = nextPayment.getTime() - now.getTime()
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  // Rest of Admin Dashboard Logic (Stats, Charts)
  // Reuse existing variables but scoped correctly
  const { data: activeCondominiums } = await adminSupabase
    .from('condominiums')
    .select('id, units_total')
    .eq('organization_id', organization.id)
    .eq('status', 'active')

  const activeIds = activeCondominiums?.map((c: any) => c.id) || []
  const totalUnits = activeCondominiums?.reduce((acc: number, c: any) => acc + c.units_total, 0) || 0

  // Finances
  let totalFacturado = 0
  let totalCobrado = 0
  let recentActivity: any[] = []
  let incidenciasPendientes = 0

  if (activeIds.length > 0) {
    const { data: invoices } = await adminSupabase
      .from('invoices')
      .select('id, amount, status, updated_at, condominiums(name), units(unit_number), residents(first_name, last_name)')
      .in('condominium_id', activeIds)
      .order('updated_at', { ascending: false })

    invoices?.forEach(inv => {
      totalFacturado += inv.amount
      if (inv.status === 'paid') totalCobrado += inv.amount
    })

    // Fetch Tickets
    const { data: tickets } = await adminSupabase
      .from('tickets')
      .select('id, title, status, created_at, condominiums(name), units(unit_number)')
      .in('condominium_id', activeIds)
      .order('created_at', { ascending: false })
      .limit(10)

    // Fetch Residents
    const { data: residents } = await adminSupabase
      .from('residents')
      .select('id, first_name, last_name, created_at, condominiums(name), units(unit_number)')
      .in('condominium_id', activeIds)
      .order('created_at', { ascending: false })
      .limit(10)

    // Combine into Unified Activity Feed
    const aiInvoices = (invoices || [])
      .filter(inv => inv.status === 'paid' || inv.status === 'overdue')
      .map(inv => ({
        id: `inv_${inv.id}`,
        type: inv.status === 'paid' ? 'payment' : 'overdue',
        title: inv.status === 'paid' 
          ? `Pago recibido de ${inv.residents?.first_name || 'Residente'} ${(inv.residents as any)?.last_name || ''}` 
          : `Pago vencido de ${inv.units?.unit_number || 'Unidad'}`,
        subtitle: `${inv.condominiums?.name || 'Condominio'} - ${inv.units?.unit_number || 'Unidad'}`,
        amount: inv.amount,
        date: new Date(inv.updated_at),
        status: inv.status
      }))

    const aiTickets = (tickets || []).map(t => ({
      id: `tkt_${t.id}`,
      type: 'incident',
      title: `Nueva incidencia: ${t.title}`,
      subtitle: `${t.condominiums?.name || 'Condominio'} - ${t.units?.unit_number || 'Unidad'}`,
      date: new Date(t.created_at),
      status: t.status
    }))

    const aiResidents = (residents || []).map(r => ({
      id: `res_${r.id}`,
      type: 'resident',
      title: `Nuevo residente agregado: ${r.first_name} ${r.last_name}`,
      subtitle: `${r.condominiums?.name || 'Condominio'} - ${r.units?.unit_number || 'Unidad'}`,
      date: new Date(r.created_at),
      status: 'active'
    }))

    recentActivity = [...aiInvoices, ...aiTickets, ...aiResidents]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)

    // Calculate Pending Incidents count
    const { count: pendingTicketsCount } = await adminSupabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('condominium_id', activeIds)
      .in('status', ['pending', 'in_progress', 'open'])
    
    incidenciasPendientes = pendingTicketsCount || 0
  }

  // const tasaCobranza = totalFacturado > 0 ? ((totalCobrado / totalFacturado) * 100).toFixed(1) : '0'

  return (
    <AdminDashboardCondominioClient
      userEmail={user.email}
      userName={firstName}
      daysRemaining={daysRemaining}
      stats={{
        totalFacturado,
        totalCobrado,
        activeCount: activeIds.length,
        totalUnits: totalUnits,
        incidenciasPendientes,
        anuncios: 0
      }}
      recentActivity={recentActivity}
    />
  )
}
