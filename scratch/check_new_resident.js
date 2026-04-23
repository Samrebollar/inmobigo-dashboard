const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://djxllvplxdigosbhhicn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
);

async function checkUser() {
  const email = 'tramitessam27@gmail.com';
  
  console.log(`Checking for user: ${email}`);
  
  // Check auth
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
      console.error('Auth check error:', authError);
      return;
  }
  const user = authData.users.find(u => u.email === email);
  
  if (user) {
    console.log('User found in Auth:', user.id);
    console.log('Metadata:', user.user_metadata);
  } else {
    console.log('User NOT found in Auth');
  }
  
  // Check residents table
  const { data: resident, error: resError } = await supabase
    .from('residents')
    .select('*')
    .eq('email', email)
    .maybeSingle();
    
  if (resident) {
    console.log('Resident found in public.residents:', resident.id);
    console.log('User ID in residents:', resident.user_id);
  } else {
    console.log('Resident NOT found in public.residents');
  }
}

checkUser();
