import { createClient } from '@/utils/supabase/server'
import { getUserContext } from '@/utils/user-context'
import Link from 'next/link'
import ResidentDashboardCondominioClient from '@/components/seguridad/resident-dashboard-condominio-client'
import ResidentDashboardPropiedadesClient from '@/components/seguridad/resident-dashboard-propiedades-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SeguridadPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return <div>No autenticado</div>

    const { businessType } = await getUserContext()

    // 1. Get Profile for Name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

    const metaFullName = user.user_metadata?.full_name
    const fullName = profile?.full_name || metaFullName || user.email?.split('@')[0] || 'Seguridad'
    const firstName = fullName.trim().split(' ')[0]

    // 2. Get Resident Table Data (We still use residents table for core data for now, as requested "same as resident")
    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, organization_id), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    const mockResident = {
        ...(resident || {
            first_name: firstName,
            last_name: '',
            condominiums: { name: 'Condominio Demo' },
            units: { unit_number: 'A-101' },
            debt_amount: 0,
            last_payment_amount: 0,
            active_tickets_count: 0,
            paid_installments_count: 0,
        }),
        user_id: user.id,
        organization_id: resident?.organization_id || (resident?.condominiums as any)?.organization_id || user.user_metadata?.organization_id
    }

    if (businessType === 'propiedades') {
        return (
            <ResidentDashboardPropiedadesClient 
                resident={mockResident} 
                userName={firstName} 
            />
        )
    }

    return (
        <ResidentDashboardCondominioClient 
            resident={mockResident} 
            userName={firstName} 
        />
    )
}
