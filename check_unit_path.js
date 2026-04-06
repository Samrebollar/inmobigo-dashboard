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
    console.log('🔍 Buscando información detallada de residentes para resolver el problema de la UNIDAD...');
    
    const { data: res, error } = await supabase
        .from('residents')
        .select('*, units(unit_number), condominiums(name)')
        .limit(5);
    
    if (error) {
        console.error('Error fetching residents:', error.message);
        return;
    }

    res.forEach((r, i) => {
        console.log(`\n--- RESIDENTE ${i+1} ---`);
        console.log('ID:', r.id);
        console.log('Nombre:', r.first_name, r.last_name);
        console.log('Objeto completo (llaves):', Object.keys(r));
        console.log('Unidad (objeto):', r.units);
        console.log('Condominio (objeto):', r.condominiums);
        
        // El path que debería funcionar si follows standard joins
        const unitVal = r.unit_number || r.unit_name || (r.units ? (Array.isArray(r.units) ? r.units[0]?.unit_number : r.units.unit_number) : 'N/A');
        console.log('VALOR CALCULADO DE UNIDAD:', unitVal);
    });
}

check();
