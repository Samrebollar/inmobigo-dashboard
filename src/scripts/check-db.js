const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log("Fetching invoices...");
  const { data: invoices, error: invErr } = await supabase.from('invoices').select('*');
  console.log(invErr ? invErr : invoices);

  console.log("Fetching units...");
  const { data: units, error: unitErr } = await supabase.from('units').select('id, name, status, organization_id, condominium_id');
  console.log(unitErr ? unitErr : units);
}

run();
