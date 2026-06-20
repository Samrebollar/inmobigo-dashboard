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

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Service Role Key not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('🛠️ Intentando ejecutar la migración SQL de referidos vía exec_sql RPC...');
    
    const migrationPath = path.join(__dirname, '../supabase/migrations/20260620_referral_rewards.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql }); // or sql
    if (error) {
        console.error('❌ Error con sql_query:', error.message);
        console.log('Intentando con parámetro sql...');
        const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql });
        if (error2) {
            console.error('❌ Ambos intentos fallaron:', error2.message);
        } else {
            console.log('✅ Migración ejecutada con éxito usando rpc(exec_sql, { sql })');
        }
    } else {
        console.log('✅ Migración ejecutada con éxito usando rpc(exec_sql, { sql_query })');
    }
}

run();
