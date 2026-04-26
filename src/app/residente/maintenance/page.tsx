import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentMaintenanceClient from '@/components/residente/resident-maintenance-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MaintenancePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    const mockResident = resident || {
        first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Residente',
        condominiums: { name: 'Condominio Demo' },
        units: { unit_number: 'A-101' },
        debt_amount: 0,
    }

    return (
        <ResidentMaintenanceClient resident={mockResident} />
    )
}
