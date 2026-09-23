import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MobilePaqueteriaClient from '@/components/mobile/mobile-paqueteria-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobilePaqueteriaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, organization_id), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        redirect('/residente/servicios')
    }

    const { data: alertsData } = await supabase
        .from('package_alerts')
        .select('*')
        .eq('resident_id', resident.user_id)
        .order('created_at', { ascending: false })

    const alerts = alertsData || []

    const organizationId = (resident.condominiums as any)?.organization_id || (resident as any).organization_id
    const fullName = [resident.first_name, resident.last_name].filter(Boolean).join(' ') || 'Residente'
    const unitName = (resident as any).units?.unit_number || 'N/A'

    return (
        <MobilePaqueteriaClient
            alerts={alerts}
            organizationId={organizationId}
            unitId={(resident as any).unit_id}
            residentUserId={resident.user_id}
            residentName={fullName}
            unitName={unitName}
        />
    )
}
