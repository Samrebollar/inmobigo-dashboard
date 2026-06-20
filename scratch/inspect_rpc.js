const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const lines = env.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
        if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].trim();
    });
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    // Attempt to query standard postgres catalogs or schema info if exposed
    const { data, error } = await supabase
        .from('pg_proc')
        .select('*')
        .limit(10);
    console.log('pg_proc query:', { data, error });

    const { data: routines, error: routinesError } = await supabase
        .from('routines')
        .select('*')
        .limit(10);
    console.log('routines query:', { routines, routinesError });
}

check();
