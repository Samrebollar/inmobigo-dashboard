import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentReservasTabla from '@/components/dashboard/resident-reservas-tabla'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ReservasPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        // Fallback for demo/dev if resident record doesn't exist yet but user is logged in
        return <ResidentReservasTabla resident={{ user_id: user.id }} />
    }

    return (
        <ResidentReservasTabla resident={resident} />
    )
}