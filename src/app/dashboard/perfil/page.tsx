import { createClient } from '@/utils/supabase/server'
import ResidentProfileClient from '@/components/settings/resident-profile-client'
import { resolveProfileData } from '@/services/profile-service'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const data = await resolveProfileData(supabase, user)

    return (
        <ResidentProfileClient
            user={user}
            initialResident={data.resident}
            profile={data.profile}
            role={data.role}
            isAdmin={data.isAdmin}
            subscription={data.subscription}
            organizationName={data.organizationName}
            adminContact={data.adminContact}
            accountStatus={data.accountStatus}
            financeHref={data.isAdmin ? '/dashboard/finance' : '/dashboard/payments'}
        />
    )
}
