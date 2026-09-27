import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ConvivenciaAdminClient from '@/components/dashboard/convivencia-admin-client'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Convivencia | InmobiGo',
    description: 'Reportes de convivencia entre residentes por privada.',
}

export default async function ConvivenciaAdminPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const adminSupabase = createAdminClient()

    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    let orgId = orgUser?.organization_id

    if (!orgId) {
        const { data: owned } = await adminSupabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
        orgId = owned?.id
    }

    if (!orgId) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-zinc-500">
                No se encontro un contexto de organizacion para este usuario.
            </div>
        )
    }

    const { data: condos } = await adminSupabase
        .from('condominiums')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('name')

    return (
        <ConvivenciaAdminClient organizationId={orgId} condominiums={condos || []} />
    )
}
