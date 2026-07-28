import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectRLS() {
  console.log('=== INSPECTING RLS POLICIES FOR RESIDENTS AND RESIDENT_INVOICES ===\n');

  // Query pg_policies via raw SQL or rpc
  const { data: policies, error } = await supabase.rpc('get_policies_for_table', { table_name: 'residents' }).catch(() => ({ data: null }));

  // Alternatively query pg_policies using custom query if rpc doesn't exist
  const { data: pgPolicies, error: pgErr } = await supabase
    .from('pg_policies')
    .select('*')
    .catch(() => ({ data: null }));

  console.log('pg_policies query:', pgPolicies, pgErr);

  // Let's test what columns and values exist in profiles for Luz vs Ana
  const { data: luzProfile } = await supabase.from('profiles').select('*').eq('id', '0b93ba6a-058c-40fd-9ae1-5d56f477a986').single();
  const { data: anaProfile } = await supabase.from('profiles').select('*').eq('email', 'anarebollar891@gmail.com').single();

  console.log('Luz Profile:', luzProfile);
  console.log('Ana Profile:', anaProfile);

  // Let me check residents table structure and organization_id column on residents table!
  const { data: sampleRes } = await supabase.from('residents').select('*').limit(1).single();
  console.log('Sample resident row:', sampleRes);

  const { data: sampleInv } = await supabase.from('resident_invoices').select('*').limit(1).single();
  console.log('Sample resident invoice row:', sampleInv);
}

inspectRLS().catch(console.error);
