import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentPaymentsClient from '@/components/inquilino/resident-payments-client'

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

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    const mockResident = resident || {
        first_name: profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || 'Inquilino',
        condominiums: { name: 'Condominio Demo' },
        units: { unit_number: 'A-101' },
        debt_amount: 0,
    }

    return (
        <ResidentPaymentsClient resident={mockResident} />
    )
}
