
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectSchema() {
    console.log("--- Inspecting Schema ---")
    
    // Try to get one row from residents to see columns
    const { data: resident, error: resError } = await supabase.from('residents').select('*').limit(1)
    if (resError) {
        console.error("Error fetching residents:", resError)
    } else {
        console.log("Residents Columns:", Object.keys(resident[0] || {}))
        console.log("Resident Sample:", resident[0])
    }

    // Try to get one row from announcements to see columns
    const { data: announcement, error: annError } = await supabase.from('announcements').select('*').limit(1)
    if (annError) {
        console.error("Error fetching announcements:", annError)
    } else {
        console.log("Announcements Columns:", Object.keys(announcement[0] || {}))
        console.log("Announcement Sample:", announcement[0])
    }

    // Also check organization_users
    const { data: orgUser, error: orgUserError } = await supabase.from('organization_users').select('*').limit(1)
    if (orgUserError) {
        console.error("Error fetching organization_users:", orgUserError)
    } else {
        console.log("Organization Users Columns:", Object.keys(orgUser[0] || {}))
    }
}

inspectSchema()
