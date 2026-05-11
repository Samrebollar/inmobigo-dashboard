import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  const user = users?.users.find(u => u.email === 'samuelacosta182320@gmail.com');
  
  if (!user) {
    console.log('User not found');
    return;
  }
  
  console.log('User found:', user.id, user.email, user.created_at);

  const { data: orgUser } = await supabase.from('organization_users').select('organization_id').eq('user_id', user.id).maybeSingle();
  let orgId = orgUser?.organization_id;

  if (!orgId) {
    const { data: org } = await supabase.from('organizations').select('id, created_at').eq('owner_id', user.id).maybeSingle();
    orgId = org?.id;
    console.log('Organization (owner):', org);
  } else {
    const { data: org } = await supabase.from('organizations').select('id, created_at').eq('id', orgId).maybeSingle();
    console.log('Organization (member):', org);
  }

  if (orgId) {
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('organization_id', orgId).maybeSingle();
    console.log('Subscription:', sub);
  }
}

check().catch(console.error);
