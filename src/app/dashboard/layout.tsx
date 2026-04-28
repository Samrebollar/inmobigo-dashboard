import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { LayoutDashboard, Building2, Users, Receipt, Settings, Wrench, BarChart3, Search, LogOut, User, CreditCard, AlertTriangle, Wallet, Zap, Home, HelpCircle, Bell, Smartphone, Sparkles, Brain, CheckCircle } from 'lucide-react'
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
        .select(`
            role_new,
            organizations (
                business_type
            )
        `)
        .eq('user_id', user.id)
        .single()

    const businessType = (orgUser?.organizations as any)?.business_type || 'condominio'
    const isPropiedades = businessType === 'propiedades'

    // 2. Check if Resident (STRICT: Must be in residents)
    const { data: resident } = await supabase
        .from('residents')
        .select('id, first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle()

    const isMetadataResident = user.user_metadata?.role === 'resident'

    // 3. Get Profile for Name fallback and Avatar
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role_new')
        .eq('id', user.id)
        .maybeSingle()

    // Construction of Name + First Surname
    let displayName = 'Usuario'
    let avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture

    if (resident?.first_name) {
        const firstSurname = resident.last_name ? resident.last_name.split(' ')[0] : ''
        displayName = `${resident.first_name} ${firstSurname}`.trim()
    } else {
        // Admin / Other
        // Priority: Profile Name -> Metadata Full Name -> Metadata First/Last -> Email parts
        const metaFirstName = user.user_metadata?.first_name
        const metaLastName = user.user_metadata?.last_name
        const metaFullName = user.user_metadata?.full_name

        const rawName = profile?.full_name || metaFullName || (metaFirstName ? `${metaFirstName} ${metaLastName || ''}` : '') || user.email?.split('@')[0] || ''
        
        if (rawName.trim()) {
            const parts = rawName.trim().split(' ')
            if (parts.length >= 2) {
                // Take first two words (Name and First Surname roughly)
                displayName = `${parts[0]} ${parts[1]}`
            } else {
                displayName = rawName.trim()
            }
        }
    }

    // Determine Role
    let role = 'viewer'

    if (orgUser?.role_new) {
        role = orgUser.role_new
    } else if (profile?.role_new && profile.role_new !== 'resident') {
        // Priority to Admin/Staff from DB
        role = profile.role_new
    } else if (user.user_metadata?.role === 'admin') {
        // Trust metadata for NEW admins if DB is not updated yet
        role = 'admin'
    } else if (resident || profile?.role_new === 'resident' || isMetadataResident) {
        role = 'resident'
    }

    // Check Subscription for Demo Mode
    const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('subscription_status')
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')
        .maybeSingle()

    const isDemoMode = !activeSub && role !== 'resident'
    // Metadata is IGNORED for authorization to prevent "Self-declared Admins"

    const isResident = role === 'resident'

    // RBAC Logic for Sidebar
    const isStaff = ['owner', 'admin', 'manager', 'accountant', 'admin_condominio', 'admin_propiedad', 'staff', 'security'].includes(role)
    const isAdmin = ['owner', 'admin', 'admin_condominio', 'admin_propiedad'].includes(role)

    const showProperties = isStaff
    const showResidents = isStaff
    const showFinance = isStaff || isResident
    const showSettings = isAdmin
    const showMaintenance = true
    const showReports = isStaff
    const showNotices = isStaff

    const sidebarContent = (
        <>
            <div className="hidden lg:flex h-20 items-center border-b border-zinc-800 px-6">
                <Link href="/dashboard" className="flex items-center gap-3">
                    <img src="/logo-inmobigo.png" alt="InmobiGo Logo" className="h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                    <span className="text-xl font-bold tracking-tight text-white">InmobiGo</span>
                </Link>
            </div>
            <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {user.email === 'acostasamuel947@gmail.com' && (
                    <Link
                        href="/owner/dashboard"
                        className="flex items-center gap-3 rounded-md bg-indigo-500/10 px-3 py-2.5 text-sm font-bold text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all mb-4"
                    >
                        <LayoutDashboard size={18} />
                        <span>Panel de Dueño</span>
                    </Link>
                )}

                <Link
                    href="/dashboard"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                </Link>

                {showProperties && (
                    <Link
                        href="/dashboard/propiedades"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <Building2 size={18} />
                        <span>{isPropiedades ? 'Portafolio de Propiedades' : 'Propiedades'}</span>
                    </Link>
                )}

                {showResidents && (
                    <Link
                        href="/dashboard/residentes"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <Users size={18} />
                        <span>{isPropiedades ? 'Inquilinos' : 'Residentes'}</span>
                    </Link>
                )}

                {showFinance && (
                    <>
                        <Link
                            href={isResident ? "/dashboard/payments" : "/dashboard/finance"}
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <CreditCard size={18} />
                            <span>{isResident ? 'Pagos' : (isPropiedades ? 'Rentas' : 'Finanzas')}</span>
                        </Link>
                        {!isResident && (
                            <Link
                                href="/dashboard/contabilidad-inteligente"
                                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-indigo-500/20"
                            >
                                <Brain size={18} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                                <span>Contabilidad Inteligente</span>
                            </Link>
                        )}
                        {!isResident && (
                            <Link
                                href="/dashboard/validacion-pagos"
                                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-indigo-500/20"
                            >
                                <CheckCircle size={18} className="text-zinc-400" />
                                <span>Validación de Pagos</span>
                            </Link>
                        )}
                    </>
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

                {isResident && (
                    <>
                        <Link
                            href="/dashboard/transparencia"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-indigo-500/20"
                        >
                            <BarChart3 size={18} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                            <span>{isPropiedades ? 'Finanzas del Portafolio' : 'Finanzas del Condominio'}</span>
                        </Link>
                        <Link
                            href="/dashboard/amenidades"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <LayoutDashboard size={18} />
                            <span>Amenidades</span>
                        </Link>
                        <Link
                            href="/dashboard/servicios"
                            className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-indigo-500/20"
                        >
                            <Smartphone size={18} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                            <span>Servicios</span>
                        </Link>
                    </>
                )}

                {showReports && (
                    <Link
                        href="/dashboard/reportes"
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <BarChart3 size={18} />
                        <span>Reportes</span>
                    </Link>
                )}

                {showNotices && (
                    <>
                        <Link
                            href="/dashboard/morosos"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-rose-500/20"
                        >
                            <AlertTriangle size={18} className="text-rose-500/80 group-hover:text-rose-400" />
                            <span>Morosos</span>
                        </Link>
                        <Link
                            href="/dashboard/avisos"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-amber-500/20"
                        >
                            <Bell size={18} className="text-amber-500/80 group-hover:text-amber-400" />
                            <span>Avisos</span>
                        </Link>
                        <Link
                            href="/dashboard/premium-services"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-indigo-500/20"
                        >
                            <Sparkles size={18} className="text-indigo-400" />
                            <span>Servicios Premium</span>
                        </Link>
                    </>
                )}

                <div className="my-4 border-t border-zinc-800/50"></div>

                {showSettings && (
                    <>
                        <Link
                            href="/dashboard/configuracion/planes"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <CreditCard size={18} />
                            <span>Planes</span>
                        </Link>
                        <Link
                            href="/dashboard/integrations"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Zap size={18} />
                            <span>Integraciones</span>
                        </Link>
                        <Link
                            href="/dashboard/configuracion"
                            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <Settings size={18} />
                            <span>Configuración</span>
                        </Link>
                    </>
                )}
            </nav>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 space-y-1">
                <Link
                    href="/dashboard/perfil"
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <User size={18} />
                    <span>Perfil</span>
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
