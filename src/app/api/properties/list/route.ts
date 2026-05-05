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

    // 1. Get organization ID for the user
    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    let organizationId = orgUser?.organization_id
    console.log(`[API /properties/list] User: ${user.id}, OrgID: ${organizationId}`)

    if (!organizationId) {
        // Fallback: check if owner
        const { data: ownedOrg } = await adminSupabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
        organizationId = ownedOrg?.id
    }

    if (!organizationId) {
        return NextResponse.json({ properties: [], message: 'No organization found' })
    }

    // 2. Fetch properties for this organization
    const { data: properties, error } = await adminSupabase
        .from('condominiums')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 3. Fetch residents count for each property
    const propertyIds = properties.map(p => p.id)
    if (propertyIds.length > 0) {
        const { data: residents } = await adminSupabase
            .from('residents')
            .select('id, condominium_id')
            .in('condominium_id', propertyIds)

        const enhancedProperties = properties.map(p => ({
            ...p,
            residents_count: residents?.filter(r => r.condominium_id === p.id).length || 0
        }))

        return NextResponse.json({ 
            properties: enhancedProperties, 
            organizationId 
        })
    }

    return NextResponse.json({ 
        properties: properties || [], 
        organizationId 
    })
}
