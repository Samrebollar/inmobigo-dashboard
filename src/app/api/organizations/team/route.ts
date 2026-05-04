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

        // 2. Fetch Team Members
        const { data: teamMembers, error: teamError } = await adminSupabase
            .from('organization_users')
            .select('*')
            .eq('organization_id', orgId)

        if (teamError) throw teamError

        if (!teamMembers || teamMembers.length === 0) {
            return NextResponse.json([])
        }

        const userIds = teamMembers.map(tm => tm.user_id)
        
        // 3. Fetch Profiles
        const { data: profiles } = await adminSupabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)

        // 4. Fetch Auth Users to get metadata (names/emails) for invited users
        const { data: { users: authUsers } } = await adminSupabase.auth.admin.listUsers()
        const relevantAuthUsers = authUsers.filter(u => userIds.includes(u.id))

        const merged = teamMembers.map(tm => {
            const profile = profiles?.find(p => p.id === tm.user_id)
            const authUser = relevantAuthUsers.find(u => u.id === tm.user_id)
            
            const fullName = profile?.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.display_name || 'Usuario'
            const email = profile?.email || authUser?.email || 'N/A'

            const parts = fullName.split(' ')
            const first_name = parts[0]
            const last_name = parts.slice(1).join(' ')

            return {
                id: tm.id,
                user_id: tm.user_id,
                role: tm.role_new || tm.role || 'viewer',
                status: tm.status || 'active',
                created_at: tm.created_at,
                email,
                first_name,
                last_name
            }
        })

        // Sort: owner/admin at top
        const roleWeight: Record<string, number> = { 'owner': 0, 'admin': 1, 'admin_condominio': 1, 'admin_propiedad': 1, 'manager': 2, 'staff': 3, 'user': 4, 'viewer': 5 }
        merged.sort((a, b) => (roleWeight[a.role] || 99) - (roleWeight[b.role] || 99))

        return NextResponse.json(merged)

    } catch (error: any) {
        console.error('Error fetching team API:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
