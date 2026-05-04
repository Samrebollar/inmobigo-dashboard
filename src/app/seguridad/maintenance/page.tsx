import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import AdminMaintenanceClient from './admin-maintenance-client'
import ResidentMaintenanceClient from '@/components/seguridad/resident-maintenance-client'

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

    // 1. Check if Admin/Staff
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('role')
        .eq('user_id', user.id)
        .single()

    // 2. Check if Resident
    let resident = null
    const { data: resByUid } = await supabase
        .from('residents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (resByUid) {
        resident = resByUid
    } else if (user.email) {
        const { data: resByEmail } = await supabase
            .from('residents')
            .select('*')
            .eq('email', user.email)
            .maybeSingle()
        if (resByEmail) {
            resident = resByEmail
        }
    }

    const isMetadataResident = user.user_metadata?.role === 'resident'
    const isResident = !!resident || isMetadataResident

    if (isResident) {
        const mockResident = resident || {
            first_name: user.user_metadata?.full_name?.split(' ')[0] || 'Residente',
            condominiums: { name: 'Condominio Demo' },
            units: { unit_number: 'A-101' },
            debt_amount: 2500,
        }

        return (
            <>
                <ResidentMaintenanceClient resident={mockResident} />
                <div className="fixed bottom-4 right-4 z-50">
                    <div className="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded-full font-bold shadow-lg text-center">
                        VISTA: RESIDENTE ACTIVADA
                    </div>
                </div>
            </>
        )
    }

    // If Admin/Staff
    if (orgUser || user.user_metadata?.role === 'admin') {
        return <AdminMaintenanceClient />
    }

    // Default Fallback
    return <AdminMaintenanceClient />
}
