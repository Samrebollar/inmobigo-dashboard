
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

    // Fetch org user with role_new instead of role
    const { data: orgUser, error } = await adminSupabase
        .from('organization_users')
        .select(`
            organization_id,
            role_new,
            organizations (
                business_type,
                name
            )
        `)
        .eq('user_id', user.id)
        .maybeSingle()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ orgUser })
}
