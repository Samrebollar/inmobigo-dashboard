import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { LayoutDashboard, Building2, Users, Receipt, Settings, Wrench, BarChart3, Search, LogOut, User, CreditCard, AlertTriangle, Wallet } from 'lucide-react'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Check if Admin/Staff (STRICT: Must be in organization_users)
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('role')
        .eq('user_id', user.id)
        .single()

    // 2. Check if Resident (STRICT: Must be in residents)
    const { data: resident } = await supabase
        .from('residents')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .single()

    // 3. Get Profile for Name fallback and Avatar
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single()

    // Construction of Name + First Surname
    let displayName = 'Usuario'
    let avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture

    if (resident?.first_name) {
        const firstSurname = resident.last_name ? resident.last_name.split(' ')[0] : ''
        displayName = `${resident.first_name} ${firstSurname}`.trim()
    } else {
        // Admin / Other
        const rawName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || ''
        if (rawName) {
            const parts = rawName.split(' ')
            if (parts.length >= 2) {
                // Take first two words (Name and First Surname roughly)
                displayName = `${parts[0]} ${parts[1]}`
            } else {
                displayName = rawName
            }
        }
    }

    // Determine Role
    let role = 'viewer'

    if (orgUser?.role) {
        role = orgUser.role
    } else if (resident) {
        role = 'resident'
    }

    // Check Subscription for Demo Mode
    const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('subscription_status')
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')
        .maybeSingle()

    const isDemoMode = !activeSub
    // Metadata is IGNORED for authorization to prevent "Self-declared Admins"

    const isResident = role === 'resident'

    // RBAC Logic for Sidebar
    // Admin/Staff roles
    const isStaff = ['owner', 'admin', 'manager', 'accountant'].includes(role)
    const isAdmin = ['owner', 'admin'].includes(role)

    // Visibility
    const showProperties = isStaff
    const showResidents = isStaff

    // Finance: Staff sees everything, Residents see their own 
    const showFinance = isStaff || isResident

    const showSettings = isAdmin
    const showMaintenance = true
    const showReports = isStaff

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white">
            {/* Sidebar */}
            <aside className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl flex flex-col">
                <div className="flex h-16 items-center border-b border-zinc-800 px-6">
                    <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2" suppressHydrationWarning>
                        <div className="h-6 w-6 rounded bg-indigo-600"></div>
                        <span suppressHydrationWarning>InmobiGo</span>
                    </span>
                </div>
                <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <LayoutDashboard size={18} />
                        <span suppressHydrationWarning>Dashboard</span>
                    </Link>

                    {showProperties && (
                        <Link
                            href="/dashboard/properties"
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Building2 size={18} />
                            <span suppressHydrationWarning>Propiedades</span>
                        </Link>
                    )}

                    {showResidents && (
                        <Link
                            href="/dashboard/residents"
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Users size={18} />
                            <span suppressHydrationWarning>Residentes</span>
                        </Link>
                    )}

                    {showFinance && (
                        <Link
                            href="/dashboard/finance"
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Receipt size={18} />
                            <span suppressHydrationWarning>Finanzas</span>
                        </Link>
                    )}

                    {showMaintenance && (
                        <Link
                            href="/dashboard/maintenance"
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Wrench size={18} />
                            <span suppressHydrationWarning>Mantenimiento</span>
                        </Link>
                    )}

                    {showReports && (
                        <Link
                            href="/dashboard/reports"
                            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <BarChart3 size={18} />
                            <span suppressHydrationWarning>Reportes</span>
                        </Link>
                    )}

                    <div className="my-2 border-t border-zinc-800/50"></div>

                    {showSettings && (
                        <>
                            <Link
                                href="/dashboard/settings/plans"
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                                <CreditCard size={18} />
                                <span suppressHydrationWarning>Planes</span>
                            </Link>
                            <Link
                                href="/dashboard/settings/payments"
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                                <Wallet size={18} />
                                <span suppressHydrationWarning>Pagos y Cobranza</span>
                            </Link>
                            <Link
                                href="/dashboard/settings"
                                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                                <Settings size={18} />
                                <span suppressHydrationWarning>Configuración</span>
                            </Link>
                        </>
                    )}
                </nav>
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                    <Link href="/dashboard/profile" className="flex items-center gap-3 mb-4 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                        <User size={18} />
                        <span suppressHydrationWarning>Mi Perfil</span>
                    </Link>
                    <form action={logout}>
                        <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                            <LogOut size={18} />
                            <span suppressHydrationWarning>Cerrar Sesión</span>
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-zinc-950 flex flex-col">
                {isDemoMode && (
                    <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <p className="text-xs font-medium text-amber-200/80">
                                <span className="font-bold text-amber-500 uppercase tracking-wider mr-2">Modo Demo:</span>
                                Estás previsualizando las funciones del dashboard. Suscríbete para activar todas las herramientas.
                            </p>
                        </div>
                        <Link
                            href="/dashboard/settings/plans"
                            className="text-[10px] font-black uppercase tracking-widest bg-amber-500 text-black px-4 py-1.5 rounded hover:bg-amber-400 transition-colors"
                        >
                            Ver Planes
                        </Link>
                    </div>
                )}
                <header className="flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-900/50 px-6 backdrop-blur-xl sticky top-0 z-10">
                    <div className="flex items-center gap-4 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800 text-zinc-400 focus-within:border-indigo-500/50 focus-within:text-white transition-colors w-96">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Buscar en todo el sistema..."
                            className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-500"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <div className="text-sm font-medium text-white">
                                {displayName}
                            </div>
                            {/* Email removed as requested */}
                        </div>
                        <Link href="/dashboard/profile">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={displayName}
                                    className="h-9 w-9 rounded-full object-cover border-2 border-zinc-800 hover:border-indigo-500 transition-colors"
                                />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 cursor-pointer border-2 border-zinc-800 hover:border-indigo-500 transition-colors"></div>
                            )}
                        </Link>
                    </div>
                </header>
                <div className="flex-1">
                    {children}
                </div>
            </main>
        </div>
    )
}
