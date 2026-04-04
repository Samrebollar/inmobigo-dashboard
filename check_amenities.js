import { createAdminClient } from './src/utils/supabase/admin'

async function check() {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from('amenities').select('id, name, organization_id')
    console.log('Amenities in DB:', JSON.stringify(data, null, 2))
    if (error) console.error('Error:', error)
}

check()
