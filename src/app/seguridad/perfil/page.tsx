import { createClient } from '@/utils/supabase/server'
import ResidentProfileClient from '@/components/settings/resident-profile-client'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Fetch Profile Data (for Avatar and Full Name)
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

    // 2. Fetch Resident Data (if applicable)
    const { data: resident } = await supabase
        .from('residents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    // 3. Determine Role (Same logic as layout.tsx)
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

    let role = 'viewer'
    if (orgUser?.role) {
        role = orgUser.role
    } else if (profile?.role && profile.role !== 'resident') {
        role = profile.role
    } else if (user.user_metadata?.role === 'admin' || user.user_metadata?.role === 'admin_condominio' || user.user_metadata?.role === 'admin_propiedad') {
        role = user.user_metadata?.role
    } else if (resident || profile?.role === 'resident' || user.user_metadata?.role === 'resident') {
        role = 'resident'
    }

    // 4. Fetch Active Subscription
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('subscription_status', 'active')
        .maybeSingle()

    // Pass data to Client Component
    return (
        <ResidentProfileClient 
            user={user} 
            initialResident={resident} 
            profile={profile} 
            role={role} 
            subscription={subscription}
        />
    )
}

