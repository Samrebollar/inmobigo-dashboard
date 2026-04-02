const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAmenities() {
    const { data, error } = await supabase.from('amenities').select('*')
    if (error) {
        console.error('Error fetching amenities:', error)
    } else {
        console.log('Amenities in DB:', JSON.stringify(data, null, 2))
    }
}

checkAmenities()
