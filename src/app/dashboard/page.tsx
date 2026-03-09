import { createClient } from '@/utils/supabase/server'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DollarSign, Building, Users, Activity, TrendingUp, Home } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Wrench } from 'lucide-react'
import AdminDashboardClient from '@/components/dashboard/admin-dashboard-client'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div>No autenticado</div>

  // 1. Determine Identity (Admin vs Resident)
  // Check if Admin (Owner/Staff)
  const { data: orgUser } = await supabase
    .from('organization_users')
    .select('role, organization:organizations(*)')
    .eq('user_id', user.id)
    .single()

  // Check if Resident
  const { data: resident, error: residentError } = await supabase
    .from('residents')
    .select('*, condominiums(name), units(unit_number)')
    .eq('user_id', user.id)
    .single()

  // --- RESIDENT VIEW ---
  if (resident) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 md:space-y-8 p-4 md:p-6">
        <DashboardHeader userEmail={user.email} userName={resident.first_name} />

        <div className="grid gap-4 md:grid-gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {/* Condominium Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6 transition-all hover:border-indigo-500/50 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-indigo-500/10">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-2xl group-hover:bg-indigo-500/20 transition-all" />
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                <Building className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Condominio</h3>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {resident.condominiums?.name || 'No asignado'}
              </div>
            </div>
          </div>

          {/* Unit Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6 transition-all hover:border-emerald-500/50 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl group-hover:bg-emerald-500/20 transition-all" />
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <Home className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Tu Unidad</h3>
            </div>
            <div>
              <div className="text-xl md:text-2xl font-bold text-white tracking-tight">
                {resident.units?.unit_number || 'Sin asignar'}
              </div>
              <p className="text-xs font-medium text-emerald-500/70 mt-1 uppercase tracking-wider">
                {resident.units?.floor ? `Piso ${resident.units.floor}` : 'Privada'}
              </p>
            </div>
          </div>

          {/* Debt Card */}
          <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 md:p-6 transition-all hover:border-rose-500/50 hover:bg-zinc-900/80 hover:shadow-lg hover:shadow-rose-500/10">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-rose-500/10 blur-2xl group-hover:bg-rose-500/20 transition-all" />
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                <DollarSign className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400">Saldo Pendiente</h3>
            </div>
            <div>
              <div className={cn(
                "text-xl md:text-2xl font-bold tracking-tight",
                (resident.debt_amount || 0) > 0 ? "text-rose-500" : "text-emerald-500"
              )}>
                ${(resident.debt_amount || 0).toLocaleString()}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {(resident.debt_amount || 0) > 0 ? 'Pago requerido' : 'Al día'}
              </p>
            </div>
          </div>

          {/* Quick Action - Report Problem */}
          <div className="group relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 p-5 md:p-6 transition-all hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/20">
            <div className="flex flex-row md:flex-col items-center justify-start md:justify-center h-full gap-4 md:gap-3 text-left md:text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-400 transition-all group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white shadow-inner flex-shrink-0">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors text-sm md:text-base">Reportar Problema</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-[120px] md:mx-auto">Notificar mantenimiento</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity / Announcements Placeholder */}
        {/* Announcements Section */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Avisos Recientes</h3>
                <p className="text-sm text-zinc-400">Comunicados de la administración</p>
              </div>
            </div>
            <Button variant="ghost" className="text-xs text-zinc-500 hover:text-white">
              Ver historial
            </Button>
          </div>

          <div className="space-y-4">
            {/* Mock Announcement 1 */}
            <div className="group flex flex-col gap-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-800/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                  <span className="text-xs font-medium text-indigo-400">Mantenimiento</span>
                </div>
                <span className="text-xs text-zinc-500">Hace 2 horas</span>
              </div>
              <div>
                <h4 className="font-medium text-white group-hover:text-indigo-400 transition-colors">Limpieza de Cisterna Programada</h4>
                <p className="mt-1 text-sm text-zinc-400">
                  Se realizará mantenimiento preventivo el día Jueves 20. El servicio de agua podría verse interrumpido de 10am a 2pm.
                </p>
              </div>
            </div>

            {/* Mock Announcement 2 */}
            <div className="group flex flex-col gap-2 rounded-xl border border-zinc-800/50 bg-zinc-900/50 p-4 transition-all hover:border-zinc-700 hover:bg-zinc-800/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-xs font-medium text-emerald-400">Administrativo</span>
                </div>
                <span className="text-xs text-zinc-500">Ayer</span>
              </div>
              <div>
                <h4 className="font-medium text-white group-hover:text-emerald-400 transition-colors">Reunión de Condóminos</h4>
                <p className="mt-1 text-sm text-zinc-400">
                  Recordatorio: La asamblea general será este fin de mes en el salón de usos múltiples.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- ADMIN VIEW ---
  // Fallback to previous logic for Org Owner
  // We use the fetched orgUser to get organization
  // If not in orgUser, try fetching Organization directly as owner (legacy check)

  let organization: any = orgUser?.organization

  if (!organization) {
    // Fallback: Check if owner directly (removed inner join for subscriptions to allow demo mode)
    const { data: ownerOrg } = await supabase
      .from('organizations')
      .select(`*`)
      .eq('owner_id', user.id)
      .maybeSingle()
    organization = ownerOrg as any
  }

  // --- UNAUTHENTICATED / UNCONFIGURED STATE ---
  if (!organization) {
    const isIntendedAdmin = user.user_metadata?.role === 'admin'

    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-10 text-center space-y-6">
        <div className="rounded-full bg-zinc-900 p-4 ring-1 ring-white/10">
          <Activity className="h-10 w-10 text-indigo-500" />
        </div>

        <div className="max-w-md space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            {isIntendedAdmin ? 'Configura tu Condominio' : 'Cuenta no vinculada'}
          </h1>
          <p className="text-zinc-400">
            {isIntendedAdmin
              ? 'Para comenzar, necesitas registrar tu organización o condominio.'
              : 'Tu cuenta ha sido creada, pero aún no estás vinculado a ninguna unidad.'}
          </p>
          {!isIntendedAdmin && residentError && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400 font-mono text-left">
              Error Code: {residentError.code}<br />
              Message: {residentError.message}<br />
              Details: {residentError.details}
            </div>
          )}
        </div>

        {isIntendedAdmin && (
          <div className="w-full max-w-sm">
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-10">
              <Link href="/onboarding" className="w-full h-full flex items-center justify-center">Crear Organización</Link>
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

  // Rest of Admin Dashboard Logic (Stats, Charts)
  // Reuse existing variables but scoped correctly
  const { data: activeCondominiums } = await supabase
    .from('condominiums')
    .select('id, units_total')
    .eq('organization_id', organization.id)
    .eq('status', 'active')

  const activeIds = activeCondominiums?.map((c: any) => c.id) || []
  const totalUnits = activeCondominiums?.reduce((acc: number, c: any) => acc + c.units_total, 0) || 0

  // Finances
  let totalFacturado = 0
  let totalCobrado = 0
  let facturasVencidas = 0

  if (activeIds.length > 0) {
    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount, status')
      .in('condominium_id', activeIds)

    invoices?.forEach(inv => {
      totalFacturado += inv.amount
      if (inv.status === 'paid') totalCobrado += inv.amount
      if (inv.status === 'overdue') facturasVencidas++
    })
  }

  const tasaCobranza = totalFacturado > 0 ? ((totalCobrado / totalFacturado) * 100).toFixed(1) : '0'

  return (
    <AdminDashboardClient
      userEmail={user.email}
      stats={{
        totalFacturado,
        totalCobrado,
        facturasVencidas,
        activeCount: activeIds.length,
        totalUnits: totalUnits,
        tasaCobranza
      }}
    />
  )
}
