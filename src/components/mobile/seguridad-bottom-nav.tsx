'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ScanLine, Package, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
    { href: '/mobile/seguridad', label: 'Inicio', icon: Home, exact: true },
    { href: '/mobile/seguridad/escanear', label: 'Escanear', icon: ScanLine, isCenter: true },
    { href: '/mobile/seguridad/paqueteria', label: 'Paquetes', icon: Package },
    { href: '/mobile/seguridad/perfil', label: 'Perfil', icon: User },
]

export function SeguridadBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[rgba(195,215,198,0.3)] bg-white/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-[480px] items-center justify-center">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                    const Icon = item.icon

                    if (item.isCenter) {
                        return (
                            <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center justify-center">
                                <div className="-mt-8 flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#F8FAF9] bg-[#059669] shadow-[0_10px_30px_-5px_rgba(5,150,105,0.4)]">
                                    <Icon size={21} className="text-white" />
                                </div>
                                <span className="pt-1 text-[10px] font-bold text-[#059669]">{item.label}</span>
                            </Link>
                        )
                    }

                    return (
                        <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center justify-center gap-1">
                            <Icon size={20} className={cn(isActive ? 'text-[#059669]' : 'text-[rgba(67,70,85,0.6)]')} />
                            <span className={cn('text-[10px] font-bold', isActive ? 'text-[#059669]' : 'text-[rgba(67,70,85,0.6)]')}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
