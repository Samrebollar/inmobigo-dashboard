
import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminSupabase = createAdminClient()

    // 1. Check organization_users
    const { data: orgUsers, error: orgUsersError } = await adminSupabase
        .from('organization_users')
        .select('*')
        .eq('user_id', user.id)

    // 2. Check organizations
    const orgIds = orgUsers?.map(ou => ou.organization_id) || []
    const { data: organizations } = await adminSupabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)

    // 3. Check condominiums
    const { data: condominiums } = await adminSupabase
        .from('condominiums')
        .select('*')
        .in('organization_id', orgIds)

    return NextResponse.json({
        user: {
            id: user.id,
            email: user.email
        },
        orgUsers,
        orgUsersError,
        organizations,
        condominiums,
        timestamp: new Date().toISOString()
    })
}
