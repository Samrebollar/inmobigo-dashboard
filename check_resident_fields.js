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
    console.log('🔍 Revisando qué campos tiene el residente para usarlos como user_id...');
    
    // Obtenemos un residente para ver su estructura
    const { data: res, error } = await supabase.from('residents').select('*').limit(1);
    
    if (res && res.length > 0) {
        console.log('RESIDENTE DE EJEMPLO:', res[0]);
    } else {
        console.log('No hay residentes registrados.');
    }

    // Revisamos la tabla announcement_views para ver qué campos tiene y sus FKs si es posible
    console.log('\n🔍 Revisando announcement_views...');
    const { data: views, error: e2 } = await supabase.from('announcement_views').select('*').limit(1);
    if (e2) {
        console.error('Error al leer views:', e2.message);
    } else {
        console.log('CAMPOS EN views:', views[0] ? Object.keys(views[0]) : 'Sin datos');
    }
}

check();
