import { createAdminClient } from './src/utils/supabase/admin'

async function debug() {
  const adminClient = createAdminClient()
  const { data, error } = await adminClient.from('amenities').select('name, organization_id')
  console.log('Amenities in DB:', data)
  
  const { data: orgs } = await adminClient.from('organizations').select('id, name')
  console.log('Organizations in DB:', orgs)

  const { data: residents } = await adminClient.from('residents').select('first_name, organization_id, condominium_id')
  console.log('Residents in DB:', residents)
}

debug()
