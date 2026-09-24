import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getTicketsByResidentServer } from '@/app/actions/maintenance-actions'
import { findResidentForUser } from '@/services/mobile-resident-lookup'
import MobileIncidenciasClient from '@/components/mobile/mobile-incidencias-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileIncidenciasPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const resident = await findResidentForUser(user)

    if (!resident) {
        redirect('/residente/maintenance')
    }

    const result = await getTicketsByResidentServer(resident.id)
    const tickets = result.success ? (result.tickets || []) : []

    return <MobileIncidenciasClient tickets={tickets} />
}
