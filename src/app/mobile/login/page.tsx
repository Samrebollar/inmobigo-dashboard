import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MobileLoginClient from '@/components/mobile/mobile-login-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileLoginPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        redirect('/mobile')
    }

    return <MobileLoginClient />
}
