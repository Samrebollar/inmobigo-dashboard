const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DEFAULT_AMENITIES = [
    {
        name: 'Salón de Fiestas',
        description: 'Espacio elegante para eventos sociales con cocina equipada y mobiliario premium.',
        icon_name: 'PartyPopper',
        base_price: 2500,
        deposit_required: true,
        deposit_amount: 5000,
        capacity: 100,
        rules: 'No se permite música después de las 12 AM. Máximo 100 personas.',
        color: 'from-purple-600 to-indigo-600'
    },
    {
        name: 'Alberca Infinity',
        description: 'Relájate en nuestra alberca climatizada con vistas panorámicas a la ciudad.',
        icon_name: 'Waves',
        base_price: 0,
        deposit_required: false,
        deposit_amount: 0,
        capacity: 30,
        rules: 'Uso obligatorio de traje de baño. No se permiten envases de vidrio.',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        name: 'Gimnasio Pro',
        description: 'Equipamiento de última generación para cardio y pesas. Abierto 24/7.',
        icon_name: 'Dumbbell',
        base_price: 0,
        deposit_required: false,
        deposit_amount: 0,
        capacity: 15,
        rules: 'Uso de toalla obligatorio. Limpiar equipo después de usar.',
        color: 'from-rose-500 to-orange-500'
    },
    {
        name: 'Área de Asadores',
        description: 'Zona al aire libre con asadores de gas, mesas y pérgola para convivencias.',
        icon_name: 'Flame',
        base_price: 500,
        deposit_required: true,
        deposit_amount: 1000,
        capacity: 12,
        rules: 'Dejar el asador limpio. Duración máxima de 5 horas.',
        color: 'from-orange-600 to-amber-500'
    }
];

async function seed() {
    console.log('Fetching organizations...');
    const { data: orgs, error: orgsErr } = await supabase.from('organizations').select('id');
    
    if (orgsErr) {
        console.error('Error fetching orgs:', orgsErr);
        return;
    }

    if (!orgs || orgs.length === 0) {
        console.log('No organizations found.');
        return;
    }

    let seededCount = 0;
    
    for (const org of orgs) {
        // check if org has amenities
        const { data: amenities, error: amenitiesErr } = await supabase
            .from('amenities')
            .select('id')
            .eq('organization_id', org.id);
            
        if (amenitiesErr) {
            console.error(`Error fetching amenities for org ${org.id}:`, JSON.stringify(amenitiesErr, null, 2));
            continue; // Could be that table doesn't exist
        }

        if (amenities && amenities.length === 0) {
            console.log(`Seeding amenities for organization ${org.id}...`);
            const amenitiesToSeed = DEFAULT_AMENITIES.map(a => ({
                ...a,
                organization_id: org.id
            }));
            
            const { error: insertErr } = await supabase.from('amenities').insert(amenitiesToSeed);
            if (insertErr) {
                console.error(`Error inserting for org ${org.id}:`, insertErr);
            } else {
                seededCount += DEFAULT_AMENITIES.length;
                console.log(`Successfully seeded org ${org.id}`);
            }
        } else {
            console.log(`Organization ${org.id} already has amenities, skipping.`);
        }
    }
    
    console.log(`Seed script complete! Inserted ${seededCount} amenities.`);
}

seed();
