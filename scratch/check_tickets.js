
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkTickets() {
  const { data, error, count } = await supabase
    .from('tickets')
    .select('id, title, status, condominium_id, organization_id', { count: 'exact' });

  if (error) {
    console.error('Error fetching tickets:', error);
    return;
  }

  console.log(`Total tickets: ${count}`);
  const openTickets = data.filter(t => t.status === 'open' || t.status === 'pending');
  console.log(`Tickets with status 'open' or 'pending': ${openTickets.length}`);
  console.log(JSON.stringify(openTickets, null, 2));
}

checkTickets();
