import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { LayoutDashboard, Building2, Users, Receipt, Settings, Wrench, BarChart3, Search, LogOut, User, CreditCard, AlertTriangle, Wallet, Zap } from 'lucide-react'
import { DashboardLayoutClient } from '@/components/dashboard/dashboard-layout-client'

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
    const isStaff = ['owner', 'admin', 'manager', 'accountant'].includes(role)
    const isAdmin = ['owner', 'admin'].includes(role)

    const showProperties = isStaff
    const showResidents = isStaff
    const showFinance = isStaff || isResident
    const showSettings = isAdmin
    const showMaintenance = true
    const showReports = isStaff

    const sidebarContent = (
        <>
            <div className="hidden lg:flex h-20 items-center border-b border-zinc-800 px-6">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <img src="/logo-inmobigo.png" alt="InmobiGo Logo" className="h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                    <span className="text-xl font-bold tracking-tight text-white">InmobiGo</span>
                </Link>
            </div>
            <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                </Link>

                {showProperties && (
                    <Link
                        href="/dashboard/properties"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <Building2 size={18} />
                        <span>Propiedades</span>
                    </Link>
                )}

                {showResidents && (
                    <Link
                        href="/dashboard/residents"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <Users size={18} />
                        <span>Residentes</span>
                    </Link>
                )}

                {showFinance && (
                    <Link
                        href="/dashboard/finance"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <Receipt size={18} />
                        <span>Finanzas</span>
                    </Link>
                )}

                {showMaintenance && (
                    <Link
                        href="/dashboard/maintenance"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <Wrench size={18} />
                        <span>Mantenimiento</span>
                    </Link>
                )}

                {showReports && (
                    <Link
                        href="/dashboard/reports"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <BarChart3 size={18} />
                        <span>Reportes</span>
                    </Link>
                )}

                <div className="my-4 border-t border-zinc-800/50"></div>

                {showSettings && (
                    <>
                        <Link
                            href="/dashboard/settings/plans"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <CreditCard size={18} />
                            <span>Planes</span>
                        </Link>
                        <Link
                            href="/dashboard/payments"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Zap size={18} />
                            <span>Integraciones</span>
                        </Link>
                        <Link
                            href="/dashboard/settings"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Settings size={18} />
                            <span>Configuración</span>
                        </Link>
                    </>
                )}
            </nav>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                <Link href="/dashboard/profile" className="flex items-center gap-3 mb-4 text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                    <User size={18} />
                    <span>Mi Perfil</span>
                </Link>
                <form action={logout}>
                    <button className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                        <LogOut size={18} />
                        <span>Cerrar Sesión</span>
                    </button>
                </form>
            </div>
        </>
    )

    return (
        <DashboardLayoutClient
            sidebarContent={sidebarContent}
            displayName={displayName}
            avatarUrl={avatarUrl}
            isDemoMode={isDemoMode}
            headerActions={
                <input
                    type="text"
                    placeholder="Buscar en todo el sistema..."
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-500"
                />
            }
        >
            {children}
        </DashboardLayoutClient>
    )
}
