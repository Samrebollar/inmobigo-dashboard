'use client'

import { LucideIcon } from 'lucide-react'
import { 
    LayoutDashboard, 
    Users, 
    TrendingUp, 
    CreditCard, 
    BarChart3, 
    Layers, 
    Headphones, 
    Settings,
    LogOut
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
    href: string
    icon: LucideIcon
    label: string
    active?: boolean
}

function SidebarItem({ href, icon: Icon, label, active }: SidebarItemProps) {
    return (
        <Link
            href={href}
            className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active 
                    ? "bg-indigo-600/10 text-indigo-400 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]" 
                    : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
            )}
        >
            <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-200",
                active ? "bg-indigo-600 text-white" : "bg-zinc-800 group-hover:bg-zinc-700"
            )}>
                <Icon size={16} />
            </div>
            <span>{label}</span>
            {active && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            )}
        </Link>
    )
}

export function OwnerSidebar() {
    const pathname = usePathname()

    const menuItems = [
        { href: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { href: '/owner/customers', icon: Users, label: 'Clientes' },
        { href: '/owner/revenue', icon: TrendingUp, label: 'Ingresos' },
        { href: '/owner/payments', icon: CreditCard, label: 'Pagos' },
        { href: '/owner/analytics', icon: BarChart3, label: 'Analytics' },
        { href: '/owner/plans', icon: Layers, label: 'Planes' },
        { href: '/owner/support', icon: Headphones, label: 'Soporte' },
        { href: '/owner/settings', icon: Settings, label: 'Configuración' },
    ]

    return (
        <div className="flex flex-col h-full bg-zinc-950 border-r border-zinc-900 w-64 flex-shrink-0 relative">
            {/* Logo */}
            <div className="h-20 flex items-center px-6 border-b border-zinc-900/50">
                <Link href="/owner/dashboard" className="flex items-center gap-3 group">
                    <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                        <span className="text-white font-black text-xl italic">I</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-lg font-black tracking-tighter text-white leading-none">InmobiGo</span>
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Platform Owner</span>
                    </div>
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                {menuItems.map((item) => (
                    <SidebarItem
                        key={item.href}
                        {...item}
                        active={pathname === item.href}
                    />
                ))}
            </div>

            {/* Footer / Account */}
            <div className="p-4 border-t border-zinc-900/50 space-y-2">
                <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-xl text-zinc-500 hover:text-zinc-300 transition-colors text-xs font-medium">
                    <Layers size={14} />
                    <span>Volver a App</span>
                </Link>
                <button className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-colors text-sm font-medium transition-all group">
                    <LogOut size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    )
}
