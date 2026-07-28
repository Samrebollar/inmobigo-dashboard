import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const anaOrgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';

const teamMembers = [
  { email: 'bella280218@gmail.com', name: 'Luz Del Carmen Rosas Cruz', authId: '0b93ba6a-058c-40fd-9ae1-5d56f477a986' },
  { email: 'liubafigeratehernandez@gmail.com', name: 'Liuva Figerate Hernandez', authId: '7e83917e-e0b8-4902-8d2d-de6816c24879' },
  { email: 'erikavianey1295@gmail.com', name: 'Erika Vianey Pool Miranda', authId: 'd32d2428-813b-46ae-8c28-12aa5aa536b8' },
];

async function diagnose() {
  console.log('=== DIAGNOSING TEAM MEMBER DASHBOARD ORGANIZATION ===\n');

  for (const member of teamMembers) {
    console.log(`\n--- ${member.name} (${member.email}) ---`);
    console.log(`Auth ID: ${member.authId}`);

    // Check ALL organization_users rows for this user
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('organization_users')
      .select('id, user_id, organization_id, role_new, status')
      .eq('user_id', member.authId);

    console.log('organization_users rows:', JSON.stringify(orgUsers, null, 2));
    if (orgUsersError) console.log('ERROR:', orgUsersError);

    // For each org user row, check what org they belong to
    if (orgUsers && orgUsers.length > 0) {
      for (const ou of orgUsers) {
        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, owner_id')
          .eq('id', ou.organization_id)
          .maybeSingle();
        console.log(`  Org for row ${ou.id}: ${org?.name} (${org?.id}) owner: ${org?.owner_id}`);
        console.log(`  Is Ana's org? ${org?.id === anaOrgId ? 'YES ✅' : 'NO ❌'}`);
      }
    }

    // Check profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, organization_id, role_new, user_type')
      .eq('id', member.authId)
      .maybeSingle();
    console.log('Profile organization_id:', profile?.organization_id);
    console.log('Profile is Ana org?', profile?.organization_id === anaOrgId ? 'YES ✅' : 'NO ❌');

    // Check residents table (if they are also residents)
    const { data: resident } = await supabase
      .from('residents')
      .select('id, condominium_id')
      .eq('user_id', member.authId)
      .maybeSingle();
    console.log('In residents table?', resident ? 'YES - could cause conflict! condo_id: ' + resident.condominium_id : 'No');
  }

  // Also check what organizations exist with names like Zacil, Las Palmas, Prueba
  console.log('\n=== LOOKING FOR Zacil, Las Palmas, Prueba organizations ===');
  const { data: susOrgs } = await supabase
    .from('organizations')
    .select('id, name, owner_id')
    .or('name.ilike.%zacil%,name.ilike.%palmas%,name.ilike.%prueba%');
  console.log('Suspicious orgs:', JSON.stringify(susOrgs, null, 2));

  // Check if team members have any entries in organization_users linked to those orgs
  console.log('\n=== CHECKING if team members appear in other orgs organization_users ===');
  const allAuthIds = teamMembers.map(m => m.authId);
  for (const authId of allAuthIds) {
    const { data: allOrgUserRows } = await supabase
      .from('organization_users')
      .select('organization_id, role_new, status')
      .eq('user_id', authId);
    if (allOrgUserRows && allOrgUserRows.length > 1) {
      console.log(`User ${authId} has MULTIPLE org_user rows:`, JSON.stringify(allOrgUserRows, null, 2));
    } else {
      console.log(`User ${authId} has 1 org_user row - OK`);
    }
  }
}

diagnose().catch(console.error);
