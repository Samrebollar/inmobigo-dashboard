import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        // 1. Verify the caller is authenticated
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
        }

        const { organizationId } = await req.json()

        if (!organizationId) {
            return NextResponse.json({ error: 'organizationId requerido' }, { status: 400 })
        }

        const adminSupabase = createAdminClient()

        // 2. Verify the authenticated user actually belongs to this organization
        //    (must be an organization_users member — not just any user)
        const { data: orgMembership } = await adminSupabase
            .from('organization_users')
            .select('organization_id, role_new')
            .eq('user_id', user.id)
            .eq('organization_id', organizationId)
            .maybeSingle()

        if (!orgMembership) {
            return NextResponse.json(
                { error: 'No tienes permiso para cancelar esta suscripción' },
                { status: 403 }
            )
        }

        // 3. Find the active subscription for this organization
        const { data: subscription } = await adminSupabase
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

        // 4. Cancel in MercadoPago
        const mpResponse = await fetch(
            `https://api.mercadopago.com/preapproval/${subscription.mercado_subscription_id}`,
            {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: 'cancelled' }),
            }
        )

        if (!mpResponse.ok) {
            const mpError = await mpResponse.json().catch(() => ({}))
            console.error('MercadoPago cancel error:', mpError)
            return NextResponse.json(
                { error: 'Error al cancelar en MercadoPago' },
                { status: 500 }
            )
        }

        // 5. Update local DB
        await adminSupabase
            .from('subscriptions')
            .update({ subscription_status: 'cancelled' })
            .eq('id', subscription.id)

        await adminSupabase
            .from('organizations')
            .update({
                subscription_status: 'cancelled',
                units_limit: 0,
            })
            .eq('id', organizationId)

        return NextResponse.json({ message: 'Suscripción cancelada correctamente' })
    } catch (error) {
        console.error('Cancel subscription error:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}