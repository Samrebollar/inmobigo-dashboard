import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * GET /api/mercadopago/oauth/status
 *
 * Devuelve el estado de conexión de MP para el condominio del usuario actual.
 * No devuelve tokens — solo metadatos seguros.
 */
export async function GET() {
    try {
        // 1. Verificar sesión
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const adminSupabase = createAdminClient()

        // 2. Obtener el/los condominios del usuario (puede tener varios por org)
        const { data: orgUser } = await adminSupabase
            .from('organization_users')
            .select(`
                organization_id,
                organizations!inner (
                    condominiums ( id, name )
                )
            `)
            .eq('user_id', user.id)
            .maybeSingle()

        if (!orgUser) {
            return NextResponse.json({ error: 'No se encontró organización' }, { status: 404 })
        }

        const condominiums = (orgUser.organizations as any)?.condominiums as Array<{ id: string; name: string }> ?? []

        if (condominiums.length === 0) {
            return NextResponse.json({
                connected: false,
                condominiums: [],
            })
        }

        // 3. Consultar payment_accounts para cada condominio
        const condominiumIds = condominiums.map((c) => c.id)

        const { data: accounts } = await adminSupabase
            .from('payment_accounts')
            .select('condominium_id, mp_user_id, expires_at, updated_at')
            .in('condominium_id', condominiumIds)
            .eq('provider', 'mercadopago')

        // 4. Combinar resultado — mapa condominio → estado de conexión
        const statusMap = condominiums.map((condo) => {
            const account = accounts?.find((a) => a.condominium_id === condo.id)
            const isExpired = account?.expires_at
                ? new Date(account.expires_at) < new Date()
                : false

            return {
                condominiumId: condo.id,
                condominiumName: condo.name,
                connected: !!account && !isExpired,
                mpUserId: account?.mp_user_id ?? null,
                expiresAt: account?.expires_at ?? null,
                lastUpdated: account?.updated_at ?? null,
            }
        })

        return NextResponse.json({
            condominiums: statusMap,
            // Shorthand: connected = true si AL MENOS uno está conectado
            connected: statusMap.some((c) => c.connected),
        })
    } catch (error) {
        console.error('[MP Status] Error:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
