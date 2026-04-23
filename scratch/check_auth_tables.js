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

async function check() {
  const tables = ['profiles', 'users', 'organizations', 'organization_users']
  for (const table of tables) {
    console.log(`\n--- TABLE: ${table} ---`)
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.error(`Error fetching ${table}:`, error.message)
      continue
    }
    if (data && data.length > 0) {
      console.log('Columns:', Object.keys(data[0]))
    } else {
      console.log('Table exists but has no data or columns could not be inferred.')
    }
  }
}

check()
