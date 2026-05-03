import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    const adminSupabase = createAdminClient()
    
    // Search for the condominiums mentioned by the user
    const { data: condos, error: condoError } = await adminSupabase
        .from('condominiums')
        .select('id, name, organization_id')
        .or('name.ilike.%Las palmas%,name.ilike.%zacil%')

    if (condoError) {
        return NextResponse.json({ error: condoError.message }, { status: 500 })
    }

    if (!condos || condos.length === 0) {
        return NextResponse.json({ message: 'No se encontraron los condominios Las palmas o zacil' })
    }

    // Get the organization IDs found
    const orgIds = Array.from(new Set(condos.map(c => c.organization_id)))

    // Check organizations
    const { data: orgs } = await adminSupabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)

    // Check if the user is linked to any of these
    const userEmail = 'samuelacosta182320@gmail.com'
    const { data: userAuth } = await adminSupabase.auth.admin.listUsers()
    const targetUser = userAuth.users.find(u => u.email === userEmail)

    if (!targetUser) {
        return NextResponse.json({ message: `Usuario ${userEmail} no encontrado en Auth`, condos, orgs })
    }

    const { data: userLinks } = await adminSupabase
        .from('organization_users')
        .select('*')
        .eq('user_id', targetUser.id)

    return NextResponse.json({
        user: {
            id: targetUser.id,
            email: targetUser.email,
            links: userLinks
        },
        foundCondos: condos,
        foundOrgs: orgs
    })
}
