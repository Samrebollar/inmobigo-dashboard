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
    console.log('🔍 Auditoría de datos de residentes...');
    const { data: res } = await supabase
        .from('residents')
        .select('*, units(unit_number)')
        .limit(3);
    
    if (res) {
        res.forEach(r => {
            console.log('\nID:', r.id);
            console.log('JSON:', JSON.stringify(r, null, 2));
        });
    }
}

check();
