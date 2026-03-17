import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { orgId, name } = body
        
        if (!orgId || !name) {
            return NextResponse.json({ error: 'Missing req properties' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Get authenticated user
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Use admin client to bypass RLS issues
        const { createAdminClient } = await import('@/utils/supabase/admin')
        const adminSupabase = createAdminClient()

        // 3. Verify user's role in the organization
        const { data: orgUser, error: roleError } = await adminSupabase
            .from('organization_users')
            .select('role')
            .eq('organization_id', orgId)
            .eq('user_id', user.id)
            .single()

        if (roleError || !orgUser) {
            return NextResponse.json({ error: 'User does not belong to this organization' }, { status: 403 })
        }

        if (orgUser.role !== 'owner' && orgUser.role !== 'admin') {
            return NextResponse.json({ error: 'Insufficient permissions to update organization' }, { status: 403 })
        }

        // 4. Update the organization name
        const { error: updateError } = await adminSupabase
            .from('organizations')
            .update({ name })
            .eq('id', orgId)

        if (updateError) {
            console.error('Database Update Error:', updateError)
            return NextResponse.json({ error: 'Failed to update database', details: updateError }, { status: 500 })
        }

        return NextResponse.json({ message: 'Organization updated successfully' })

    } catch (error: any) {
        console.error('Update Organization Error:', error)
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                message: error.message
            },
            { status: 500 }
        )
    }
}
