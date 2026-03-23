const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('invoices')
        .select(`
            id,
            resident_id,
            user_id,
            condominiums(name),
            units(id, unit_number, residents(first_name, last_name), owner_id, tenant_id),
            residents(first_name, last_name),
            profiles:user_id(id, full_name)
        `)
        .limit(3);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}
check();
