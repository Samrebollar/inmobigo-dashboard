import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentPropertyClient from '@/components/dashboard/resident-property-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PropertyPage() {
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

    const isMetadataResident = user.user_metadata?.role === 'resident'
    const isResident = !!resident || isMetadataResident

    // If for some reason an admin lands here, we should ideally show something or redirect
    // But as per request, we are tailoring this route for the resident experience
    
    const mockResident = resident || {
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Residente',
        condominiums: { name: 'Torre Reforma' },
        units: { unit_number: 'A-101' },
    }

    return (
        <ResidentPropertyClient resident={mockResident} />
    )
}
