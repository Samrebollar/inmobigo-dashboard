import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const emails = [
  'anarebollar891@gmail.com',
  'bella280218@gmail.com',
  'liubafigeratehernandez@gmail.com',
  'erikavianey1295@gmail.com'
];

async function diagnose() {
  console.log('=== 1. CHECK AUTH USERS ===');
  const { data: usersData, error: uErr } = await supabase.auth.admin.listUsers();
  const allUsers = usersData?.users || [];
  
  const foundUsers = [];
  for (const email of emails) {
    const u = allUsers.find(user => user.email?.toLowerCase() === email.toLowerCase());
    console.log(`Email: ${email} => User ID: ${u ? u.id : 'NOT FOUND IN AUTH'}`);
    if (u) foundUsers.push(u);
  }

  console.log('\n=== 2. CHECK PROFILES TABLE ===');
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('All Profiles count:', profiles?.length);
  for (const email of emails) {
    const prof = profiles?.filter(p => p.email?.toLowerCase() === email.toLowerCase() || foundUsers.some(u => u.email?.toLowerCase() === email.toLowerCase() && u.id === p.id));
    console.log(`Profile for ${email}:`, prof);
  }

  console.log('\n=== 3. CHECK ORGANIZATION USERS TABLE ===');
  const { data: orgUsers } = await supabase.from('organization_users').select('*');
  console.log('All Organization Users count:', orgUsers?.length);
  for (const u of foundUsers) {
    const ou = orgUsers?.filter(o => o.user_id === u.id);
    console.log(`Organization Users for ${u.email} (${u.id}):`, ou);
  }

  console.log('\n=== 4. CHECK ANA ORGANIZATIONS ===');
  const anaUser = allUsers.find(u => u.email?.toLowerCase() === 'anarebollar891@gmail.com');
  if (anaUser) {
    const { data: anaOrgs } = await supabase.from('organizations').select('*').eq('owner_id', anaUser.id);
    console.log(`Orgs owned by Ana (${anaUser.id}):`, anaOrgs);
    const { data: anaOrgUsers } = await supabase.from('organization_users').select('*').eq('user_id', anaUser.id);
    console.log(`OrgUsers for Ana:`, anaOrgUsers);
  } else {
    console.log('Ana user not found in auth. Listing org 6b06be84-1812-48c6-8fbb-45268a2fde60:');
    const { data: targetOrg } = await supabase.from('organizations').select('*').eq('id', '6b06be84-1812-48c6-8fbb-45268a2fde60');
    console.log('Target Org 6b06be84...:', targetOrg);
    const { data: orgUsersForTarget } = await supabase.from('organization_users').select('*').eq('organization_id', '6b06be84-1812-48c6-8fbb-45268a2fde60');
    console.log('OrgUsers for Target Org 6b06be84...:', orgUsersForTarget);
  }

  console.log('\n=== 5. CHECK ALL TABLES FOR EMAIL MATCHES ===');
  const tables = ['profiles', 'organization_users', 'users', 'residents'];
  for (const table of tables) {
    try {
      const { data } = await supabase.from(table).select('*');
      if (data) {
        for (const email of emails) {
          const matches = data.filter(row => JSON.stringify(row).toLowerCase().includes(email.toLowerCase()));
          if (matches.length > 0) {
            console.log(`Matches in ${table} for ${email}:`, matches);
          }
        }
      }
    } catch (e) {}
  }
}

diagnose().catch(console.error);
