
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function listTables() {
    console.log("--- Listing Tables ---")
    
    const tables = [
        'residents',
        'announcements',
        'announcement_views',
        'organization_users',
        'organizations',
        'profiles',
        'units',
        'invoices',
        'payments',
        'tickets',
        'amenities',
        'amenity_reservations',
        'package_alerts',
        'visitor_passes',
        'security_incidents',
        'incidencias',
        'incidents'
    ]

    for (const table of tables) {
        try {
            const { error } = await supabase.from(table).select('count').limit(1)
            if (!error) {
                console.log(`✅ Table exists: ${table}`)
            } else if (error.code === '42P01') {
                console.log(`❌ Table does NOT exist: ${table}`)
            } else {
                console.log(`⚠️ Table ${table} returned error: ${error.code} - ${error.message}`)
            }
        } catch (e) {
            console.log(`🔥 Fatal error checking table ${table}`)
        }
    }
}

listTables()
