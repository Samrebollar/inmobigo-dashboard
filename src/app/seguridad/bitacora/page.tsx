import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { BitacoraInteligenteClient } from '@/components/dashboard/bitacora-inteligente-client'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Bitácora | InmobiGo Seguridad',
    description: 'Historial completo de accesos, paquetería, transporte y amenidades de la privada.',
}

export default async function SeguridadBitacoraPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const adminSupabase = createAdminClient()

    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('full_name, role_new')
        .eq('id', user.id)
        .maybeSingle()

    const metaFullName = user.user_metadata?.full_name
        || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ')
    const userName = profile?.full_name || metaFullName || user.email?.split('@')[0] || 'Seguridad'

    // Resolve organization (same fallback chain used across the security panel)
    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id, role_new')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: userCondos } = await adminSupabase
        .from('condominiums')
        .select('organization_id')
        .or(`admin_id.eq.${user.id},security_user_id.eq.${user.id}`)
        .limit(1)

    const orgId = orgUser?.organization_id || (userCondos && userCondos.length > 0 ? userCondos[0].organization_id : null)

    // Sin organización asignada NO se toma otra (antes se usaba la primera de la
    // base de datos, lo que podía mostrar datos de otro cliente)

    if (!orgId) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-zinc-500">
                No se encontró un contexto de organización para este usuario.
            </div>
        )
    }

    // Initial entries (today)
    const today = new Date().toISOString().split('T')[0]
    const { data: initialEntries } = await adminSupabase
        .from('bitacora_entries_view')
        .select('*')
        .eq('organization_id', orgId)
        .gte('checked_in_at', today)
        .order('checked_in_at', { ascending: false })
        .limit(50)

    // People currently inside
    const { data: peopleInside } = await adminSupabase
        .from('bitacora_entries_view')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .in('event_type', ['access', 'delivery'])
        .order('checked_in_at', { ascending: false })

    // Condominiums for filters
    const { data: condos } = await adminSupabase
        .from('condominiums')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('name')

    // KPIs (manual compute as RPC may not be deployed yet)
    const allToday = initialEntries || []
    const allActive = peopleInside || []

    const durations = allToday.filter((e: any) => e.duration_minutes).map((e: any) => e.duration_minutes as number)
    const avgDuration = durations.length
        ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length)
        : 0

    const initialKPIs = {
        accesos_hoy: allToday.filter((e: any) => e.event_type === 'access').length,
        entregas_hoy: allToday.filter((e: any) => e.event_type === 'delivery').length,
        amenidades_activas: allToday.filter((e: any) => e.event_type === 'amenity' && ['active', 'pending'].includes(e.status)).length,
        personas_dentro: allActive.filter((e: any) => ['access', 'delivery'].includes(e.event_type)).length,
        total_entradas: allToday.length,
        total_salidas: allToday.filter((e: any) => e.checked_out_at).length,
        movimientos_hoy: allToday.length,
        tiempo_promedio_min: avgDuration,
    }

    return (
        <BitacoraInteligenteClient
            orgId={orgId}
            userId={user.id}
            userName={userName}
            initialEntries={(initialEntries || []) as any[]}
            initialPeopleInside={(peopleInside || []) as any[]}
            initialKPIs={initialKPIs}
            condos={condos || []}
        />
    )
}
