const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to find .env.local
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

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing env variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('LATEST ANNOUNCEMENTS IN DB:');
    data.forEach(ann => {
        console.log(`- ID: ${ann.id}`);
        console.log(`  Title: ${ann.title}`);
        console.log(`  Image URL: ${ann.image_url}`);
        console.log(`  Created: ${ann.created_at}`);
        console.log('---');
    });
}

check();
