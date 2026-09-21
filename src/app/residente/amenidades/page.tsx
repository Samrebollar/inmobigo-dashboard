import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentAmenidadesClient from '@/components/residente/resident-amenidades-client'
import { NotLinkedState } from '@/components/residente/NotLinkedState'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AmenidadesPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, organization_id, reglamento_url), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        return <NotLinkedState email={user.email} />
    }

    // @ts-ignore
    const organizationId = resident.condominiums?.organization_id || (resident as any).organization_id

    return (
        <ResidentAmenidadesClient resident={{ ...resident, organization_id: organizationId }} />
    )
}
