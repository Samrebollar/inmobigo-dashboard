import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = createAdminClient()

        // 1. Get Organization
        const { data: orgUser } = await adminSupabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!orgUser) {
            return NextResponse.json({ error: 'No organization found' }, { status: 404 })
        }

        const orgId = orgUser.organization_id

        // 2. Get Current Plan and Limits
        const { data: org } = await adminSupabase
            .from('organizations')
            .select('name, business_type, plan, units_limit')
            .eq('id', orgId)
            .single()

        // 3. Get Current Usage (Total Units)
        const { count } = await adminSupabase
            .from('units')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)

        // 4. Get Subscription Status
        let { data: sub } = await adminSupabase
            .from('subscriptions')
            .select('*')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        // 🔄 AUTO-SYNC: Si el estado actual es pending o vencido, consultar automáticamente a MercadoPago
        if ((!sub || sub.subscription_status !== 'active') && process.env.MP_ACCESS_TOKEN) {
            const { data: pendingSub } = await adminSupabase
                .from('subscriptions')
                .select('*')
                .eq('organization_id', orgId)
                .or('subscription_status.eq.pending,subscription_status.eq.expired')
                .not('mercado_subscription_id', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (pendingSub?.mercado_subscription_id) {
                try {
                    const mpRes = await fetch(
                        `https://api.mercadopago.com/preapproval/${pendingSub.mercado_subscription_id}`,
                        {
                            headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
                        }
                    )
                    if (mpRes.ok) {
                        const mpData = await mpRes.json()
                        if (mpData.status === 'authorized') {
                            const PLAN_LIMITS: Record<string, number> = {
                                CORE: 20, PLUS: 60, ELITE: 120, CORPORATE: 250, 'CORE PRUEBA': 5, 'CORPORATE PLUS': 400
                            }
                            const now = new Date()
                            const nextPayment = new Date()
                            nextPayment.setMonth(now.getMonth() + 1)

                            await adminSupabase.from('subscriptions').update({
                                subscription_status: 'active',
                                last_payment_date: now.toISOString(),
                                next_payment_date: nextPayment.toISOString(),
                                amount_paid: pendingSub.price,
                            }).eq('id', pendingSub.id)

                            await adminSupabase.from('organizations').update({
                                plan: pendingSub.plan_name,
                                subscription_status: 'active',
                                units_limit: PLAN_LIMITS[pendingSub.plan_name] || 0,
                                next_billing_date: nextPayment.toISOString(),
                            }).eq('id', orgId)

                            sub = {
                                ...pendingSub,
                                subscription_status: 'active'
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Auto-sync MercadoPago pending check failed:', err)
                }
            }
        }

        let daysRemaining = 0
        if (sub) {
            const createdAt = new Date(sub.created_at)
            const nextPayment = new Date(createdAt)
            nextPayment.setMonth(nextPayment.getMonth() + 1)
            const now = new Date()
            daysRemaining = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        }

        return NextResponse.json({
            organizationId: orgId,
            organizationName: org?.name,
            businessType: org?.business_type,
            currentPlan: org?.plan || 'FREE',
            unitUsage: count || 0,
            unitLimit: org?.units_limit || 0,
            subscriptionStatus: sub?.subscription_status || 'none',
            daysRemaining: daysRemaining,
            previousPlanName: sub?.plan_name || org?.plan,
            userEmail: user.email
        })

    } catch (error: any) {
        console.error('Error fetching org status:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
