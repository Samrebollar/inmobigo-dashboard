import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import HomeServicesClient from '@/components/residente/home-services-client'

export const dynamic = 'force-dynamic'

export default async function PremiumServicesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('first_name, last_name, units(unit_number), condominiums(name)')
        .eq('user_id', user.id)
        .maybeSingle()

    const residentName = resident
        ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
        : (user.user_metadata?.full_name || 'Residente')

    return (
        <div className="min-h-screen bg-zinc-950">
            <HomeServicesClient
                residentName={residentName || 'Residente'}
                unitNumber={(resident as any)?.units?.unit_number || null}
                condominiumName={(resident as any)?.condominiums?.name || null}
            />
        </div>
    )
}
