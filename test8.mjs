import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const orgId = "cc123967-5f96-4d4e-acfa-ed0b4eb889b570"

  const { data: q2, error: e2 } = await supabase
      .from('amenity_reservations')
      .select('*, amenities(*), profiles!amenity_reservations_resident_id_fkey(*)')
      .eq('organization_id', orgId)

  console.log('Q2 Error:', e2?.message, e2?.hint, e2?.details)
}

run()
