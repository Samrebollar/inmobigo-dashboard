'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/utils/supabase/client'
import {
    User,
    Phone,
    Mail,
    Building2,
    Home,
    Car,
    CreditCard,
    Settings,
    ShieldCheck,
    HelpCircle,
    LogOut,
    ChevronRight,
    Loader2,
} from 'lucide-react'

export default function MobilePerfilClient({
    fullName,
    email,
    phone,
    avatarUrl,
    condominiumName,
    unitNumber,
}: {
    fullName: string
    email: string
    phone: string | null
    avatarUrl: string | null
    condominiumName: string | null
    unitNumber: string | null
}) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/mobile/login')
    }

    const notAvailable = (feature: string) => toast.info(`${feature} estará disponible próximamente en la app.`)

    const menuItems = [
        { icon: Car, label: 'Vehículos', action: () => notAvailable('La gestión de vehículos') },
        { icon: CreditCard, label: 'Métodos de pago', action: () => notAvailable('La gestión de métodos de pago') },
        { icon: Settings, label: 'Configuración', action: () => router.push('/residente/perfil') },
        { icon: ShieldCheck, label: 'Seguridad', action: () => notAvailable('El cambio de contraseña desde la app') },
        { icon: HelpCircle, label: 'Ayuda', action: () => router.push('/residente/help') },
    ]

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-center bg-[rgba(248,249,250,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <h1 className="text-[20px] font-semibold leading-[28px] text-[#004AC6]">Perfil</h1>
            </header>

            <main className="flex flex-col gap-6 px-5 pb-24 pt-2">
                <div className="flex flex-col items-center gap-3 rounded-[24px] border border-[#c3c6d7] bg-white p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#d5e0f8]">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                        ) : (
                            <User size={32} className="text-[#004AC6]" />
                        )}
                    </div>
                    <div className="flex flex-col items-center gap-1">
                        <h2 className="text-[20px] font-semibold text-[#191C1D]">{fullName}</h2>
                        <div className="flex items-center gap-1.5 text-[#434655]">
                            <Mail size={13} />
                            <span className="text-[12px]">{email}</span>
                        </div>
                        {phone && (
                            <div className="flex items-center gap-1.5 text-[#434655]">
                                <Phone size={13} />
                                <span className="text-[12px]">{phone}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center gap-2 rounded-[20px] border border-[#c3c6d7] bg-white p-4 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(0,74,198,0.05)]">
                            <Building2 size={18} className="text-[#004AC6]" />
                        </span>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#434655]">Condominio</p>
                        <p className="truncate text-[13px] font-semibold text-[#191C1D]">{condominiumName || '—'}</p>
                    </div>
                    <div className="flex flex-col items-center gap-2 rounded-[20px] border border-[#c3c6d7] bg-white p-4 text-center">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(0,74,198,0.05)]">
                            <Home size={18} className="text-[#004AC6]" />
                        </span>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[#434655]">Unidad</p>
                        <p className="truncate text-[13px] font-semibold text-[#191C1D]">{unitNumber || '—'}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    {menuItems.map((item) => (
                        <button
                            key={item.label}
                            onClick={item.action}
                            className="flex w-full items-center justify-between rounded-[20px] border border-[#c3c6d7] bg-white p-[17px] text-left"
                        >
                            <div className="flex items-center gap-4">
                                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(0,74,198,0.05)]">
                                    <item.icon size={18} className="text-[#004AC6]" />
                                </span>
                                <span className="text-[14px] font-semibold text-[#191C1D]">{item.label}</span>
                            </div>
                            <ChevronRight size={18} className="text-[#434655]" />
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-[#ffdad6] bg-white text-[16px] font-semibold text-[#ba1a1a] disabled:opacity-50"
                >
                    {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                    Cerrar sesión
                </button>
            </main>
        </div>
    )
}
