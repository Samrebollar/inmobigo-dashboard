import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
    .from('amenity_reservations')
    .select('*, profiles!amenity_reservations_resident_id_fkey(*)')
    .limit(1)

  if (error) {
     console.log('Error profiles!fkey:', error.message)
     console.log('Error profiles!fkey hint:', error.hint)
  }

  const { data: d2, error: e2 } = await supabase
    .from('amenity_reservations')
    .select('*, profiles(*)')
    .limit(1)

  if (e2) {
     console.log('Error profiles(*):', e2.message)
     console.log('Error profiles(*) hint:', e2.hint)
  }

  const { data: d3, error: e3 } = await supabase
    .from('amenity_reservations')
    .select('*, residents(*)')
    .limit(1)

  if (e3) {
     console.log('Error residents(*):', e3.message)
     console.log('Error residents(*) hint:', e3.hint)
  }

  const { data: d4, error: e4 } = await supabase
    .from('amenity_reservations')
    .select('*, profiles:resident_id(full_name, email)') // Alternative syntax
    .limit(1)

  if (e4) {
      console.log('Error inline:resident_id', e4.message)
  } else {
      console.log('Success inline:resident_id', d4)
  }
}
run()
