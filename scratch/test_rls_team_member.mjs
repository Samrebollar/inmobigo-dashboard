import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const adminSupabase = createClient(supabaseUrl, supabaseKey);

const luzAuthId = '0b93ba6a-058c-40fd-9ae1-5d56f477a986';
const anaOrgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';
const condoId = 'fbf9efe9-639c-409b-9694-551465f242ec';

async function testRLS() {
  console.log('=== CHECKING RLS AND DATA ACCESS FOR LUZ (TEAM MEMBER) ===\n');

  // Check RLS policies on condominiums, residents, units, resident_invoices
  const { data: policies, error: polErr } = await adminSupabase
    .rpc('get_policies_for_table', { table_name: 'condominiums' })
    .catch(() => ({ data: null }));

  console.log('Condominiums policies check:', policies);

  // Check how residentsService and financeService get data when called client side
  // Let's create an authenticated client for Luz if possible or check RLS definitions
  // We can sign in as Luz or generate a token for Luz using admin.auth.admin.generateLink or create a session
  const { data: userObj, error: uErr } = await adminSupabase.auth.admin.getUserById(luzAuthId);
  console.log('Luz user object in auth.users:', userObj?.user?.email, 'app_metadata:', userObj?.user?.app_metadata, 'user_metadata:', userObj?.user?.user_metadata);

  // Test executing query for condos as Luz via impersonation / token
  const { data: linkData } = await adminSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'bella280218@gmail.com'
  });
  
  console.log('Magic link generated for testing:', linkData?.properties?.hashed_token ? 'YES' : 'NO');
}

testRLS().catch(console.error);
