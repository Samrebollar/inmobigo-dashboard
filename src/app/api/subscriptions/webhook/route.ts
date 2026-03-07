import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const PLAN_LIMITS: Record<string, number> = {
    CORE: 20,
    PLUS: 60,
    ELITE: 120,
    CORPORATE: 250,
    'CORE PRUEBA': 500,
    'CORPORATE PLUS': 1000,
}

export async function POST(req: Request) {
    try {
        const body = await req.json()

        if (
            (body.type !== 'preapproval' && body.type !== 'subscription_preapproval') ||
            !body.data?.id
        ) {
            return NextResponse.json({ message: 'Evento ignorado' })
        }

        const preapprovalId = body.data.id

        const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${preapprovalId}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                },
            }
        )

        if (!mpResponse.ok) {
            return NextResponse.json(
                { error: 'No se pudo validar con MercadoPago' },
                { status: 500 }
            )
        }

        const mpData = await mpResponse.json()

        if (mpData.status !== 'authorized') {
            return NextResponse.json({ message: 'No autorizado' })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .or(`mercado_subscription_id.eq.${preapprovalId},id.eq.${mpData.external_reference}`)
            .maybeSingle()

        if (!subscription) {
            return NextResponse.json(
                { error: 'Suscripción no encontrada' },
                { status: 404 }
            )
        }

        if (subscription.subscription_status === 'active') {
            return NextResponse.json({ message: 'Ya activada (idempotente)' })
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

        return NextResponse.json({ message: 'Suscripción activada' })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}