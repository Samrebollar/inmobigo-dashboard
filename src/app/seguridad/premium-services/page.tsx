import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import PremiumServicesClient from '@/components/dashboard/premium-services/premium-services-client'

export const dynamic = 'force-dynamic'

export default async function PremiumServicesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

    const displayName = profile?.full_name || 'Usuario'

    return (
        <div className="min-h-screen bg-zinc-950">
            <PremiumServicesClient userName={displayName} />
        </div>
    )
}
