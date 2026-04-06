
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAnnouncements() {
    console.log("--- Debugging Announcements with Org IDs ---")
    
    // Get all orgs
    const { data: orgs } = await supabase.from('organizations').select('id, name')
    console.log("Organizations:", orgs)

    // Get all announcements
    const { data: anns } = await supabase.from('announcements').select('*')
    console.log("Announcements count:", anns.length)
    anns.forEach(a => {
        console.log(`Ann: ${a.title}, Org: ${a.organization_id}, Active: ${a.is_active}, Expires: ${a.expires_at}`)
    })

    // Get all condominiums to see their org IDs
    const { data: condos } = await supabase.from('condominiums').select('id, name, organization_id')
    console.log("Condominiums:", condos)

    // Check residents mapping
    const { data: residents } = await supabase.from('residents').select('user_id, condominium_id')
    console.log("Residents to Condos:", residents)
}

debugAnnouncements()
