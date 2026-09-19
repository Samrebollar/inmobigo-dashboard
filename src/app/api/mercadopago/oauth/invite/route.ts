import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { generateInviteToken } from '@/utils/invite-token'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/mercadopago/oauth/invite
 * Requiere sesión de administrador.
 * Body: { condominium_id: string }
 * Responde: { invite_url: string, expires_at: string }
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => ({}))
        const { condominium_id: condominiumId } = body

        if (!condominiumId) {
            return NextResponse.json(
                { error: 'Se requiere condominium_id' },
                { status: 400 }
            )
        }

        // 1. Verificar usuario autenticado
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'No autorizado' },
                { status: 401 }
            )
        }

        const adminSupabase = createAdminClient()

        // 2. Verificar que el usuario pertenece al condominio
        const { data: membership } = await adminSupabase
            .from('organization_users')
            .select(`
                organization_id,
                organizations!inner (
                    condominiums!inner ( id )
                )
            `)
            .eq('user_id', user.id)
            .filter('organizations.condominiums.id', 'eq', condominiumId)
            .maybeSingle()

        if (!membership) {
            return NextResponse.json(
                { error: 'No tienes permisos sobre este condominio' },
                { status: 403 }
            )
        }

        // 3. Generar token firmado HMAC
        const { token, expiresAt } = generateInviteToken(condominiumId, 48)

        // 4. Intentar guardar en mp_connect_tokens (si la tabla existe)
        try {
            await adminSupabase.from('mp_connect_tokens').insert({
                token,
                condominium_id: condominiumId,
                expires_at: expiresAt.toISOString(),
                created_by: user.id,
            })
        } catch (dbErr) {
            console.warn('[MP Invite] No se pudo guardar token en mp_connect_tokens (¿tabla pendiente?):', dbErr)
        }

        // 5. Construir URL pública
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || (req.nextUrl ? `${req.nextUrl.protocol}//${req.nextUrl.host}` : 'http://localhost:3000')
        const inviteUrl = `${appUrl}/conectar-mercadopago?token=${encodeURIComponent(token)}`

        return NextResponse.json({
            invite_url: inviteUrl,
            expires_at: expiresAt.toISOString(),
        })
    } catch (error) {
        console.error('[MP Invite Route] Error:', error)
        return NextResponse.json(
            { error: 'Error al generar el enlace de invitación' },
            { status: 500 }
        )
    }
}
