import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testFetch() {
    console.log("Testing residents fetch with condos(name)...")
    const { data: resident, error: residentError } = await supabase
        .from('residents')
        .select(`
            *,
            condos(name)
        `)
        .limit(1)

    if (residentError) {
        console.error("Error:", residentError)
    } else {
        console.log("Success:", resident)
    }
}

testFetch()
