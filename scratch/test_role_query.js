const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://djxllvplxdigosbhhicn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
);

async function testQuery() {
  const userId = '527dd843-8325-402b-bef3-9e7fdf80b645'; // The UID the user provided earlier
  
  console.log(`Testing query for: ${userId}`);
  
  const { data, error } = await supabase
    .from('users')
    .select(`
        role,
        residents:residents(role, resident_type)
    `)
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Data:', JSON.stringify(data, null, 2));
  }
}

testQuery();
