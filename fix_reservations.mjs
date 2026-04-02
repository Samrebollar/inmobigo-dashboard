import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: reservations, error } = await supabase
    .from('amenity_reservations')
    .select('id, amenity_id, amenities(organization_id)')
    .is('organization_id', null)

  if (error) {
    console.error('Error fetching reservations:', error)
    return
  }
  
  console.log(`Found ${reservations?.length} reservations missing organization_id.`)

  for (const res of reservations || []) {
      const orgId = res.amenities?.organization_id
      if (orgId) {
          const { error: updErr } = await supabase
            .from('amenity_reservations')
            .update({ organization_id: orgId })
            .eq('id', res.id)
            
          console.log(`Updated reservation ${res.id} to org ${orgId}. Error:`, updErr?.message)
      } else {
          console.log(`Could not find org id for reservation ${res.id}`)
      }
  }
}

run()
