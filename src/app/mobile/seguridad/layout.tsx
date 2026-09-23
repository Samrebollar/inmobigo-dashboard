import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { SeguridadBottomNav } from '@/components/mobile/seguridad-bottom-nav'

/**
 * Superficie móvil para guardias de seguridad — separada de /mobile/(app)
 * (residente) para no compartir su bottom nav ni su auth gate. Requiere
 * sesión Y rol de seguridad; cualquier otro rol se manda a la superficie
 * que sí le corresponde.
 */
export default async function MobileSeguridadLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const adminSupabase = createAdminClient()

    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id, role_new')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('role_new')
        .eq('id', user.id)
        .maybeSingle()

    const { data: securityCondo } = await adminSupabase
        .from('condominiums')
        .select('organization_id')
        .eq('security_user_id', user.id)
        .limit(1)
        .maybeSingle()

    const isSecurity =
        orgUser?.role_new === 'security' || profile?.role_new === 'security' || !!securityCondo

    if (!isSecurity) {
        redirect('/dashboard')
    }

    return (
        <div className="pb-16">
            {children}
            <SeguridadBottomNav />
        </div>
    )
}
