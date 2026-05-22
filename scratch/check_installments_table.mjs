import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTable() {
    console.log("Checking if agreement_installments table exists...")
    const { data, error } = await supabase
        .from('agreement_installments')
        .select('*')
        .limit(1)

    if (error) {
        console.error("❌ Table error:", error)
        
        // Let's try to query the schema details or run a query to get database columns
        console.log("Querying list of tables and columns from system catalog...")
        const { data: tablesData, error: tablesError } = await supabase
            .rpc('get_table_columns', { table_name: 'agreement_installments' })
            
        if (tablesError) {
            console.error("❌ RPC get_table_columns failed, attempting raw select from pg_attribute/pg_class")
            
            // Try to fetch a mock query to see if we can get anything
            const { data: rawData, error: rawError } = await supabase
                .from('agreement_installments')
                .select('id')
                .limit(1)
            
            if (rawError) {
                console.error("❌ Raw Select failed:", rawError)
            } else {
                console.log("✅ Table exists (has 'id')")
            }
        } else {
            console.log("✅ Columns info:", tablesData)
        }
    } else {
        console.log("✅ Table exists. Sample data:", data)
    }
}

checkTable()
