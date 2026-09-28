import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function PUT(req: Request) {
    try {
        const body = await req.json()
        const { orgId, name } = body
        
        if (!orgId || !name) {
            return NextResponse.json({ error: 'Escribe el nombre de la organización' }, { status: 400 })
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

        // 3. Verify user's role in the organization (organization_users.role ya
        //    no existe; el rol vive en role_new). El dueño siempre puede.
        const { data: org } = await adminSupabase
            .from('organizations')
            .select('owner_id')
            .eq('id', orgId)
            .maybeSingle()

        const { data: orgUser } = await adminSupabase
            .from('organization_users')
            .select('role_new')
            .eq('organization_id', orgId)
            .eq('user_id', user.id)
            .maybeSingle()

        const isOwner = org?.owner_id === user.id
        if (!isOwner && !orgUser) {
            return NextResponse.json({ error: 'No perteneces a esta organización' }, { status: 403 })
        }

        if (!isOwner && !['owner', 'admin_condominio', 'admin_propiedad', 'super_admin'].includes(orgUser?.role_new as string)) {
            return NextResponse.json({ error: 'Solo el dueño o un administrador puede cambiar el nombre de la organización' }, { status: 403 })
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
