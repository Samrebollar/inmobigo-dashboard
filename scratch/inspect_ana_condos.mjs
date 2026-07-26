import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';

async function inspectCondos() {
  console.log('=== CONDOMINIUMS FOR ORG 6b06be84 ===');
  const { data: condos } = await supabase.from('condominiums').select('*').eq('organization_id', orgId);
  console.log('Condominiums:', condos);

  console.log('=== PROFILES COLUMNS / SAMPLE ===');
  const { data: sampleProfile } = await supabase.from('profiles').select('*').limit(1);
  console.log('Sample profile:', sampleProfile);

  console.log('=== ORGANIZATION USERS COLUMNS / SAMPLE ===');
  const { data: sampleOrgUser } = await supabase.from('organization_users').select('*').eq('organization_id', orgId);
  console.log('Org users for Ana:', sampleOrgUser);
}

inspectCondos().catch(console.error);
