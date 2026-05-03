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
            .select('plan, units_limit')
            .eq('id', orgId)
            .single()

        // 3. Get Current Usage (Total Units)
        const { data: unitsCountRes } = await adminSupabase
            .from('units')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', orgId)

        // 4. Get Subscription Status
        const { data: sub } = await adminSupabase
            .from('subscriptions')
            .select('subscription_status, plan_name, created_at')
            .eq('organization_id', orgId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

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
            currentPlan: org?.plan || 'FREE',
            unitUsage: unitsCountRes || 0,
            unitLimit: org?.units_limit || 0,
            subscriptionStatus: sub?.subscription_status || 'none',
            daysRemaining: daysRemaining,
            previousPlanName: sub?.plan_name || org?.plan
        })

    } catch (error: any) {
        console.error('Error fetching org status:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
