import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'

/**
 * Layout para las pantallas autenticadas de la app móvil (/mobile/*, excepto
 * /mobile/login). El login vive fuera de este grupo de rutas porque no
 * requiere sesión — solo aquí se exige usuario logueado y se muestra el
 * bottom nav.
 */
export default async function MobileAppLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    return (
        <div className="pb-16">
            {children}
            <MobileBottomNav />
        </div>
    )
}
