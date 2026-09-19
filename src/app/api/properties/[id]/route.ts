import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const id = params.id

        if (!id) {
            return NextResponse.json({ error: 'Property ID is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = createAdminClient()

        // Fetch condominium using admin client to bypass client RLS issues
        const { data: property, error } = await adminSupabase
            .from('condominiums')
            .select('*')
            .eq('id', id)
            .single()

        if (error || !property) {
            return NextResponse.json({ error: error?.message || 'Property not found' }, { status: 404 })
        }

        return NextResponse.json({ property })
    } catch (err: any) {
        console.error('[API /properties/[id]] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
