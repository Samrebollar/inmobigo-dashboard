import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentAmenidadesClient from '@/components/inquilino/resident-amenidades-client'

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

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, organization_id), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    // Priority: 1. Condominium linked to resident, 2. Resident record, 3. User metadata
    // @ts-ignore
    let organizationId = resident?.condominiums?.organization_id || 
                         // @ts-ignore
                         resident?.organization_id || 
                         user.user_metadata?.organization_id || 
                         user.user_metadata?.orgId

    const mockResident = resident ? { 
        ...resident, 
        organization_id: organizationId 
    } : {
        user_id: user.id,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Inquilino',
        condominiums: { name: resident?.condominiums?.name || 'Tu Condominio' },
        units: { unit_number: resident?.units?.unit_number || 'N/A' },
        organization_id: organizationId,
    }

    return (
        <ResidentAmenidadesClient resident={mockResident} />
    )
}
