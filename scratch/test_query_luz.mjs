import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const luzUserId = '0b93ba6a-058c-40fd-9ae1-5d56f477a986';

async function testQuery() {
  console.log('=== TEST QUERY FOR LUZ ===');
  
  // 1. Query from finance/page.tsx
  const orgUserData = await supabase
    .from('organization_users')
    .select('role, role_new, organization:organizations(*)')
    .eq('user_id', luzUserId)
    .maybeSingle();

  console.log('orgUserData:', JSON.stringify(orgUserData, null, 2));

  // 2. Query org directly by organization_id from organization_users
  const ou = await supabase
    .from('organization_users')
    .select('*')
    .eq('user_id', luzUserId)
    .maybeSingle();
  console.log('ou direct:', ou.data);

  if (ou.data?.organization_id) {
    const org = await supabase
      .from('organizations')
      .select('*')
      .eq('id', ou.data.organization_id)
      .maybeSingle();
    console.log('org direct:', org.data);
  }

  // 3. Check what AdminFinanceClient queries
  const orgId = ou.data?.organization_id;
  if (orgId) {
    const invoices = await supabase.from('invoices').select('*').eq('organization_id', orgId);
    console.log(`Invoices count for org ${orgId}:`, invoices.data?.length, invoices.error);

    const condoExpenses = await supabase.from('condo_expenses').select('*').eq('organization_id', orgId);
    console.log(`Condo expenses count for org ${orgId}:`, condoExpenses.data?.length, condoExpenses.error);

    const payments = await supabase.from('payments').select('*').eq('organization_id', orgId);
    console.log(`Payments count for org ${orgId}:`, payments.data?.length, payments.error);

    const units = await supabase.from('units').select('*').eq('organization_id', orgId);
    console.log(`Units count for org ${orgId}:`, units.data?.length, units.error);
  }
}

testQuery().catch(console.error);
