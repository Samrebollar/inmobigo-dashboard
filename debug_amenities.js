const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
    const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
    if (!orgs || orgs.length === 0) return console.log('No orgs');
    
    const testAmenity = {
        organization_id: orgs[0].id,
        name: 'Test',
        description: 'Test',
        icon_name: 'Test',
        base_price: 0,
        deposit_required: false,
        deposit_amount: 0,
        capacity: 10,
        rules: 'None',
        color: 'test'
    };

    const { error } = await supabase.from('amenities').insert([testAmenity]);
    if (error) {
        fs.writeFileSync('tmp/debug_error.json', JSON.stringify(error, null, 2));
        console.log('Error saved to tmp/debug_error.json');
    } else {
        console.log('Insert SUCCESS!');
    }
}
debug();
