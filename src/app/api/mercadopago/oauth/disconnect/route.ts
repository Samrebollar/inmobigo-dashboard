import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * POST /api/mercadopago/oauth/disconnect
 * Body: { condominium_id: string }
 *
 * Desconecta la cuenta de Mercado Pago de un condominio.
 * Solo puede hacerlo un usuario que pertenezca a esa organización.
 */
export async function POST(req: Request) {
    try {
        // 1. Verificar sesión
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { condominium_id } = await req.json()

        if (!condominium_id) {
            return NextResponse.json({ error: 'condominium_id requerido' }, { status: 400 })
        }

        const adminSupabase = createAdminClient()

        // 2. Verificar que el usuario pertenece a la organización que controla ese condominio
        const { data: membership } = await adminSupabase
            .from('organization_users')
            .select(`
                organization_id,
                organizations!inner (
                    condominiums!inner ( id )
                )
            `)
            .eq('user_id', user.id)
            .filter('organizations.condominiums.id', 'eq', condominium_id)
            .maybeSingle()

        if (!membership) {
            return NextResponse.json(
                { error: 'No tienes permiso para desconectar esta cuenta' },
                { status: 403 }
            )
        }

        // 3. Eliminar el registro de payment_accounts
        const { error: deleteError } = await adminSupabase
            .from('payment_accounts')
            .delete()
            .eq('condominium_id', condominium_id)
            .eq('provider', 'mercadopago')

        if (deleteError) {
            console.error('[MP Disconnect] Error al eliminar payment_account:', deleteError)
            return NextResponse.json(
                { error: 'Error al desconectar la cuenta' },
                { status: 500 }
            )
        }

        return NextResponse.json({ success: true, message: 'Cuenta desconectada correctamente' })
    } catch (error) {
        console.error('[MP Disconnect] Error:', error)
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
    }
}
