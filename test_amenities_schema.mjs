import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigateAmenitiesSchema() {
    const { data, error } = await supabase
        .from('amenities')
        .select('*')
        .limit(1)
        
    console.log('Amenities Keys:', data && data[0] ? Object.keys(data[0]) : 'no data')
    if(data && data.length > 0) {
        console.log('Sample Data:', JSON.stringify(data[0], null, 2))
    }
}

investigateAmenitiesSchema()
