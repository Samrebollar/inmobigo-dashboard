import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { findResidentForUser } from '@/services/mobile-resident-lookup'
import MobilePaqueteriaClient from '@/components/mobile/mobile-paqueteria-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobilePaqueteriaPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const resident = await findResidentForUser(user)

    if (!resident) {
        redirect('/residente/servicios')
    }

    const adminSupabase = createAdminClient()
    const [{ data: condo }, { data: unit }] = await Promise.all([
        resident.condominium_id
            ? adminSupabase.from('condominiums').select('name, organization_id').eq('id', resident.condominium_id).maybeSingle()
            : Promise.resolve({ data: null }),
        resident.unit_id
            ? adminSupabase.from('units').select('unit_number').eq('id', resident.unit_id).maybeSingle()
            : Promise.resolve({ data: null }),
    ])
    ;(resident as any).condominiums = condo
    ;(resident as any).units = unit

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
