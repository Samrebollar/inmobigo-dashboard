import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    // 1. Get condominiums
    const { data: condos } = await supabase.from('condominiums').select('*')
    console.log('CONDOMINIUMS:', condos)

    // 2. Count units per condominium
    for (const condo of condos || []) {
        const { count } = await supabase.from('units').select('*', { count: 'exact', head: true }).eq('condominium_id', condo.id)
        console.log(`Condo ${condo.name} (${condo.id}) has ${count} units`)
    }

    // 3. Count residents per condominium
    for (const condo of condos || []) {
        const { count } = await supabase.from('residents').select('*', { count: 'exact', head: true }).eq('condominium_id', condo.id)
        console.log(`Condo ${condo.name} (${condo.id}) has ${count} residents`)
    }
}

run()
