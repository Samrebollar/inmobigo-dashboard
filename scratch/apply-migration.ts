import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

async function run() {
    if (fs.existsSync('.env.local')) {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const env: Record<string, string> = {};
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                env[key] = value;
            }
        });

        const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
        const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const sql = fs.readFileSync('supabase/migrations/20260711_fix_dashboard_kpis_rpc.sql', 'utf8');

        console.log("Applying SQL migration to database...");
        
        const { data, error } = await supabase.rpc('exec_sql', { sql });
        if (error) {
            console.error("Migration error:", error);
        } else {
            console.log("Migration applied successfully!", data);
        }
    }
}

run();
