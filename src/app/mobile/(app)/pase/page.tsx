import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import MobilePaseClient from '@/components/mobile/mobile-pase-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobilePasePage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        redirect('/residente/servicios')
    }

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
