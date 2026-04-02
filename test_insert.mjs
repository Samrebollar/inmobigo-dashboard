import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testFetch() {
    const { data: resident, error: residentError } = await supabase
        .from('residents')
        .select('*')
        .limit(1)
        .single()

    const out = {
        condominium_id: resident.condominium_id,
        organization_id: resident.organization_id,
        unit_id: resident.unit_id,
        resident_id: resident.id
    }
    fs.writeFileSync('./resident_test.json', JSON.stringify(out, null, 2))
}
testFetch()
