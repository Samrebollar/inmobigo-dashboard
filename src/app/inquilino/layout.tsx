import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { LayoutDashboard, CreditCard, Wrench, BarChart3, User, LogOut, Smartphone, Sparkles, Bell } from 'lucide-react'
import { DashboardLayoutClient } from '@/components/dashboard/dashboard-layout-client'

export default async function InquilinoLayout({
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

    // STRICT: Must be in organization_users or residents
    const { data: resident } = await supabase
        .from('residents')
        .select('id, first_name, last_name, condominium_id')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, role_new')
        .eq('id', user.id)
        .maybeSingle()

    let displayName = 'Inquilino'
    let avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture

    if (resident?.first_name) {
        const firstSurname = resident.last_name ? resident.last_name.split(' ')[0] : ''
        displayName = `${resident.first_name} ${firstSurname}`.trim()
    } else if (profile?.full_name) {
        displayName = profile.full_name
    }

    const isPropiedades = true // Typically true for Tenants in portfolio setups

    const sidebarContent = (
        <>
            <div className="hidden lg:flex h-20 items-center border-b border-zinc-800 px-6">
                <Link href="/inquilino" className="flex items-center gap-3">
                    <img src="/logo-inmobigo.png" alt="InmobiGo Logo" className="h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                    <span className="text-xl font-bold tracking-tight text-white">InmobiGo</span>
                </Link>
            </div>
            <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                <Link
                    href="/inquilino"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                </Link>

                <Link
                    href="/inquilino/payments"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <CreditCard size={18} />
                    <span>Rentas / Pagos</span>
                </Link>

                <Link
                    href="/inquilino/maintenance"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <Wrench size={18} />
                    <span>Mantenimiento</span>
                </Link>

                <Link
                    href="/inquilino/transparencia"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-indigo-500/20"
                >
                    <BarChart3 size={18} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    <span>Finanzas del Portafolio</span>
                </Link>

                <Link
                    href="/inquilino/amenidades"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <LayoutDashboard size={18} />
                    <span>Amenidades</span>
                </Link>

                <Link
                    href="/inquilino/servicios"
                    className="group flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-indigo-500/20"
                >
                    <Smartphone size={18} className="text-zinc-400 group-hover:text-indigo-400 transition-colors" />
                    <span>Servicios</span>
                </Link>

                <Link
                    href="/inquilino/avisos"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-amber-500/20"
                >
                    <Bell size={18} className="text-amber-500/80 group-hover:text-amber-400" />
                    <span>Avisos</span>
                </Link>

                <Link
                    href="/inquilino/premium-services"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors border border-transparent hover:border-indigo-500/20"
                >
                    <Sparkles size={18} className="text-indigo-400" />
                    <span>Servicios Premium</span>
                </Link>
            </nav>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 space-y-1">
                <Link
                    href="/inquilino/perfil"
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
            isDemoMode={false}
            headerActions={
                <input
                    type="text"
                    placeholder="Buscar..."
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-500"
                />
            }
        >
            {children}
        </DashboardLayoutClient>
    )
}
