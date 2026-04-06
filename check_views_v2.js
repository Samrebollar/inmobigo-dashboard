const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const lines = env.split('\n');
    lines.forEach(line => {
        if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
        if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.rpc('get_table_columns_v2', { t_name: 'announcement_views' });
    
    if (error) {
        // Try information_schema via a trick if possible, or just assume the user's list is correct.
        // Most Supabase setups don't allow direct information_schema unless via custom RPC.
        console.log('RPC failed. Re-checking with a simple select to see if I can get anything.');
        const { data: d2, error: e2 } = await supabase.from('announcement_views').select('*').limit(0);
        if (e2) {
            console.error('Table does not exist or access denied:', e2.message);
        } else {
             console.log('Table exists.');
        }
    } else {
        console.log('COLUMNS:', data);
    }
}

check();
