import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';

async function testBoth() {
  console.log('=== VERIFYING FINANCE DATA FOR ORG 6b06be84 ===');

  const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single();
  console.log('Organization:', org.name, org.id);

  const { data: condos } = await supabase.from('condominiums').select('id, name').eq('organization_id', orgId);
  console.log('Condominiums:', condos);

  const { data: resInvoices } = await supabase.from('resident_invoices').select('id, amount, status, condominium_id').eq('organization_id', orgId);
  console.log('Resident Invoices count:', resInvoices?.length);

  const { data: condoExpenses } = await supabase.from('condo_expenses').select('id, amount, description, condominium_id').eq('organization_id', orgId);
  console.log('Condo Expenses count:', condoExpenses?.length);

  const { data: units } = await supabase.from('units').select('id, unit_number, monto_mensual').eq('organization_id', orgId);
  console.log('Units count:', units?.length);
}

testBoth().catch(console.error);
