import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Cuenta de Mercado Pago Connect (OAuth) de un condominio — cada condominio
 * tiene su propia cuenta vinculada en payment_accounts, así que los cobros a
 * residentes se cobran directo a esa cuenta y no a la de InmobiGo.
 */
export interface CondoMercadoPagoAccount {
    connected: boolean
    accessToken?: string
    mpUserId?: string
}

async function refreshAccessToken(condominiumId: string, refreshToken: string) {
    const res = await fetch('https://api.mercadopago.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: process.env.NEXT_PUBLIC_MP_CLIENT_ID,
            client_secret: process.env.MP_CLIENT_SECRET,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data.access_token) return null

    const expiresAt = new Date(Date.now() + (data.expires_in ?? 15552000) * 1000).toISOString()

    const adminSupabase = createAdminClient()
    await adminSupabase
        .from('payment_accounts')
        .update({
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? refreshToken,
            expires_at: expiresAt,
            updated_at: new Date().toISOString(),
        })
        .eq('condominium_id', condominiumId)
        .eq('provider', 'mercadopago')

    return { accessToken: data.access_token as string, mpUserId: String(data.user_id ?? '') }
}

/**
 * Devuelve el access_token vigente de Mercado Pago del condominio, refrescándolo
 * automáticamente si ya venció y hay refresh_token disponible.
 */
export async function getCondoMercadoPagoAccount(condominiumId: string): Promise<CondoMercadoPagoAccount> {
    if (!condominiumId) return { connected: false }

    const adminSupabase = createAdminClient()
    const { data: account } = await adminSupabase
        .from('payment_accounts')
        .select('access_token, refresh_token, mp_user_id, expires_at')
        .eq('condominium_id', condominiumId)
        .eq('provider', 'mercadopago')
        .maybeSingle()

    if (!account?.access_token) return { connected: false }

    const isExpired = account.expires_at ? new Date(account.expires_at) < new Date() : false

    if (!isExpired) {
        return { connected: true, accessToken: account.access_token, mpUserId: account.mp_user_id ?? undefined }
    }

    if (account.refresh_token) {
        const refreshed = await refreshAccessToken(condominiumId, account.refresh_token)
        if (refreshed) {
            return { connected: true, accessToken: refreshed.accessToken, mpUserId: refreshed.mpUserId || account.mp_user_id || undefined }
        }
    }

    return { connected: false }
}

/**
 * Busca la cuenta conectada de un condominio a partir del mp_user_id (el
 * "collector" que llega en la notificación webhook de Mercado Pago).
 */
export async function getCondoMercadoPagoAccountByMpUserId(mpUserId: string): Promise<{ condominiumId: string } & CondoMercadoPagoAccount | null> {
    if (!mpUserId) return null

    const adminSupabase = createAdminClient()
    const { data: account } = await adminSupabase
        .from('payment_accounts')
        .select('condominium_id, access_token, refresh_token, mp_user_id, expires_at')
        .eq('mp_user_id', mpUserId)
        .eq('provider', 'mercadopago')
        .maybeSingle()

    if (!account) return null

    const isExpired = account.expires_at ? new Date(account.expires_at) < new Date() : false

    if (!isExpired) {
        return { condominiumId: account.condominium_id, connected: true, accessToken: account.access_token, mpUserId: account.mp_user_id ?? undefined }
    }

    if (account.refresh_token) {
        const refreshed = await refreshAccessToken(account.condominium_id, account.refresh_token)
        if (refreshed) {
            return { condominiumId: account.condominium_id, connected: true, accessToken: refreshed.accessToken, mpUserId: refreshed.mpUserId || account.mp_user_id || undefined }
        }
    }

    return { condominiumId: account.condominium_id, connected: false }
}
