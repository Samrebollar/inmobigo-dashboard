import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Checking tickets table contents...")
    const { data: tickets, error } = await supabase
        .from('tickets')
        .select('*')
    
    if (error) {
        console.error("Error:", error)
        return
    }

    console.log(`Total tickets found: ${tickets.length}`)
    tickets.forEach(t => {
        console.log(`ID: ${t.id} | Title: ${t.title} | Resident ID: ${t.resident_id}`)
    })
}

run()
