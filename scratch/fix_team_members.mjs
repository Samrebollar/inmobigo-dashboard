import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';

const members = [
  {
    email: 'bella280218@gmail.com',
    name: 'Luz Del Carmen Rosas Cruz',
    userId: '0b93ba6a-058c-40fd-9ae1-5d56f477a986'
  },
  {
    email: 'liubafigeratehernandez@gmail.com',
    name: 'Liuva Figerate Hernanadez',
    userId: '7e83917e-e0b8-4902-8d2d-de6816c24879'
  },
  {
    email: 'erikavianey1295@gmail.com',
    name: 'Erika Vianey Pool Miranda',
    userId: 'd32d2428-813b-46ae-8c28-12aa5aa536b8'
  }
];

async function fixOrgUsers() {
  for (const m of members) {
    console.log(`\n=== UPDATING ORG USERS FOR: ${m.email} ===`);
    const { data: ouData, error: ouErr } = await supabase
      .from('organization_users')
      .update({
        status: 'active',
        role_new: 'admin_condominio'
      })
      .eq('user_id', m.userId)
      .eq('organization_id', orgId)
      .select();

    if (ouErr) {
      console.error(`Error updating organization_users for ${m.email}:`, ouErr);
    } else {
      console.log(`organization_users updated:`, ouData);
    }
  }
}

fixOrgUsers().catch(console.error);
