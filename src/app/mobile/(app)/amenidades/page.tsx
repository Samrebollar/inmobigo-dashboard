import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getAmenitiesAction } from '@/app/actions/service-actions'
import MobileAmenidadesClient from '@/components/mobile/mobile-amenidades-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileAmenidadesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(organization_id)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        redirect('/residente/amenidades')
    }

    const organizationId = (resident.condominiums as any)?.organization_id || (resident as any).organization_id
    const condominiumId = (resident as any).condominium_id

    let amenities: any[] = []
    if (organizationId) {
        const result = await getAmenitiesAction(organizationId, condominiumId)
        if (result.success) amenities = result.data || []
    }

    return <MobileAmenidadesClient amenities={amenities} />
}
