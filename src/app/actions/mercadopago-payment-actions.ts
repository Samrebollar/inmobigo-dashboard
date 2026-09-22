'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { calculateResidentDebtSummary } from '@/utils/finance-utils'
import { getCondoMercadoPagoAccount } from '@/services/mercadopago-connect-service'

/**
 * Crea una preferencia de pago en Mercado Pago para que el residente liquide
 * su saldo — el cobro se hace directo a la cuenta de Mercado Pago del propio
 * condominio (OAuth Connect en payment_accounts), no a la de InmobiGo.
 */
export async function createResidentPaymentCheckout(options?: { amount?: number; concept?: string; defaultPaymentMethodId?: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { success: false, error: 'no_session', message: 'Debes iniciar sesión.' }
    }

    const adminSupabase = createAdminClient()

    const { data: resident } = await adminSupabase
        .from('residents')
        .select('*, condominiums(id, name), units(id, unit_number, monto_mensual, payment_deadline)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        return { success: false, error: 'not_linked', message: 'No encontramos una propiedad vinculada a tu cuenta.' }
    }

    const condominiumId = resident.condominium_id || resident.condominiums?.id
    if (!condominiumId) {
        return { success: false, error: 'no_condominium', message: 'Tu cuenta no tiene un condominio asociado.' }
    }

    const { data: invoices } = await adminSupabase
        .from('resident_invoices')
        .select('*')
        .eq('resident_id', resident.id)
        .order('created_at', { ascending: false })

    const totalDebt = calculateResidentDebtSummary({
        resident,
        invoices: invoices || [],
        unit: resident.units,
    }).debt

    if (totalDebt <= 0) {
        return { success: false, error: 'no_debt', message: 'No tienes saldo pendiente por pagar.' }
    }

    // Si se manda un monto (pago de una cuota específica desde la tabla), se
    // cobra ese monto en vez del total de la deuda — nunca más de lo que en
    // realidad se debe.
    const requestedAmount = Number(options?.amount)
    const debt = requestedAmount > 0 ? Math.min(requestedAmount, totalDebt) : totalDebt

    const account = await getCondoMercadoPagoAccount(condominiumId)
    if (!account.connected || !account.accessToken) {
        return { success: false, error: 'not_connected', message: 'Tu condominio aún no tiene Mercado Pago conectado.' }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.inmobigo.mx'
    const condoName = resident.condominiums?.name || 'tu condominio'
    const unitLabel = resident.units?.unit_number ? ` — Unidad ${resident.units.unit_number}` : ''
    const itemTitle = options?.concept
        ? `${options.concept} — ${condoName}${unitLabel}`
        : `Cuota de mantenimiento — ${condoName}${unitLabel}`

    try {
        const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${account.accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: [
                    {
                        title: itemTitle,
                        quantity: 1,
                        unit_price: Number(debt.toFixed(2)),
                        currency_id: 'MXN',
                    },
                ],
                payer: user.email ? { email: user.email } : undefined,
                metadata: {
                    resident_id: resident.id,
                    condominium_id: condominiumId,
                },
                external_reference: resident.id,
                back_urls: {
                    success: `${appUrl}/residente/payments?mp_status=success`,
                    pending: `${appUrl}/residente/payments?mp_status=pending`,
                    failure: `${appUrl}/residente/payments?mp_status=failure`,
                },
                auto_return: 'approved',
                notification_url: `${appUrl}/api/mercadopago/resident-webhook`,
                // Cuando el residente ya eligió una forma específica en nuestro
                // selector (p.ej. "Saldo Mercado Pago" u "OXXO"), se manda como
                // sugerencia a Mercado Pago para que su checkout abra con esa
                // opción ya resaltada — es solo un hint, el residente puede
                // cambiarla en la propia pantalla de Mercado Pago.
                ...(options?.defaultPaymentMethodId
                    ? { payment_methods: { default_payment_method_id: options.defaultPaymentMethodId } }
                    : {}),
            }),
        })

        const mpData = await mpRes.json()

        if (!mpRes.ok || !mpData.init_point) {
            console.error('[createResidentPaymentCheckout] MP error:', mpData)
            return { success: false, error: 'mp_error', message: mpData.message || 'No se pudo crear el pago con Mercado Pago.' }
        }

        return { success: true, checkoutUrl: mpData.init_point as string }
    } catch (err: any) {
        console.error('[createResidentPaymentCheckout] Exception:', err)
        return { success: false, error: 'network_error', message: 'No se pudo conectar con Mercado Pago.' }
    }
}
