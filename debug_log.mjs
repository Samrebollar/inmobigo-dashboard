
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugToLog() {
    let output = "--- Full Debug Log ---\n\n"
    
    const { data: orgs } = await supabase.from('organizations').select('id, name')
    output += `Organizations: ${JSON.stringify(orgs, null, 2)}\n\n`

    const { data: anns } = await supabase.from('announcements').select('*')
    output += `Announcements (${anns.length}):\n`
    anns.forEach(a => {
        output += ` - ${a.title} (Org: ${a.organization_id}, Active: ${a.is_active}, Expires: ${a.expires_at})\n`
    })

    const { data: condos } = await supabase.from('condominiums').select('id, name, organization_id')
    output += `\nCondominiums: ${JSON.stringify(condos, null, 2)}\n\n`

    const { data: residents } = await supabase.from('residents').select('user_id, condominium_id')
    output += `Residents Mapping: ${JSON.stringify(residents, null, 2)}\n\n`

    fs.writeFileSync('c:\\DEV\\inmobigo-dashboard\\full_debug_anns.log', output)
    console.log("Debug log written to full_debug_anns.log")
}

debugToLog()
