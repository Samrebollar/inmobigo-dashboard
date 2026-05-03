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
        unit_limit: 5,
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
        // 0️⃣ Obtener body primero para evitar problemas de consumo
        const { planKey } = await req.json()
        
        const supabase = await createClient()

        // 1️⃣ Obtener usuario autenticado
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2️⃣ Obtener organización del usuario - Si no tiene, crear una base (Auto-Onboarding)
        // Usamos admin client para evitar el error de recursión infinita en RLS
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminSupabase = createAdminClient()

        console.log('Checking existing organization for user:', user.id)
        
        // 1. Verificar si ya existe vinculación en organization_users
        let { data: orgUser, error: orgError } = await adminSupabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .single()

        let organizationId = orgUser?.organization_id

        if (orgError || !orgUser) {
            console.log('No organization found, auto-onboarding...')
            
            // 2. CREACIÓN AUTOMÁTICA DE ORGANIZACIÓN
            const orgName = 'Mi Organización'
            
            const { data: newOrg, error: createOrgError } = await adminSupabase
                .from('organizations')
                .insert({ 
                    name: orgName,
                    owner_id: user.id,
                    plan: 'free',
                    status: 'active'
                })
                .select()
                .single()

            if (createOrgError || !newOrg) {
                console.error('Error creating organization:', createOrgError)
                return NextResponse.json(
                    { 
                        error: 'Error al inicializar tu organización. Intenta de nuevo.',
                        message: createOrgError?.message,
                        details: createOrgError
                    },
                    { status: 500 }
                )
            }

            console.log('New organization created:', newOrg.id)

            // 3. Vincular usuario como ADMIN
            const { error: linkUserError } = await adminSupabase
                .from('organization_users')
                .insert({
                    user_id: user.id,
                    organization_id: newOrg.id,
                    role: 'admin',
                    status: 'active'
                })

            if (linkUserError) {
                console.error('Error linking user to organization:', linkUserError)
                return NextResponse.json(
                    { 
                        error: 'Error al vincular usuario con la nueva organización.',
                        message: linkUserError?.message,
                        details: linkUserError
                    },
                    { status: 500 }
                )
            }

            // 4. Actualizar perfil del usuario
            console.log('Updating user profile with organization...')
            const { error: updateProfileError } = await adminSupabase
                .from('profiles')
                .update({ 
                    organization_id: newOrg.id,
                    role: 'admin'
                })
                .eq('id', user.id)

            if (updateProfileError) {
                console.warn('Profile update warning:', updateProfileError.message)
                // No detenemos el flujo ya que la suscripción puede continuar
            }

            organizationId = newOrg.id
            console.log('Auto-onboarding completed successfully.')
        }

        // 3️⃣ Obtener plan del body (Ya obtenido al inicio como planKey)
        const plan = planMap[planKey as keyof typeof planMap]

        if (!plan || !plan.preapproval_plan_id) {
            return NextResponse.json(
                { error: 'Plan no configurado en MercadoPago' },
                { status: 400 }
            )
        }

        // 4️⃣ Verificar suscripción activa (y desactivar si ya expiró por tiempo)
        const { data: existingActive } = await adminSupabase
            .from('subscriptions')
            .select('id, created_at')
            .eq('organization_id', organizationId)
            .eq('subscription_status', 'active')
            .maybeSingle()

        if (existingActive) {
            const createdAt = new Date(existingActive.created_at)
            const nextPayment = new Date(createdAt)
            nextPayment.setMonth(nextPayment.getMonth() + 1)
            
            if (new Date() > nextPayment) {
                // Ya expiró por tiempo, lo marcamos como tal y dejamos continuar
                await adminSupabase
                    .from('subscriptions')
                    .update({ subscription_status: 'expired' })
                    .eq('id', existingActive.id)
                console.log('Previous subscription expired by time, allowing renewal...')
            } else {
                return NextResponse.json(
                    {
                        error: 'Suscripción Activa',
                        message: 'Ya tienes una suscripción vigente. No es necesario renovar aún.',
                    },
                    { status: 409 }
                )
            }
        }

        // 5️⃣ Crear registro pending en DB
        const { data: subscription, error: insertError } = await adminSupabase
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
                    payer_email: (user.email?.includes('admin') || user.email?.includes('sam32') || user.email?.includes('inmobigo'))
                        ? 'test_user_mx@testuser.com' 
                        : user.email,
                    back_url: process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') 
                        ? 'https://inmobigo.mx/dashboard?subscription=success' 
                        : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?subscription=success`,
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
        const { error: updateError } = await adminSupabase
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
            { 
                error: 'Error interno del servidor',
                message: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            },
            { status: 500 }
        )
    }
}