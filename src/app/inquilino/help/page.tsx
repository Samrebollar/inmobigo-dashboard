import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentHelpClient from '@/components/inquilino/resident-help-client'

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

    return (
        <ResidentHelpClient user={user} />
    )
}
