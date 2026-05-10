
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectTables() {
    const p = await supabase.from('visitor_passes').select('*').limit(1)
    console.log("Visitor Passes:", Object.keys(p.data?.[0] || {}))
    
    const pkg = await supabase.from('package_alerts').select('*').limit(1)
    console.log("Package Alerts:", Object.keys(pkg.data?.[0] || {}))
}

inspectTables()
