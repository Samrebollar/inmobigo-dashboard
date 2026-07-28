import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';

async function testAnalyticsLuz() {
  const clientSupabase = createClient(supabaseUrl, anonKey);
  const { data: signInData } = await clientSupabase.auth.signInWithPassword({
    email: 'bella280218@gmail.com',
    password: 'TestPassword123!'
  });

  console.log('Signed in as Luz ID:', signInData.user.id);

  // 1. Test fetching all residents as Luz for analytics
  const { data: condoList } = await clientSupabase.from('condominiums').select('id').eq('organization_id', orgId);
  const condoIds = condoList?.map(c => c.id) || [];
  console.log('condoIds as Luz:', condoIds);

  const { data: residents } = await clientSupabase.from('residents').select('id, first_name, status, fecha_ingreso').in('condominium_id', condoIds);
  console.log('residents count for analytics as Luz:', residents?.length);

  const { data: units } = await clientSupabase.from('units').select('id, condominium_id, unit_number, monto_mensual, payment_deadline, facturacion_activa').eq('organization_id', orgId);
  console.log('units count for analytics as Luz:', units?.length);

  const { data: invoices } = await clientSupabase.from('resident_invoices').select('amount, balance_due, status, resident_id, invoice_type, created_at, due_date').eq('organization_id', orgId);
  console.log('invoices count for analytics as Luz:', invoices?.length);
}

testAnalyticsLuz().catch(console.error);
