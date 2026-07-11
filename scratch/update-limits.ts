import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    const orgId = 'cc123967-5f96-4d4e-acfa-0b4eb889b570'
    const { data, error } = await supabase
        .from('subscriptions')
        .update({ unit_limit: 1000 })
        .eq('organization_id', orgId)
    
    if (error) {
        console.error('ERROR UPDATING LIMITS:', error)
    } else {
        console.log('SUCCESS! Limits updated to 1000 for org cc123967-5f96-4d4e-acfa-0b4eb889b570')
    }
}

run()
