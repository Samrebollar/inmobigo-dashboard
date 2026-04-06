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
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'announcement_views' });
    
    // If RPC fails, try a direct query to see keys
    if (colError) {
        const { data, error } = await supabase.from('announcement_views').select('*').limit(1);
        if (error) {
            console.error('Error fetching table info:', error);
        } else if (data && data.length > 0) {
            console.log('COLUMNS IN announcement_views:', Object.keys(data[0]));
        } else {
            console.log('announcement_views is empty, cannot infer columns.');
        }
    } else {
        console.log('COLUMNS IN announcement_views:', cols);
    }
}

check();
