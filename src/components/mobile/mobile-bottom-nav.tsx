'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Wallet, QrCode, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
    { href: '/mobile', label: 'Inicio', icon: Home, exact: true },
    { href: '/mobile/pagos', label: 'Pagos', icon: Wallet },
    { href: '/residente/servicios', label: 'QR', icon: QrCode, isCenter: true },
    { href: '/residente/avisos', label: 'Avisos', icon: Bell },
    { href: '/residente/perfil', label: 'Perfil', icon: User },
]

export function MobileBottomNav() {
    const pathname = usePathname()

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[rgba(195,198,215,0.2)] bg-white/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-[480px] items-center justify-center">
                {NAV_ITEMS.map((item) => {
                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                    const Icon = item.icon

                    if (item.isCenter) {
                        return (
                            <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center justify-center">
                                <div className="-mt-8 flex h-12 w-12 items-center justify-center rounded-full border-4 border-[#F8F9FA] bg-[#004AC6] shadow-[0_10px_30px_-5px_rgba(0,74,198,0.4)]">
                                    <Icon size={21} className="text-white" />
                                </div>
                                <span className="pt-1 text-[10px] font-bold text-[#004AC6]">{item.label}</span>
                            </Link>
                        )
                    }

                    return (
                        <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center justify-center gap-1">
                            <Icon size={20} className={cn(isActive ? 'text-[#004AC6]' : 'text-[rgba(67,70,85,0.6)]')} />
                            <span className={cn('text-[10px] font-bold', isActive ? 'text-[#004AC6]' : 'text-[rgba(67,70,85,0.6)]')}>
                                {item.label}
                            </span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}
