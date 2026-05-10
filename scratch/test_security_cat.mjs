
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testSecurityCategory() {
    const payload = {
        organization_id: '8682a22f-d89f-4318-971c-439566270650', // Dummy
        condominium_id: '8682a22f-d89f-4318-971c-439566270650', // Dummy
        title: 'Prueba Seguridad',
        description: 'Test',
        category: 'security',
        status: 'open',
        resident_id: '8682a22f-d89f-4318-971c-439566270650' // Dummy
    }
    const { error } = await supabase.from('tickets').insert(payload).select()
    if (error) {
        console.log("Error:", error.message)
    } else {
        console.log("✅ Category 'security' works in 'tickets' table!")
    }
}

testSecurityCategory()
