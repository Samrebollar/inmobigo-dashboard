import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';

async function updateOrg() {
  console.log('=== UPDATING SUPABASE ORGANIZATIONS ===');
  const { data: updatedOrg, error: orgErr } = await supabase
    .from('organizations')
    .update({
      plan: 'CORPORATE PLUS',
      units_limit: 400
    })
    .eq('id', orgId)
    .select();

  if (orgErr) {
    console.error('Error updating organization:', orgErr);
  } else {
    console.log('Updated Organization:', JSON.stringify(updatedOrg, null, 2));
  }
}

updateOrg().catch(console.error);
