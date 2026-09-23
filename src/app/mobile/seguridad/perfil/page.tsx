import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import MobileSeguridadPerfilClient from '@/components/mobile/seguridad/seguridad-perfil-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileSeguridadPerfilPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const adminSupabase = createAdminClient()
    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

    const { data: securityCondo } = await adminSupabase
        .from('condominiums')
        .select('name')
        .eq('security_user_id', user.id)
        .limit(1)
        .maybeSingle()

    return (
        <MobileSeguridadPerfilClient
            fullName={profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Guardia'}
            email={user.email || ''}
            avatarUrl={profile?.avatar_url || null}
            condominiumName={securityCondo?.name || null}
        />
    )
}
