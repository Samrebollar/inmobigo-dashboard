import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { findResidentForUser } from '@/services/mobile-resident-lookup'
import MobilePaseClient from '@/components/mobile/mobile-pase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobilePasePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const resident = await findResidentForUser(user)

    if (!resident) {
        redirect('/residente/servicios')
    }

    const adminSupabase = createAdminClient()
    const [{ data: condo }, { data: unit }] = await Promise.all([
        resident.condominium_id
            ? adminSupabase.from('condominiums').select('name').eq('id', resident.condominium_id).maybeSingle()
            : Promise.resolve({ data: null }),
        resident.unit_id
            ? adminSupabase.from('units').select('unit_number').eq('id', resident.unit_id).maybeSingle()
            : Promise.resolve({ data: null }),
    ])
    ;(resident as any).condominiums = condo
    ;(resident as any).units = unit

    const { data: passesData } = await supabase
        .from('visitor_passes')
        .select('*')
        .eq('resident_id', resident.user_id)
        .in('status', ['pending', 'used'])
        .order('created_at', { ascending: false })

    const passes = passesData || []
    // Prioriza un pase que todavía no se use — es el que hay que mostrar al guardia.
    const activePass = passes.find((p) => p.status === 'pending') || passes[0] || null

    return (
        <MobilePaseClient
            pass={activePass}
            condoName={(resident.condominiums as any)?.name || 'InmobiGo'}
            unitNumber={(resident as any).units?.unit_number || 'S/D'}
        />
    )
}
