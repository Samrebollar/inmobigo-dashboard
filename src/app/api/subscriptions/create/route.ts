import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const planMap = {
    CORE: {
        price: 1199,
        unit_limit: 20,
        preapproval_plan_id: process.env.MP_CORE_ID,
    },
    PLUS: {
        price: 2499,
        unit_limit: 60,
        preapproval_plan_id: process.env.MP_PLUS_ID,
    },
    ELITE: {
        price: 4499,
        unit_limit: 120,
        preapproval_plan_id: process.env.MP_ELITE_ID,
    },
    CORPORATE: {
        price: 6999,
        unit_limit: 250,
        preapproval_plan_id: process.env.MP_CORP_ID,
    },
    'CORE PRUEBA': {
        price: 10,
        unit_limit: 500,
        preapproval_plan_id: process.env.MP_COREPRUEBA_ID,
    },
    'CORPORATE PLUS': {
        price: 9999,
        unit_limit: 1000,
        preapproval_plan_id: process.env.MP_CORPPLUS_ID,
    },
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient()

        // 1️⃣ Obtener usuario autenticado
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2️⃣ Obtener organización del usuario
        const { data: orgUser, error: orgError } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()

        if (orgError || !orgUser) {
            return NextResponse.json(
                { error: 'Usuario no pertenece a ninguna organización' },
                { status: 400 }
            )
        }

        const organizationId = orgUser.organization_id

        // 3️⃣ Obtener plan del body
        const { planKey } = await req.json()

        const plan = planMap[planKey as keyof typeof planMap]

        if (!plan || !plan.preapproval_plan_id) {
            return NextResponse.json(
                { error: 'Plan no configurado en MercadoPago' },
                { status: 400 }
            )
        }

        // 4️⃣ Verificar que no exista suscripción activa en esa organización
        const { data: existingActive } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('subscription_status', 'active')
            .maybeSingle()

        if (existingActive) {
            return NextResponse.json(
                {
                    error:
                        'Ya existe una suscripción activa para esta organización.',
                },
                { status: 409 }
            )
        }

        // 5️⃣ Crear registro pending en DB
        const { data: subscription, error: insertError } = await supabase
            .from('subscriptions')
            .insert({
                user_id: user.id,
                organization_id: organizationId,
                plan_name: planKey,
                price: plan.price,
                unit_limit: plan.unit_limit,
                billing_cycle: 'monthly',
                subscription_status: 'pending',
            })
            .select()
            .single()

        if (insertError || !subscription) {
            console.error('DB Insert Error:', insertError)
            return NextResponse.json(
                {
                    error: 'Error creando suscripción en base de datos',
                    message: insertError?.message,
                    details: insertError?.details
                },
                { status: 500 }
            )
        }

        // 6️⃣ Validar configuración
        if (!process.env.MP_ACCESS_TOKEN) {
            throw new Error('MP_ACCESS_TOKEN no configurado')
        }

        if (!process.env.NEXT_PUBLIC_APP_URL) {
            throw new Error('NEXT_PUBLIC_APP_URL no configurado')
        }

        // 7️⃣ Crear preapproval en MercadoPago (Manual para permitir hosted checkout sin card_token_id)
        const mpResponse = await fetch(
            'https://api.mercadopago.com/preapproval',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reason: `InmobiGo ${planKey}`,
                    external_reference: subscription.id,
                    payer_email: user.email,
                    back_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
                    auto_recurring: {
                        frequency: 1,
                        frequency_type: 'months',
                        transaction_amount: plan.price,
                        currency_id: 'MXN',
                    },
                }),
            }
        )

        let mpData
        try {
            mpData = await mpResponse.json()
        } catch (e) {
            mpData = { message: 'No se pudo parsear la respuesta de MercadoPago' }
        }

        if (!mpResponse.ok) {
            console.error('MercadoPago Error Details:', JSON.stringify(mpData, null, 2))

            return NextResponse.json(
                {
                    error: 'Error al conectar con MercadoPago',
                    message: mpData.message || mpData.cause?.[0]?.description || 'Error desconocido',
                    details: mpData,
                },
                { status: 500 }
            )
        }

        // 8️⃣ Actualizar DB con IDs de MercadoPago
        const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
                mercado_subscription_id: mpData.id,
                mercado_customer_id: mpData.payer_id,
            })
            .eq('id', subscription.id)

        if (updateError) {
            console.error('DB Update Error:', updateError)
            return NextResponse.json(
                { error: 'Error actualizando suscripción' },
                { status: 500 }
            )
        }

        // 9️⃣ Devolver checkout
        return NextResponse.json({
            checkoutUrl: mpData.init_point,
        })
    } catch (error: any) {
        console.error('Subscription Creation Error:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}