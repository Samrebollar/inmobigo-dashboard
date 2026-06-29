import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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
    console.error('Supabase URL or Key not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    try {
        const sql = fs.readFileSync('supabase/migrations/20260628_control_operativo_v2.sql', 'utf8');
        console.log('Running SQL via exec_sql RPC...');
        
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (error) {
            console.error('exec_sql with sql_query failed:', error.message || error);
            console.log('Trying exec_sql with sql...');
            const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql });
            if (error2) {
                console.error('Both attempts failed:', error2.message || error2);
            } else {
                console.log('Migration executed successfully with { sql }! Results:', data2);
            }
        } else {
            console.log('Migration executed successfully with { sql_query }! Results:', data);
        }
    } catch (err) {
        console.error('Exception failed:', err.message);
    }
}

runMigration();
