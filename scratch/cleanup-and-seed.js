const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

const ORG_ID = 'cc123967-5f96-4d4e-acfa-0b4eb889b570';

async function main() {
    try {
        console.log('🗑️ Deleting existing training data...');
        
        const { error: delProgressErr } = await supabase
            .from('benefit_training_progress')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
        if (delProgressErr) console.error('Error deleting progress:', delProgressErr.message);

        const { error: delTrainingsErr } = await supabase
            .from('benefit_trainings')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
        if (delTrainingsErr) console.error('Error deleting trainings:', delTrainingsErr.message);

        const { error: delCatsErr } = await supabase
            .from('benefit_training_categories')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
        if (delCatsErr) console.error('Error deleting categories:', delCatsErr.message);

        console.log('✅ Clean-up complete!');

        console.log('🌱 Seeding new clean categories for organization:', ORG_ID);
        const categoriesToInsert = [
            { organization_id: ORG_ID, name: '⚖️ Régimen Condominial', description: 'Aspectos legales de copropiedad', icon: 'Scroll', sort_order: 1 },
            { organization_id: ORG_ID, name: '🏛️ Asambleas', description: 'Organización de asambleas condominales', icon: 'Users', sort_order: 2 },
            { organization_id: ORG_ID, name: '📄 Asociación Civil', description: 'Manejo de A.C. en Quintana Roo', icon: 'Briefcase', sort_order: 3 }
        ];

        const { data: insertedCategories, error: catInsertError } = await supabase
            .from('benefit_training_categories')
            .insert(categoriesToInsert)
            .select();

        if (catInsertError) throw catInsertError;
        console.log('✅ Inserted Categories:', insertedCategories);

        const catMap = insertedCategories.reduce((acc, cat) => {
            acc[cat.name] = cat.id;
            return acc;
        }, {});

        console.log('🌱 Seeding trainings for organization:', ORG_ID);
        const trainingsToInsert = [
            {
                organization_id: ORG_ID,
                category_id: catMap['⚖️ Régimen Condominial'],
                title: 'Fundamentos del Régimen de Propiedad en Condominio',
                description: 'Aprende los conceptos legales básicos que todo administrador debe conocer sobre la propiedad en condominio, los derechos y obligaciones de los condóminos y las facultades de la administración.',
                thumbnail_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
                duration_minutes: 30,
                difficulty: 'PRINCIPIANTE',
                content_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                is_featured: true,
                is_active: true
            },
            {
                organization_id: ORG_ID,
                category_id: catMap['🏛️ Asambleas'],
                title: 'Cómo Realizar una Asamblea por Primera Vez',
                description: 'Aprende paso a paso cómo convocar, organizar y documentar una Asamblea General de Condóminos de manera profesional y conforme a la normativa aplicable en Quintana Roo.',
                thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
                duration_minutes: 35,
                difficulty: 'PRINCIPIANTE',
                content_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                is_featured: false,
                is_active: true
            },
            {
                organization_id: ORG_ID,
                category_id: catMap['📄 Asociación Civil'],
                title: 'Constitución de una Asociación Civil para Condominios',
                description: 'Conoce cuándo es conveniente constituir una Asociación Civil y cuáles son los pasos básicos para su creación, administración y cumplimiento de obligaciones legales y fiscales.',
                thumbnail_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
                duration_minutes: 40,
                difficulty: 'INTERMEDIO',
                content_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
                is_featured: false,
                is_active: true
            }
        ];

        const { data: insertedTrainings, error: trInsertError } = await supabase
            .from('benefit_trainings')
            .insert(trainingsToInsert)
            .select();

        if (trInsertError) throw trInsertError;
        console.log('✅ Inserted Trainings:', insertedTrainings);

    } catch (err) {
        console.error('Error during execution:', err);
    }
}

main();
