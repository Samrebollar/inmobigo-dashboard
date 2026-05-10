
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function upgradeIncidents() {
    console.log("--- Upgrading 'incidents' table ---")
    const sql = `
        ALTER TABLE incidents 
        ADD COLUMN IF NOT EXISTS priority text,
        ADD COLUMN IF NOT EXISTS location text,
        ADD COLUMN IF NOT EXISTS photo_urls text[],
        ADD COLUMN IF NOT EXISTS video_urls text[],
        ADD COLUMN IF NOT EXISTS condominium_id uuid REFERENCES organizations(id),
        ADD COLUMN IF NOT EXISTS guard_name text;
    `
    const { error } = await supabase.rpc('exec_sql', { sql })
    if (error) {
        console.error("Error executing SQL:", error.message)
    } else {
        console.log("✅ Incidents table upgraded successfully.")
    }
}

upgradeIncidents()
