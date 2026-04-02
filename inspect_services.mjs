import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
    
    // We can't query information_schema directly from supabase-js unless we have a postgres function.
    // Instead we can just do a dummy insert with an invalid type to see the error, or query something we know isn't there.
    // Wait, we can fetch all records? Still 0 means no keys.
    // Let's create a SQL function or use generic REST 'OPTIONS /rest/v1/visits' to get the columns? Supabase-js doesn't expose OPTIONS natively.
    // Let's write raw fetch to inspect OpenAPI
    const response = await fetch(`${supabaseUrl}/rest/v1/?apikey=${supabaseKey}`);
    const spec = await response.json();
    
    fs.writeFileSync('./openapi.json', JSON.stringify(spec, null, 2))
}

inspect()
