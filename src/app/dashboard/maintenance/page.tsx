import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentMaintenanceView from '@/components/maintenance/resident-maintenance-view'
import AdminMaintenanceClient from './admin-maintenance-client'

export default async function MaintenancePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check User Role
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    console.log("Maintenance Page Debug:", { userId: user.id, profile, role: profile?.role })

    const isResident = true // FORCED FOR DEBUGGING: profile?.role === 'resident'

    if (isResident) {
        return (
            <>
                <ResidentMaintenanceView user={user} />
                <div className="fixed bottom-0 right-0 p-1 bg-red-500/50 text-[10px] text-white z-50">
                    Debug Role: {JSON.stringify(profile)}
                </div>
            </>
        )
    }

    return <AdminMaintenanceClient />
}
