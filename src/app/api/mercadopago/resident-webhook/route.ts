import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import { getCondoMercadoPagoAccountByMpUserId } from '@/services/mercadopago-connect-service'

/**
 * Webhook de Mercado Pago para pagos de residentes (cuota de mantenimiento).
 * A diferencia del webhook de suscripciones (que usa la cuenta de InmobiGo),
 * este cobro se hizo con la cuenta OAuth del propio condominio, así que el
 * "user_id" que manda Mercado Pago es el collector_id del condominio — se usa
 * para encontrar qué payment_accounts (y por lo tanto qué condominio) aplicar.
 */
async function handleWebhook(req: Request) {
    try {
        const url = new URL(req.url)
        let body: any = {}

        if (req.method === 'POST') {
            try {
                body = await req.json()
            } catch (e) {
                // body vacío o no-JSON (algunas notificaciones IPN antiguas)
            }
        }

        const paymentId = body.data?.id || body.id || url.searchParams.get('id') || url.searchParams.get('data.id')
        const type = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic')
        const collectorMpUserId = body.user_id ? String(body.user_id) : url.searchParams.get('user_id')

        console.log('[MP Resident Webhook] Notificación recibida:', { paymentId, type, collectorMpUserId })

        if (!paymentId || (type && type !== 'payment')) {
            return NextResponse.json({ message: 'Notificación ignorada (no es un pago)' }, { status: 200 })
        }

        if (!collectorMpUserId) {
            console.warn('[MP Resident Webhook] Sin user_id de collector, no se puede identificar el condominio.')
            return NextResponse.json({ message: 'Sin user_id de collector' }, { status: 200 })
        }

        const account = await getCondoMercadoPagoAccountByMpUserId(collectorMpUserId)
        if (!account?.connected || !account.accessToken) {
            console.warn('[MP Resident Webhook] No hay cuenta conectada para mp_user_id:', collectorMpUserId)
            return NextResponse.json({ message: 'Cuenta no encontrada o desconectada' }, { status: 200 })
        }

        const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { Authorization: `Bearer ${account.accessToken}` },
        })

        if (!paymentRes.ok) {
            console.error('[MP Resident Webhook] No se pudo consultar el pago:', await paymentRes.text())
            return NextResponse.json({ error: 'No se pudo validar el pago con Mercado Pago' }, { status: 200 })
        }

        const payment = await paymentRes.json()

        if (payment.status !== 'approved') {
            console.log(`[MP Resident Webhook] Pago ${paymentId} en estado "${payment.status}", se ignora.`)
            return NextResponse.json({ message: `Estado: ${payment.status}` }, { status: 200 })
        }

        const residentId = payment.metadata?.resident_id || payment.external_reference
        if (!residentId) {
            console.error('[MP Resident Webhook] Pago aprobado sin resident_id en metadata:', paymentId)
            return NextResponse.json({ error: 'Pago sin resident_id asociado' }, { status: 200 })
        }

        const adminSupabase = createAdminClient()
        const noteTag = `mp_payment:${paymentId}`

        // Idempotencia — si ya procesamos este pago, no lo volvemos a aplicar
        const { data: existing } = await adminSupabase
            .from('resident_invoice_payments')
            .select('id')
            .eq('notes', noteTag)
            .limit(1)

        if (existing && existing.length > 0) {
            console.log(`[MP Resident Webhook] Pago ${paymentId} ya fue procesado, se ignora.`)
            return NextResponse.json({ message: 'Ya procesado' }, { status: 200 })
        }

        const { data: resident, error: residentError } = await adminSupabase
            .from('residents')
            .select('id, condominium_id, debt_amount')
            .eq('id', residentId)
            .maybeSingle()

        if (!resident) {
            console.error('[MP Resident Webhook] Residente no encontrado:', residentId, residentError)
            return NextResponse.json({ error: 'Residente no encontrado' }, { status: 200 })
        }

        let remaining = Number(payment.transaction_amount || 0)
        const paidAtIso = new Date().toISOString()

        const { data: pendingInvoices } = await adminSupabase
            .from('resident_invoices')
            .select('id, amount, balance_due, status, resident_id, condominium_id, organization_id, paid_at, due_date')
            .eq('resident_id', residentId)
            .in('status', ['pending', 'overdue'])
            .order('due_date', { ascending: true })

        for (const invoice of pendingInvoices || []) {
            if (remaining <= 0.01) break

            const currentBalance = Number(invoice.balance_due ?? invoice.amount)
            const applied = Math.min(remaining, currentBalance)
            if (applied <= 0) continue

            const paymentRowId = randomUUID()
            await adminSupabase.from('resident_invoice_payments').insert({
                id: paymentRowId,
                invoice_id: invoice.id,
                resident_id: invoice.resident_id,
                condominium_id: invoice.condominium_id,
                organization_id: invoice.organization_id,
                amount: applied,
                folio: `MP-${String(paymentId).slice(-10)}`,
                payment_method: 'Mercado Pago',
                notes: noteTag,
                paid_at: paidAtIso,
            })

            const newBalance = Math.max(0, currentBalance - applied)
            const isFullyPaid = newBalance <= 0.01

            await adminSupabase
                .from('resident_invoices')
                .update({
                    balance_due: newBalance,
                    status: isFullyPaid ? 'paid' : invoice.status,
                    paid_at: isFullyPaid ? paidAtIso : invoice.paid_at,
                    payment_method: 'Mercado Pago',
                })
                .eq('id', invoice.id)

            remaining -= applied
        }

        // Si sobra monto (deuda calculada que no tenía una factura generada
        // todavía), se descuenta directo del saldo manual del residente.
        if (remaining > 0.01 && Number(resident.debt_amount || 0) > 0) {
            const newDebtAmount = Math.max(0, Number(resident.debt_amount || 0) - remaining)
            await adminSupabase
                .from('residents')
                .update({ debt_amount: newDebtAmount })
                .eq('id', residentId)
        }

        console.log(`[MP Resident Webhook] Pago ${paymentId} aplicado exitosamente al residente ${residentId}.`)
        return NextResponse.json({ message: 'Pago aplicado exitosamente' })
    } catch (error: any) {
        console.error('[MP Resident Webhook] Error:', error)
        return NextResponse.json({ error: 'Error interno del servidor', details: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    return handleWebhook(req)
}

export async function GET(req: Request) {
    return handleWebhook(req)
}
