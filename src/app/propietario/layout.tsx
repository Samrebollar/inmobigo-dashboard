import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { logout } from '@/app/auth/actions'
import { Building2, LogOut } from 'lucide-react'
import { DashboardLayoutClient } from '@/components/dashboard/dashboard-layout-client'

/** Portal de Propietarios y Gestores: unidades de una persona en uno o varios condominios. */
export default async function PropietarioLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const admin = createAdminClient()
    const [{ data: contact }, { data: profile }] = await Promise.all([
        admin.from('unit_contacts').select('full_name').eq('user_id', user.id).limit(1).maybeSingle(),
        admin.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle(),
    ])
    if (!contact) redirect('/dashboard')

    const displayName = contact.full_name || profile?.full_name || 'Propietario'
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture

    const sidebarContent = (
        <>
            <div className="hidden lg:flex h-20 items-center border-b border-zinc-800 px-6">
                <Link href="/propietario" className="flex items-center gap-3">
                    <img src="/logo-inmobigo.png" alt="InmobiGo Logo" className="h-16 w-auto object-contain drop-shadow-[0_0_15px_rgba(79,70,229,0.4)]" />
                    <span className="text-xl font-bold tracking-tight text-white">InmobiGo</span>
                </Link>
            </div>
            <nav className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
                <Link
                    href="/propietario"
                    className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
                >
                    <Building2 size={18} />
                    <span>Mis unidades</span>
                </Link>
            </nav>
            <div className="p-4 border-t border-zinc-800 bg-zinc-900/30 space-y-1">
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
        <DashboardLayoutClient sidebarContent={sidebarContent} displayName={displayName} avatarUrl={avatarUrl} isDemoMode={false}>
            {children}
        </DashboardLayoutClient>
    )
}
