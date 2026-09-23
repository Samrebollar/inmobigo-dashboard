import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MobilePerfilClient from '@/components/mobile/mobile-perfil-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobilePerfilPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

    const fullName =
        (resident ? [resident.first_name, resident.last_name].filter(Boolean).join(' ') : '') ||
        profile?.full_name ||
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Residente'

    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null

    return (
        <MobilePerfilClient
            fullName={fullName}
            email={user.email || ''}
            phone={resident?.phone || null}
            avatarUrl={avatarUrl}
            condominiumName={(resident?.condominiums as any)?.name || null}
            unitNumber={(resident as any)?.units?.unit_number || null}
        />
    )
}
