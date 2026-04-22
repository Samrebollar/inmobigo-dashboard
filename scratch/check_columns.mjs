import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://djxllvplxdigosbhhicn.supabase.co"
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg"

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function checkSchema() {
    const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'reserve_fund_transactions' })
    if (error) {
        console.log('RPC get_table_columns not available. Trying raw query...')
        // Fallback: try to see if a dummy insert with expense_id fails
        const { error: insError } = await supabase
            .from('reserve_fund_transactions')
            .insert({ reason: 'test', amount: 0, expense_id: '00000000-0000-0000-0000-000000000000' })
        
        console.log('Insert error:', insError?.message || 'No error (columns exist)')
    } else {
        console.log('Columns:', data)
    }
}

checkSchema()
