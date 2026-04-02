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
        .select('*, condominiums(name), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    // Get organization_users to ensure we have organization_id
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    const isMetadataResident = user.user_metadata?.role === 'resident'
    const isResident = !!resident || isMetadataResident

    const mockResident = resident ? { 
        ...resident, 
        organization_id: orgUser?.organization_id 
    } : {
        user_id: user.id,
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Residente',
        condominiums: { name: 'Tu Condominio' },
        units: { unit_number: 'N/A' },
        organization_id: orgUser?.organization_id,
    }

    return (
        <ResidentAmenidadesClient resident={mockResident} />
    )
}
