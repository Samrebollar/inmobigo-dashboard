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

async function main() {
    try {
        console.log('Fetching benefit categories...');
        const { data: categories, error: catError } = await supabase
            .from('benefit_training_categories')
            .select('*');
        if (catError) throw catError;
        console.log('Categories Count:', categories.length);
        console.log(categories);

        console.log('Fetching benefit trainings...');
        const { data: trainings, error: trError } = await supabase
            .from('benefit_trainings')
            .select('*');
        if (trError) throw trError;
        console.log('Trainings Count:', trainings.length);
        console.log(trainings);
    } catch (err) {
        console.error('Error:', err);
    }
}

main();
