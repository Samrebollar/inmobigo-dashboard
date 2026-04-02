import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigateSchema() {
    // Let's get a sample reservation and see what's in 'profiles' and if we can join 'residents'
    const { data: resData, error: resError } = await supabase
        .from('amenity_reservations')
        .select(`
            *,
            profiles:resident_id(
                full_name,
                email
            )
        `)
        .limit(1)
        
    console.log('Reservation with profiles:', JSON.stringify(resData, null, 2))
    
    // Now let's try to get the resident record for this user to get the unit and property
    if (resData && resData.length > 0) {
        const residentId = resData[0].resident_id
        
        const { data: residentData, error: residentError } = await supabase
            .from('residents')
            .select(`
                *,
                units(*),
                condominiums(name)
            `)
            .eq('user_id', residentId)
            
        console.log('Resident details:', JSON.stringify(residentData, null, 2))
        if(residentError) console.error('Resident query error:', residentError)
    }
}

investigateSchema()
