import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentPetsClient from '@/components/residente/resident-pets-client'
import { NotLinkedState } from '@/components/residente/NotLinkedState'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MascotasPage() {
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

    let organizationId: string | null = null
    if (resident.condominium_id) {
        const { data: condo } = await supabase
            .from('condominiums')
            .select('organization_id')
            .eq('id', resident.condominium_id)
            .maybeSingle()
        organizationId = condo?.organization_id || null
    }

    return (
        <ResidentPetsClient resident={{ ...resident, organization_id: organizationId }} />
    )
}
