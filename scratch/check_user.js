
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkUser() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }
  
  // Assuming the user I want to check is the one I see in the logs or the only one
  // In the log I saw "sam32" in path, maybe there's an email like sam@...
  
  const user = users[0]; // Let's just look at the first one for now or list all
  console.log('Users:');
  users.forEach(u => console.log(`${u.id} - ${u.email}`));
  
  if (users.length > 0) {
      const { data: orgUsers } = await supabase
        .from('organization_users')
        .select('user_id, organization_id, role_new');
      console.log('Organization Users:');
      console.log(JSON.stringify(orgUsers, null, 2));
  }
}

checkUser();
