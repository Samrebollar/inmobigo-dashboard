import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { MensajesAdminClient } from '@/components/dashboard/mensajes/mensajes-admin-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
    title: 'Mensajes | InmobiGo',
    description: 'Mensajes directos de tus residentes.',
}

export default async function MensajesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const adminSupabase = createAdminClient()
    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser?.organization_id) {
        redirect('/dashboard')
    }

    return (
        <MensajesAdminClient organizationId={orgUser.organization_id} adminUserId={user.id} />
    )
}
