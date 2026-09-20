import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { activatePlanReferralAction } from '@/app/actions/benefit-actions'

const PLAN_LIMITS: Record<string, number> = {
    CORE: 20,
    PLUS: 60,
    ELITE: 120,
    CORPORATE: 250,
    'CORE PRUEBA': 5,
    'CORPORATE PLUS': 400,
}

async function handleWebhook(req: Request) {
    try {
        const url = new URL(req.url)
        let body: any = {}

        if (req.method === 'POST') {
            try {
                body = await req.json()
            } catch (e) {
                // Si el body es multipart o vacio
            }
        }

        const id = body.data?.id || body.id || url.searchParams.get('id') || url.searchParams.get('data.id')
        const type = body.type || body.topic || url.searchParams.get('type') || url.searchParams.get('topic')

        console.log('MercadoPago Webhook received:', { id, type, body, search: url.search })

        if (!id) {
            return NextResponse.json({ message: 'No ID provided' }, { status: 200 })
        }

        let preapprovalId = id
        let externalReference = body.external_reference || null

        // Si es una notificacion de pago individual, consultar el pago para obtener preapproval_id o external_reference
        if (type === 'payment' || body.action?.startsWith('payment')) {
            const paymentRes = await fetch(
                `https://api.mercadopago.com/v1/payments/${id}`,
                {
                    headers: {
                        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    },
                }
            )
            if (paymentRes.ok) {
                const paymentData = await paymentRes.json()
                if (paymentData.metadata?.preapproval_id) {
                    preapprovalId = paymentData.metadata.preapproval_id
                }
                if (paymentData.external_reference) {
                    externalReference = paymentData.external_reference
                }
            }
        }

        // Consultar estado en MercadoPago
        const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${preapprovalId}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                },
            }
        )

        if (!mpResponse.ok) {
            console.error('MercadoPago preapproval check failed:', mpResponse.statusText)
            return NextResponse.json(
                { error: 'No se pudo validar la suscripción con MercadoPago' },
                { status: 500 }
            )
        }

        const mpData = await mpResponse.json()

        if (mpData.status !== 'authorized') {
            console.log(`Suscripción ${preapprovalId} tiene estado ${mpData.status}, ignorando activación.`)
            return NextResponse.json({ message: `Estado: ${mpData.status}` }, { status: 200 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Buscar la suscripción correspondiente en DB
        const refId = externalReference || mpData.external_reference
        let query = supabase.from('subscriptions').select('*')

        if (refId) {
            query = query.or(`mercado_subscription_id.eq.${preapprovalId},id.eq.${refId}`)
        } else {
            query = query.eq('mercado_subscription_id', preapprovalId)
        }

        const { data: subscription, error: subError } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()

        if (subError || !subscription) {
            console.error('Subscription not found in DB:', { preapprovalId, refId, subError })
            return NextResponse.json(
                { error: 'Suscripción no encontrada en base de datos' },
                { status: 404 }
            )
        }

        const now = new Date()
        const nextPayment = new Date()
        nextPayment.setMonth(now.getMonth() + 1)

        // 1️⃣ Activar suscripción
        await supabase
            .from('subscriptions')
            .update({
                subscription_status: 'active',
                last_payment_date: now.toISOString(),
                next_payment_date: nextPayment.toISOString(),
                amount_paid: subscription.price,
                mercado_subscription_id: preapprovalId
            })
            .eq('id', subscription.id)

        // 2️⃣ Actualizar organización
        await supabase
            .from('organizations')
            .update({
                plan: subscription.plan_name,
                subscription_status: 'active',
                units_limit: PLAN_LIMITS[subscription.plan_name] || 0,
                next_billing_date: nextPayment.toISOString(),
            })
            .eq('id', subscription.organization_id)

        // 3️⃣ Liberar recompensa de referido si esta organización fue referida y
        // apenas activa su primer plan de pago. No debe tumbar la respuesta del
        // webhook si falla — la suscripción ya quedó activada arriba.
        try {
            await activatePlanReferralAction(subscription.organization_id)
        } catch (referralError) {
            console.error('Error activando recompensa de referido:', referralError)
        }

        console.log(`Suscripción ${subscription.id} para la organización ${subscription.organization_id} activada exitosamente.`)
        return NextResponse.json({ message: 'Suscripción activada exitosamente' })
    } catch (error: any) {
        console.error('Error procesando webhook de MercadoPago:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor', details: error.message },
            { status: 500 }
        )
    }
}

export async function POST(req: Request) {
    return handleWebhook(req)
}

export async function GET(req: Request) {
    return handleWebhook(req)
}