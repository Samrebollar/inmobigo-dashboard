import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const mpAccessToken = env.match(/MP_ACCESS_TOKEN=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  console.log('=== USER CHECK ===');
  const { data: user, error: uErr } = await supabase.auth.admin.getUserById('e88a3dd6-7bbe-429e-a4ba-c4e8c619a477');
  console.log('User e88a3dd6...:', user?.user?.email, user?.user?.id);

  const { data: allUsers } = await supabase.auth.admin.listUsers();
  console.log('All Users in Auth:', allUsers?.users.map(u => ({ id: u.id, email: u.email })));

  console.log('\n=== ORGANIZATIONS ===');
  const { data: orgs } = await supabase.from('organizations').select('*');
  console.log('Organizations:', JSON.stringify(orgs, null, 2));

  console.log('\n=== SUBSCRIPTIONS TABLE ===');
  const { data: subs } = await supabase.from('subscriptions').select('*');
  console.log('Subscriptions:', JSON.stringify(subs, null, 2));

  console.log('\n=== PROFILES TABLE ===');
  const { data: profiles } = await supabase.from('profiles').select('*');
  console.log('Profiles:', JSON.stringify(profiles, null, 2));

  console.log('\n=== MERCADO PAGO PREAPPROVAL 456de373832144648a1f326e666bf332 ===');
  const res = await fetch(`https://api.mercadopago.com/preapproval/456de373832144648a1f326e666bf332`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` }
  });
  const subData = await res.json();
  console.log('Preapproval Details:', JSON.stringify(subData, null, 2));
}

inspect().catch(console.error);
