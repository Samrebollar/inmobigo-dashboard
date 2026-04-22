import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function check() {
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
    if (userError) {
        console.log('Error listing users (probably not admin key). Trying current user...')
        // Fallback to searching by email if possible
    }

    // Let's just check the tables for common emails if possible, or use a known user ID if we had it.
    // Since we don't have the user ID easily, let's just dump the roles tables to see common users.
    
    console.log('--- ORGANIZATION_USERS ---')
    const { data: orgUsers } = await supabase.from('organization_users').select('*')
    console.log(JSON.stringify(orgUsers, null, 2))

    console.log('--- RESIDENTS ---')
    const { data: residents } = await supabase.from('residents').select('*')
    console.log(JSON.stringify(residents, null, 2))

    console.log('--- PROFILES ---')
    const { data: profiles } = await supabase.from('profiles').select('*')
    console.log(JSON.stringify(profiles, null, 2))
}
check()
