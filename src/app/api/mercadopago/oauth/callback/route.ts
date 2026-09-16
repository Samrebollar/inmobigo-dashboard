import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyInviteToken } from '@/utils/invite-token'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/mercadopago/oauth/callback
 *
 * Mercado Pago redirige aquí tras la autorización OAuth.
 * Parámetros en query string:
 *   - code:  código de autorización (uno solo, válido por 10 min)
 *   - state: condominium_id O bien token de invitación firmado
 *   - error: presente si el usuario rechazó el acceso
 */
export async function GET(req: NextRequest) {
    const { searchParams } = req.nextUrl
    const code = searchParams.get('code')
    const rawState = searchParams.get('state')
    const error = searchParams.get('error')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // 1. Verificar si `state` es un token de invitación firmado
    let isInviteToken = false
    let condominiumId: string | null = null
    let inviteTokenString: string | null = null

    if (rawState) {
        const verification = verifyInviteToken(rawState)
        if (verification.valid && verification.condominiumId) {
            isInviteToken = true
            condominiumId = verification.condominiumId
            inviteTokenString = rawState
        } else {
            condominiumId = rawState
        }
    }

    const redirectBase = condominiumId
        ? `${appUrl}/dashboard/propiedades/${condominiumId}?tab=settings`
        : `${appUrl}/dashboard/propiedades`

    // ── Manejo de errores del proveedor ──────────────────────────────────────
    if (error || !code || !condominiumId) {
        console.error('[MP OAuth] Error en callback:', { error, code: !!code, condominiumId, isInviteToken })
        if (isInviteToken && inviteTokenString) {
            return NextResponse.redirect(`${appUrl}/conectar-mercadopago?token=${encodeURIComponent(inviteTokenString)}&error=${encodeURIComponent(error || 'error_autorizacion')}`)
        }
        const errParam = encodeURIComponent(error || 'missing_params')
        const targetUrl = redirectBase.includes('?')
            ? `${redirectBase}&mp_error=${errParam}`
            : `${redirectBase}?mp_error=${errParam}`
        return NextResponse.redirect(targetUrl)
    }

    const adminSupabase = createAdminClient()

    // ── Si NO es token de invitación, verificar sesión de usuario en InmobiGo ──
    if (!isInviteToken) {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.redirect(`${appUrl}/login`)
        }

        // Verificar que el usuario pertenece al condominio
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
            console.error('[MP OAuth] Usuario no autorizado para este condominio:', {
                userId: user.id,
                condominiumId,
            })
            const sep = redirectBase.includes('?') ? '&' : '?'
            return NextResponse.redirect(`${redirectBase}${sep}mp_error=unauthorized_condominium`)
        }
    } else {
        // Para token de invitación, verificar que no haya sido ya consumido en mp_connect_tokens
        const { data: dbToken } = await adminSupabase
            .from('mp_connect_tokens')
            .select('used_at')
            .eq('token', inviteTokenString)
            .maybeSingle()

        if (dbToken?.used_at) {
            console.warn('[MP OAuth] Intento de reutilización de token consumido:', inviteTokenString)
            return NextResponse.redirect(`${appUrl}/conectar-mercadopago?token=${encodeURIComponent(inviteTokenString!)}&error=already_used`)
        }
    }

    // ── Intercambiar code → access_token con Mercado Pago ────────────────────
    const callbackUrl = `${appUrl}/api/mercadopago/oauth/callback`

    let tokenData: any
    try {
        const mpRes = await fetch('https://api.mercadopago.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.NEXT_PUBLIC_MP_CLIENT_ID,
                client_secret: process.env.MP_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: callbackUrl,
            }),
        })

        if (!mpRes.ok) {
            const mpErr = await mpRes.json().catch(() => ({}))
            console.error('[MP OAuth] Error al intercambiar code:', mpErr)
            if (isInviteToken && inviteTokenString) {
                return NextResponse.redirect(`${appUrl}/conectar-mercadopago?token=${encodeURIComponent(inviteTokenString)}&error=token_exchange_failed`)
            }
            const sep = redirectBase.includes('?') ? '&' : '?'
            return NextResponse.redirect(`${redirectBase}${sep}mp_error=token_exchange_failed`)
        }

        tokenData = await mpRes.json()
    } catch (err) {
        console.error('[MP OAuth] Fetch a /oauth/token falló:', err)
        if (isInviteToken && inviteTokenString) {
            return NextResponse.redirect(`${appUrl}/conectar-mercadopago?token=${encodeURIComponent(inviteTokenString)}&error=network_error`)
        }
        const sep = redirectBase.includes('?') ? '&' : '?'
        return NextResponse.redirect(`${redirectBase}${sep}mp_error=network_error`)
    }

    const {
        access_token,
        refresh_token,
        public_key,
        user_id: mpUserId,
        expires_in,   // segundos (~180 días = 15552000)
    } = tokenData

    if (!access_token) {
        if (isInviteToken && inviteTokenString) {
            return NextResponse.redirect(`${appUrl}/conectar-mercadopago?token=${encodeURIComponent(inviteTokenString)}&error=no_access_token`)
        }
        const sep = redirectBase.includes('?') ? '&' : '?'
        return NextResponse.redirect(`${redirectBase}${sep}mp_error=no_access_token`)
    }

    // Calcular fecha de expiración
    const expiresAt = new Date(Date.now() + (expires_in ?? 15552000) * 1000).toISOString()

    // ── Guardar / actualizar en payment_accounts ──────────────────────────────
    const { error: upsertError } = await adminSupabase
        .from('payment_accounts')
        .upsert(
            {
                condominium_id: condominiumId,
                provider: 'mercadopago',
                access_token,
                refresh_token: refresh_token ?? null,
                mp_user_id: String(mpUserId),
                public_key: public_key ?? null,
                expires_at: expiresAt,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'condominium_id,provider' }
        )

    if (upsertError) {
        console.error('[MP OAuth] Error al guardar payment_account:', upsertError)
        if (isInviteToken && inviteTokenString) {
            return NextResponse.redirect(`${appUrl}/conectar-mercadopago?token=${encodeURIComponent(inviteTokenString)}&error=db_save_failed`)
        }
        const sep = redirectBase.includes('?') ? '&' : '?'
        return NextResponse.redirect(`${redirectBase}${sep}mp_error=db_save_failed`)
    }

    // Si es token de invitación, marcarlo como usado
    if (isInviteToken && inviteTokenString) {
        try {
            await adminSupabase
                .from('mp_connect_tokens')
                .update({ used_at: new Date().toISOString() })
                .eq('token', inviteTokenString)
        } catch (markErr) {
            console.warn('[MP OAuth] No se pudo marcar token como consumido:', markErr)
        }

        // Consultar nombre del condominio para mostrar en la pantalla de éxito
        const { data: condo } = await adminSupabase
            .from('condominiums')
            .select('name')
            .eq('id', condominiumId)
            .maybeSingle()

        const condoName = condo?.name || 'Condominio'
        return NextResponse.redirect(`${appUrl}/conectar-mercadopago/exito?condo=${encodeURIComponent(condoName)}`)
    }

    console.info('[MP OAuth] Conexión exitosa:', { condominiumId, mpUserId })

    // ── Redirigir de vuelta al dashboard con éxito ────────────────────────────
    const sep = redirectBase.includes('?') ? '&' : '?'
    return NextResponse.redirect(`${redirectBase}${sep}mp_connected=1`)
}
