import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentHelpClient from '@/components/seguridad/resident-help-client'
import { resolveProfileData } from '@/services/profile-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HelpPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const data = await resolveProfileData(supabase, user)
    const adminName = data.profile?.full_name || user.email || 'Administrador'

    return (
        <ResidentHelpClient
            user={user}
            isAdmin={data.isAdmin}
            organizationName={data.organizationName}
            adminName={adminName}
            adminPhone={data.profile?.phone || null}
            adminContact={data.adminContact}
        />
    )
}
