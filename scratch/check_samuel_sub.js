const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSub() {
    const { data: subs, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('organization_id', '16e61e52-a176-4631-b41c-7da89c9e1730');
        
    console.log('Subscriptions for Samuel Organization:', subs);
    console.log('Error if any:', error);
}

checkSub();
