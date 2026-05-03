import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentAmenidadesClient from '@/components/dashboard/resident-amenidades-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AmenidadesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Get Resident Data
    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, organization_id), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    // Priority: 1. Condominium linked to resident, 2. Resident record, 3. User metadata, 4. organization_users
    // @ts-ignore
    let organizationId = resident?.condominiums?.organization_id || 
                         // @ts-ignore
                         resident?.organization_id || 
                         user.user_metadata?.organization_id || 
                         user.user_metadata?.orgId

    // Try from organization_users (primary for admins/owners)
    if (!organizationId) {
        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle()
        
        if (orgUser?.organization_id) {
            organizationId = orgUser.organization_id
        }
    }

    const isMetadataResident = user.user_metadata?.role === 'resident'
    const isResident = !!resident || isMetadataResident

    const mockResident = resident ? { 
        ...resident, 
        organization_id: organizationId 
    } : {
        user_id: user.id,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Residente',
        condominiums: { name: resident?.condominiums?.name || 'Tu Condominio' },
        units: { unit_number: resident?.units?.unit_number || 'N/A' },
        organization_id: organizationId,
    }

    return (
        <ResidentAmenidadesClient resident={mockResident} />
    )
}
