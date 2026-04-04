const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try to find .env file
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envVars = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envVars) {
        process.env[k] = envVars[k];
    }
}

async function check() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: amenities, error: amenError } = await supabase.from('amenities').select('*');
    if (amenError) {
        console.error('Error fetching amenities:', amenError);
    } else {
        console.log('Amenities in DB:', JSON.stringify(amenities, null, 2));
    }
    
    const { data: residents, error: resError } = await supabase.from('residents').select('*, condominiums(*)').limit(5);
    if (resError) {
        console.error('Error fetching residents:', resError);
    } else {
        console.log('Sample Residents:', JSON.stringify(residents, null, 2));
    }
}

check();
