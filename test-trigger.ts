import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { join } from 'path'

dotenv.config({ path: join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTrigger() {
    console.log("=== CHECKING POSTGRES TRIGGERS ===")
    // Using an RPC call or direct query if possible. Since we can't query pg_trigger directly 
    // without admin rights in the REST API, let's actually try to insert a fake unit to see 
    // the exact error message that comes back, which will tell us if it's the trigger or our JS.
    
    // 1. Get a real condominium
    const { data: condos } = await supabase.from('condominiums').select('*').neq('id', 'demo-condo').limit(1)
    if (!condos || condos.length === 0) {
        console.log("No real condos found to test.")
        return
    }
    
    const testCondo = condos[0]
    console.log(`Testing insert on condo: ${testCondo.name}`)
    
    // Try to insert a unit
    const { data, error } = await supabase.from('units').insert({
        condominium_id: testCondo.id,
        unit_number: 'TRIGGER-TEST-1234',
        type: 'apartment',
        status: 'vacant'
    })
    
    console.log("Result Error:", error)
    
    if (!error) {
        console.log("Uh oh, the insert succeeded! Deleting the test unit...")
        await supabase.from('units').delete().eq('unit_number', 'TRIGGER-TEST-1234')
    }
}

checkTrigger().catch(console.error)
