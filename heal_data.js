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

async function heal() {
    console.log('🩺 Iniciando proceso de curación de datos en announcement_views...');
    
    // 1. Obtener registros con 'N/A' o vacíos en unit_name
    const { data: views, error: viewError } = await supabase
        .from('announcement_views')
        .select('*')
        .or('unit_name.eq.N/A,unit_name.is.null,property_name.eq.N/A,property_name.is.null');

    if (viewError) {
        console.error('Error al obtener vistas:', viewError.message);
        return;
    }

    console.log(`Encontrados ${views.length} registros para reparar.`);

    for (const view of views) {
        // 2. Buscar al residente por user_id
        const { data: res, error: resError } = await supabase
            .from('residents')
            .select('*, units(unit_number), condominiums(name)')
            .eq('user_id', view.user_id)
            .maybeSingle();

        if (res) {
            const unit = res.unit_number || res.unit_name || (Array.isArray(res.units) ? res.units[0]?.unit_number : res.units?.unit_number) || '1B (Ref)';
            const property = res.property_name || (Array.isArray(res.condominiums) ? res.condominiums[0]?.name : res.condominiums?.name) || 'Las Palmas (Ref)';

            console.log(`Reparando View ${view.id}: Unidad -> ${unit}, Propiedad -> ${property}`);

            await supabase
                .from('announcement_views')
                .update({
                    unit_name: unit,
                    property_name: property
                })
                .eq('id', view.id);
        } else {
            console.log(`No se encontró residente para user_id: ${view.user_id}`);
        }
    }
    
    console.log('✅ Proceso de curación finalizado.');
}

heal();
