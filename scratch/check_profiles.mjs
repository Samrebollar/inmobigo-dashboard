import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfiles() {
  const emails = ['bella280218@gmail.com', 'liubafigeratehernandez@gmail.com', 'erikavianey1295@gmail.com'];
  const { data: profs } = await supabase.from('profiles').select('*').in('email', emails);
  console.log('Profiles for team members:');
  console.log(JSON.stringify(profs, null, 2));

  const { data: orgUsers } = await supabase.from('organization_users').select('*').in('user_id', profs.map(p => p.id));
  console.log('organization_users for team members:');
  console.log(JSON.stringify(orgUsers, null, 2));
}

checkProfiles().catch(console.error);
