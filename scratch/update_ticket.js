const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local
let supabaseUrl, serviceKey;
try {
  const envPath = path.resolve(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  lines.forEach(line => {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) serviceKey = line.split('=')[1].trim();
  });
} catch (e) {
  console.error("Error loading .env.local", e);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log("Updating ticket 'Fuga de agua' to 'open'...");
  const { data, error } = await supabase
    .from('tickets')
    .update({ status: 'open' })
    .eq('title', 'Fuga de agua')
    .select();
  
  if (error) {
    console.error("Error updating ticket:", error);
  } else {
    console.log("Success! Updated tickets:", data);
  }
}

run();
