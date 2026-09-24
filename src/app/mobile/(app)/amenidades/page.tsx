import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { getAmenitiesAction } from '@/app/actions/service-actions'
import { findResidentForUser } from '@/services/mobile-resident-lookup'
import MobileAmenidadesClient from '@/components/mobile/mobile-amenidades-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileAmenidadesPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const resident = await findResidentForUser(user)

    if (!resident) {
        redirect('/residente/amenidades')
    }

    const condominiumId = resident.condominium_id
    let organizationId = (resident as any).organization_id || null
    if (!organizationId && condominiumId) {
        const adminSupabase = createAdminClient()
        const { data: condo } = await adminSupabase.from('condominiums').select('organization_id').eq('id', condominiumId).maybeSingle()
        organizationId = condo?.organization_id || null
    }

    let amenities: any[] = []
    if (organizationId) {
        const result = await getAmenitiesAction(organizationId, condominiumId)
        if (result.success) amenities = result.data || []
    }

    return <MobileAmenidadesClient amenities={amenities} />
}
