const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://djxllvplxdigosbhhicn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables'); // Some projects have this helper
  if (error) {
    // If no helper, try to query a common table
    console.log('Error listing tables, trying direct queries...');
    
    for (const table of ['users', 'profiles', 'residents', 'organization_users']) {
        const { error: checkError } = await supabase.from(table).select('count', { count: 'exact', head: true });
        console.log(`Table '${table}': ${checkError ? 'NOT FOUND (' + checkError.code + ')' : 'EXISTS'}`);
    }
  } else {
    console.log('Tables:', data);
  }
}

listTables();
