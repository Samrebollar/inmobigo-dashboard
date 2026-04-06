
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAnnouncements() {
    console.log("--- Checking Announcements ---")
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching announcements:", error)
    } else {
        console.log(`Found ${data.length} announcements.`)
        data.forEach((ann, i) => {
            console.log(`[${i}] ID: ${ann.id}, Title: ${ann.title}, Org: ${ann.organization_id}, Active: ${ann.is_active}, Expires: ${ann.expires_at}, Created: ${ann.created_at}`)
        });
    }

    console.log("\n--- Checking Sample Residents ---")
    const { data: residents, error: resError } = await supabase
        .from('residents')
        .select('user_id, organization_id, condominiums(name)')
        .limit(5)
    
    if (resError) {
        console.error("Error fetching residents:", resError)
    } else {
        residents.forEach(res => {
            console.log(`Resident: ${res.user_id}, Org: ${res.organization_id}, Condo: ${res?.condominiums?.name}`)
        })
    }
}

checkAnnouncements()
