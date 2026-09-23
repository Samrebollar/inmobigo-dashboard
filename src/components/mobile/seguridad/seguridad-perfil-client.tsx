'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { User, Mail, Building2, LogOut, Loader2 } from 'lucide-react'

export default function MobileSeguridadPerfilClient({
    fullName,
    email,
    avatarUrl,
    condominiumName,
}: {
    fullName: string
    email: string
    avatarUrl: string | null
    condominiumName: string | null
}) {
    const router = useRouter()
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/mobile/login')
    }

    return (
        <div className="mx-auto max-w-[480px] px-5 pb-8 pt-6">
            <h1 className="mb-6 text-[20px] font-semibold text-[#191C1D]">Perfil</h1>

            <div className="flex flex-col items-center gap-3 rounded-[24px] border border-[#c3d7c6] bg-white p-8">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-[#d1fae5]">
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                    ) : (
                        <User size={32} className="text-[#059669]" />
                    )}
                </div>
                <h2 className="text-[18px] font-semibold text-[#191C1D]">{fullName}</h2>
                <div className="flex items-center gap-1.5 text-[#434655]">
                    <Mail size={13} />
                    <span className="text-[12px]">{email}</span>
                </div>
                {condominiumName && (
                    <div className="flex items-center gap-1.5 text-[#434655]">
                        <Building2 size={13} />
                        <span className="text-[12px]">{condominiumName}</span>
                    </div>
                )}
                <span className="mt-1 rounded-full bg-[#d1fae5] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.5px] text-[#059669]">
                    Seguridad
                </span>
            </div>

            <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl border border-[#ffdad6] bg-white text-[16px] font-semibold text-[#ba1a1a] disabled:opacity-50"
            >
                {isLoggingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
                Cerrar sesión
            </button>
        </div>
    )
}
