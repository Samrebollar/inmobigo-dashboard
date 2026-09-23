import { Inter } from 'next/font/google'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'

const inter = Inter({
    subsets: ['latin'],
})

export const metadata = {
    title: 'InmobiGo',
    description: 'App móvil de InmobiGo para residentes',
}

/**
 * Layout separado para la versión "app móvil" (basada en el diseño de
 * Figma), independiente del panel web actual del residente (/residente/*).
 * No reemplaza nada — es una superficie nueva y aditiva; las rutas que
 * todavía no tienen su propia pantalla dentro de /mobile enlazan de
 * vuelta a /residente/* mientras se van construyendo una por una.
 */
export default async function MobileLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className={`${inter.className} min-h-screen bg-[#F8F9FA] pb-16`}>
            {children}
            <MobileBottomNav />
        </div>
    )
}
