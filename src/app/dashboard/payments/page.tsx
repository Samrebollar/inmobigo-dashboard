import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentPaymentsClient from '@/components/dashboard/resident-payments-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PaymentsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Get Profile for Name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

    // 2. Determine if Resident
    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    const isMetadataResident = user.user_metadata?.role === 'resident'
    const isResident = !!resident || isMetadataResident

    // If not a resident (e.g. admin), they shouldn't be here in this format
    // But for the sake of the demo and the request, we prioritize the resident view here
    // Admins have their own 'Integraciones' link now at /dashboard/integrations
    
    const mockResident = resident || {
        first_name: profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || 'Residente',
        condominiums: { name: 'Condominio Demo' },
        units: { unit_number: 'A-101' },
        debt_amount: 2500,
    }

    return (
        <ResidentPaymentsClient resident={mockResident} />
    )
}
