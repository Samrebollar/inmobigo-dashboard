import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentMaintenanceClient from '@/components/residente/resident-maintenance-client'
import { NotLinkedState } from '@/components/residente/NotLinkedState'

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

    if (!resident) {
        return <NotLinkedState email={user.email} />
    }

    return (
        <ResidentMaintenanceClient resident={resident} />
    )
}
