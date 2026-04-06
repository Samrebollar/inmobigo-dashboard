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

async function fix() {
    console.log('🛠️ Intentando agregar restricción UNIQUE a announcement_views...');
    
    // SQL to add unique constraint
    const sql = `
        ALTER TABLE announcement_views 
        ADD CONSTRAINT announcement_views_announcement_id_user_id_key 
        UNIQUE (announcement_id, user_id);
    `;

    // We use the RPC 'exec_sql' if available, or we might have to use manual logic.
    // Many Supabase projects have a helper RPC for this during development. 
    // If not, I will fallback to manual upsert logic in the code.
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
        console.error('❌ Error al ejecutar SQL:', error.message);
        console.log('Fallando a lógica manual...');
    } else {
        console.log('✅ Restricción agregada con éxito.');
    }
}

fix();
