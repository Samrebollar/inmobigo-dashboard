import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const adminSupabase = createClient(supabaseUrl, supabaseKey);

const members = [
  { email: 'bella280218@gmail.com', name: 'Luz' },
  { email: 'liubafigeratehernandez@gmail.com', name: 'Liuva' },
  { email: 'erikavianey1295@gmail.com', name: 'Erika' }
];

async function testAllMembers() {
  console.log('=== TESTING ALL THREE TEAM MEMBERS ===\n');

  for (const m of members) {
    console.log(`\n--- Testing ${m.name} (${m.email}) ---`);
    
    // Get user id
    const { data: usersData } = await adminSupabase.auth.admin.listUsers();
    const user = usersData?.users?.find(u => u.email === m.email);
    
    if (!user) {
      console.log(`❌ User NOT found in auth.users!`);
      continue;
    }
    
    console.log(`User ID: ${user.id}`);
    
    // Reset password to TestPassword123! to allow client test
    await adminSupabase.auth.admin.updateUserById(user.id, { password: 'TestPassword123!' });

    const clientSupabase = createClient(supabaseUrl, anonKey);
    const { data: signInData, error: signInErr } = await clientSupabase.auth.signInWithPassword({
      email: m.email,
      password: 'TestPassword123!'
    });

    if (signInErr) {
      console.log(`❌ SignIn failed: ${signInErr.message}`);
      continue;
    }

    // 1. organization_users
    const { data: orgUser, error: orgErr } = await clientSupabase
      .from('organization_users')
      .select('role_new, organization_id')
      .eq('user_id', user.id)
      .maybeSingle();

    console.log(`  organization_users:`, orgUser, orgErr ? `Err: ${orgErr.message}` : '');

    // 2. profiles
    const { data: profile, error: profErr } = await clientSupabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    console.log(`  profile: org_id=${profile?.organization_id}, role_new=${profile?.role_new}`);

    // 3. condominiums
    const { data: condos, error: condoErr } = await clientSupabase
      .from('condominiums')
      .select('id, name')
      .eq('organization_id', orgUser?.organization_id || '6b06be84-1812-48c6-8fbb-45268a2fde60');
    console.log(`  condominiums: count=${condos?.length}`, condoErr ? `Err: ${condoErr.message}` : '');

    // 4. residents
    const condoIds = condos?.map(c => c.id) || ['fbf9efe9-639c-409b-9694-551465f242ec'];
    const { data: residents, error: resErr } = await clientSupabase
      .from('residents')
      .select('id, first_name, units(unit_number, monto_mensual)')
      .in('condominium_id', condoIds);
    console.log(`  residents: count=${residents?.length}`, resErr ? `Err: ${resErr.message}` : '');

    // 5. resident_invoices
    const { data: invoices, error: invErr } = await clientSupabase
      .from('resident_invoices')
      .select('id, amount, status')
      .in('condominium_id', condoIds);
    console.log(`  resident_invoices: count=${invoices?.length}`, invErr ? `Err: ${invErr.message}` : '');
  }
}

testAllMembers().catch(console.error);
