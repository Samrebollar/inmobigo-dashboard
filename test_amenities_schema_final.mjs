import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://djxllvplxdigosbhhicn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg');

async function getKeys() {
  const { data } = await supabase.from('amenities').select('*').limit(1);
  console.log(JSON.stringify(Object.keys(data[0])));
}
getKeys();
