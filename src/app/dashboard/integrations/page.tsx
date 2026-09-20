import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { IntegrationsClient } from '@/components/integrations/integrations-client'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
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

    let organizationId = orgUser?.organization_id

    if (!organizationId) {
        const { data: ownedOrg } = await adminSupabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
        organizationId = ownedOrg?.id
    }

    if (!organizationId) {
        redirect('/dashboard')
    }

    const { data: condominiums } = await adminSupabase
        .from('condominiums')
        .select('id, name')
        .eq('organization_id', organizationId)
        .eq('status', 'active')

    const condoList = condominiums || []
    const condoIds = condoList.map(c => c.id)

    let accounts: any[] = []
    if (condoIds.length > 0) {
        const { data } = await adminSupabase
            .from('payment_accounts')
            .select('condominium_id, mp_user_id, expires_at, updated_at')
            .in('condominium_id', condoIds)
            .eq('provider', 'mercadopago')
        accounts = data || []
    }

    const statusList = condoList.map(condo => {
        const account = accounts.find(a => a.condominium_id === condo.id)
        const isExpired = account?.expires_at ? new Date(account.expires_at) < new Date() : false
        return {
            condominiumId: condo.id,
            condominiumName: condo.name,
            connected: !!account && !isExpired,
            mpUserId: account?.mp_user_id ?? null,
            expiresAt: account?.expires_at ?? null,
            lastUpdated: account?.updated_at ?? null,
        }
    })

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <IntegrationsClient condominiums={statusList} />
        </div>
    )
}
