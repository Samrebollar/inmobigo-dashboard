import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: userTokens, error: orgErr } = await supabase.from('organizations').select('id').limit(1)
  const orgId = userTokens?.[0]?.id
  console.log('Org:', orgId, orgErr?.message)

  if (!orgId) return

  const { data: d1, error: e1 } = await supabase.from('amenity_reservations').select('*').eq('organization_id', orgId)
  console.log('Plain Count:', d1?.length, 'Err:', e1?.message)

  const { data: d2, error: e2 } = await supabase.from('amenity_reservations').select('*, profiles(*)').eq('organization_id', orgId)
  console.log('With Profiles count:', d2?.length, 'Err:', e2?.message)

  const { data: d3, error: e3 } = await supabase.from('amenity_reservations').select('*, profiles!amenity_reservations_resident_id_fkey(*)').eq('organization_id', orgId)
  console.log('With explicit FKEY count:', d3?.length, 'Err:', e3?.message)
}

run()
