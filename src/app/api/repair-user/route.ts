import { createAdminClient } from '@/utils/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
    const adminSupabase = createAdminClient()
    const userEmail = 'samuelacosta182320@gmail.com'
    const targetOrgId = 'cc123967-5f96-4d4e-acfa-0b4eb889b570' // Organization "Samana" with Las Palmas and Zacil

    try {
        // 1. Get User ID
        const { data: userAuth, error: authError } = await adminSupabase.auth.admin.listUsers()
        if (authError) throw authError
        
        const targetUser = userAuth.users.find(u => u.email === userEmail)
        if (!targetUser) {
            return NextResponse.json({ error: `Usuario ${userEmail} no encontrado` }, { status: 404 })
        }

        console.log(`Found user ${userEmail} with ID ${targetUser.id}`)

        // 2. Remove any current links to other organizations to avoid confusion
        const { error: deleteError } = await adminSupabase
            .from('organization_users')
            .delete()
            .eq('user_id', targetUser.id)

        if (deleteError) console.warn('Error deleting old links:', deleteError)

        // 3. Link to the correct organization (Samana)
        const { error: linkError } = await adminSupabase
            .from('organization_users')
            .insert({
                user_id: targetUser.id,
                organization_id: targetOrgId,
                role: 'owner', // Give them owner role to be safe
                status: 'active'
            })

        if (linkError) {
            console.error('Error linking to correct org:', linkError)
            return NextResponse.json({ error: 'Error al vincular con la organización correcta', details: linkError }, { status: 500 })
        }

        // 4. Update Profile
        const { error: profileError } = await adminSupabase
            .from('profiles')
            .update({ 
                organization_id: targetOrgId,
                role: 'owner'
            })
            .eq('id', targetUser.id)

        if (profileError) console.warn('Error updating profile:', profileError)

        // 5. Ensure the organization has an active subscription (Core Prueba as user said)
        const { data: existingSub } = await adminSupabase
            .from('subscriptions')
            .select('*')
            .eq('organization_id', targetOrgId)
            .maybeSingle()

        if (!existingSub || existingSub.subscription_status !== 'active') {
            console.log('Activating subscription for Samana...')
            const { error: subError } = await adminSupabase
                .from('subscriptions')
                .upsert({
                    organization_id: targetOrgId,
                    user_id: targetUser.id,
                    plan_name: 'CORE PRUEBA',
                    subscription_status: 'active',
                    price: 10,
                    unit_limit: 5,
                    billing_cycle: 'monthly'
                }, { onConflict: 'organization_id' })
            
            if (subError) console.warn('Error activating subscription:', subError)
        }

        return NextResponse.json({
            message: `Usuario ${userEmail} vinculado exitosamente a la organización Samana (Las Palmas / Zacil).`,
            userId: targetUser.id,
            orgId: targetOrgId
        })

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
