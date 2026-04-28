import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Fetching all residents...")
    const { data: residents, error } = await supabase
        .from('residents')
        .select('id, first_name, last_name, user_id, email')
    
    if (error) {
        console.error("Error:", error)
        return
    }

    console.log(`Total residents found: ${residents.length}`)
    residents.forEach(r => {
        console.log(`ID: ${r.id} | Name: ${r.first_name} ${r.last_name} | User ID: ${r.user_id} | Email: ${r.email}`)
    })
}

run()
