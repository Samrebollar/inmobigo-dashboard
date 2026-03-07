import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { organizationId } = await req.json()

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('organization_id', organizationId)
            .eq('subscription_status', 'active')
            .maybeSingle()

        if (!subscription) {
            return NextResponse.json(
                { error: 'No hay suscripción activa' },
                { status: 404 }
            )
        }

        const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${subscription.mercado_subscription_id}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'cancelled',
                }),
            }
        )

        if (!mpResponse.ok) {
            return NextResponse.json(
                { error: 'Error en MercadoPago' },
                { status: 500 }
            )
        }

        await supabase
            .from('subscriptions')
            .update({ subscription_status: 'cancelled' })
            .eq('id', subscription.id)

        await supabase
            .from('organizations')
            .update({
                subscription_status: 'cancelled',
                units_limit: 0,
            })
            .eq('id', organizationId)

        return NextResponse.json({ message: 'Cancelada correctamente' })
    } catch (error) {
        console.error(error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}