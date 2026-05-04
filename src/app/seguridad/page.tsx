import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Activity } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import SecurityDashboardAdminClient from '@/components/seguridad/security-dashboard-admin-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SecurityDashboardPage() {
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
       <div className="flex h-screen flex-col items-center justify-center p-10 text-center space-y-6">
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
    console.log(`✨ [Security Dashboard] Activando usuario ${user.email}...`);
    await adminSupabase
      .from('organization_users')
      .update({ status: 'active', invited_at: new Date().toISOString() })
      .eq('user_id', user.id)
  }

  const organizationId = orgUser.organization_id

  // 4. Fetch Active Condominiums for Stats
  const { data: activeCondominiums } = await adminSupabase
    .from('condominiums')
    .select('id, units_total')
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  const activeIds = activeCondominiums?.map((c: any) => c.id) || []
  const totalUnits = activeCondominiums?.reduce((acc: number, c: any) => acc + c.units_total, 0) || 0

  // 5. Fetch Activity
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

    const { data: tickets } = await adminSupabase
      .from('tickets')
      .select('id, title, status, created_at, condominiums(name), units(unit_number)')
      .in('condominium_id', activeIds)
      .order('created_at', { ascending: false })
      .limit(10)

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

    recentActivity = [...aiInvoices, ...aiTickets]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)

    const { count: pendingTicketsCount } = await adminSupabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('condominium_id', activeIds)
      .in('status', ['pending', 'in_progress', 'open'])
    
    incidenciasPendientes = pendingTicketsCount || 0
  }

  return (
    <SecurityDashboardAdminClient
      userEmail={user.email}
      userName={firstName}
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
