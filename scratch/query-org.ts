import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

async function test() {
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

        const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', '6b06be84-1812-48c6-8fbb-45268a2fde60')
            .single();

        console.log("NOH1BEC Org details:", org);
    }
}

test();
