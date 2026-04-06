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
    console.log('🔍 Buscando información detallada de residentes...');
    const { data: res } = await supabase
        .from('residents')
        .select('*, units(unit_number), condominiums(name)')
        .limit(1);
    
    if (res && res.length > 0) {
        console.log('KEYS EN RESIDENTE:', Object.keys(res[0]));
        console.log('CONTENIDO DE "units":', res[0].units);
        console.log('TIPO DE "units":', typeof res[0].units, Array.isArray(res[0].units) ? 'ARRAY' : 'OBJECT');
    }
}

check();
