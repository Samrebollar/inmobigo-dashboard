import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://djxllvplxdigosbhhicn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg');

async function getColumns() {
  const { data, error } = await supabase.rpc('get_table_info', { table_name: 'amenities' }); // unlikely to exist, fallback below
  if(error) {
     const { data: q } = await supabase.from('amenities').select('*').limit(1);
     console.log(Object.keys(q[0]).join(','));
  } else {
     console.log(data);
  }
}
getColumns();
