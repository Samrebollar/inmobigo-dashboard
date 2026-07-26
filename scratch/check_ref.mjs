import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRef() {
  const ref = '634862d9-b5ce-4066-8777-2e49b2586cf5';
  console.log('Searching for external_reference:', ref);
  
  const { data: org } = await supabase.from('organizations').select('*').eq('id', ref);
  console.log('Org with ID = ref:', org);
  
  const { data: sub } = await supabase.from('subscriptions').select('*').eq('organization_id', ref);
  console.log('Subscription for Org ref:', sub);

  const { data: allOrgs } = await supabase.from('organizations').select('*');
  console.log('All Orgs:', allOrgs);
}

checkRef().catch(console.error);
