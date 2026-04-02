import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://djxllvplxdigosbhhicn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg');

async function checkRpc() {
  const { data, error } = await supabase.rpc('postgres_query', { query: 'SELECT 1' });
  console.log(error || data);
}
checkRpc();
