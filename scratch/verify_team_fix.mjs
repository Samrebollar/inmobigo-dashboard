import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const members = [
  { email: 'bella280218@gmail.com', userId: '0b93ba6a-058c-40fd-9ae1-5d56f477a986' },
  { email: 'liubafigeratehernandez@gmail.com', userId: '7e83917e-e0b8-4902-8d2d-de6816c24879' },
  { email: 'erikavianey1295@gmail.com', userId: 'd32d2428-813b-46ae-8c28-12aa5aa536b8' }
];

async function verifyAll() {
  for (const m of members) {
    console.log(`\n=== VERIFYING ${m.email} (${m.userId}) ===`);

    const { data: ou } = await supabase.from('organization_users').select('*').eq('user_id', m.userId);
    console.log('organization_users:', ou);

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', m.userId);
    console.log('profiles:', prof);

    const orgId = ou?.[0]?.organization_id;
    if (orgId) {
      const { data: org } = await supabase.from('organizations').select('id, name, plan, units_limit').eq('id', orgId).single();
      console.log('Org:', org);

      const { data: condos } = await supabase.from('condominiums').select('id, name, units_total').eq('organization_id', orgId);
      console.log('Condos in Org:', condos);
    }
  }
}

verifyAll().catch(console.error);
