import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MobileBottomNav } from '@/components/mobile/mobile-bottom-nav'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCondominiumAccess } from '@/lib/subscription-access'
import { SubscriptionLockWrapper } from '@/components/shared/SubscriptionLockWrapper'

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

    // Si la suscripción del condominio está vencida, la app queda bloqueada
    // (igual que la web), incluidos los pagos.
    const adminSupabase = createAdminClient()
    const { data: resident } = await adminSupabase
        .from('residents')
        .select('condominium_id')
        .eq('user_id', user.id)
        .maybeSingle()
    const access = await getCondominiumAccess(adminSupabase, resident?.condominium_id)

    return (
        <div className="pb-16">
            <SubscriptionLockWrapper daysRemaining={access.daysRemaining} role="resident">
                {children}
            </SubscriptionLockWrapper>
            <MobileBottomNav />
        </div>
    )
}
