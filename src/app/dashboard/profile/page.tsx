import { createClient } from '@/utils/supabase/server'
import ResidentProfileClient from '@/components/settings/resident-profile-client'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Fetch Resident Data
    const { data: resident } = await supabase
        .from('residents')
        .select('*')
        .eq('user_id', user.id)
        .single()

    // Pass data to Client Component
    return <ResidentProfileClient user={user} initialResident={resident} />
}
