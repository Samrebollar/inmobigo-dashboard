import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1] || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1];

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function check() {
  const { data: orgs } = await supabase.from('organizations').select('id, name, created_at, trial_ends_at');
  const { data: subs } = await supabase.from('subscriptions').select('*');
  console.log('Organizations:', JSON.stringify(orgs, null, 2));
  console.log('Subscriptions:', JSON.stringify(subs, null, 2));
}

check().catch(console.error);
