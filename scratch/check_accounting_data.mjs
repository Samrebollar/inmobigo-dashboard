import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkData() {
    // Get an org first
    const { data: orgs } = await supabase.from('organizations').select('id, name').limit(1)
    if (!orgs || orgs.length === 0) {
        console.log('No organizations found')
        return
    }
    const orgId = orgs[0].id
    console.log('Checking org:', orgs[0].name, orgId)

    const { data: billing } = await supabase
        .from('invoices')
        .select('id, amount, status, condominium_id')
        .limit(10)
    
    console.log('Sample Invoices:', billing)

    const { data: expenses } = await supabase
        .from('condo_expenses')
        .select('id, amount, organization_id')
        .limit(10)
    
    console.log('Sample Expenses:', expenses)
}

checkData()
