const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Trying to insert invoice with status 'parcial'...");
  const { data, error } = await supabase.from('invoices').insert({
    organization_id: 'cc123967-5f96-4d4e-acfa-0b4eb889b570',
    condominium_id: 'a42c489b-123a-4353-b771-b711bdf1537a',
    unit_id: '15e063d5-44e8-49d5-b321-841b752e5729',
    resident_id: '548ccecc-a40c-410c-b4de-44388a331a25',
    folio: 'INV-TEST-PARTIAL',
    amount: 1000,
    status: 'parcial',
    due_date: '2026-04-27'
  }).select();
  
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Success! Data:", data);
    // Clean up
    await supabase.from('invoices').delete().eq('id', data[0].id);
  }
}

run();
