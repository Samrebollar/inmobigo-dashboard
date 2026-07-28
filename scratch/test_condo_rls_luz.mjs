import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const adminSupabase = createClient(supabaseUrl, supabaseKey);

async function testLuzCondos() {
  const clientSupabase = createClient(supabaseUrl, anonKey);
  const { data: signInData } = await clientSupabase.auth.signInWithPassword({
    email: 'bella280218@gmail.com',
    password: 'TestPassword123!'
  });

  console.log('Signed in as Luz ID:', signInData.user.id);

  // 1. Check orgLookup on condominiums
  const { data: orgLookup, error: lookupErr } = await clientSupabase
    .from('condominiums')
    .select('organization_id')
    .eq('id', 'fbf9efe9-639c-409b-9694-551465f242ec')
    .maybeSingle();

  console.log('orgLookup as Luz:', orgLookup, 'Err:', lookupErr);

  // 2. Check orgCondos select
  const { data: orgCondos, error: condosErr } = await clientSupabase
    .from('condominiums')
    .select('id, name')
    .eq('organization_id', '6b06be84-1812-48c6-8fbb-45268a2fde60')
    .order('name');

  console.log('orgCondos as Luz:', orgCondos, 'Err:', condosErr);

  // 3. Test DelinquencyReportModal data loading steps as Luz:
  const condoIds = ['fbf9efe9-639c-409b-9694-551465f242ec'];

  const { data: allResidents, error: resErr } = await clientSupabase
    .from('residents')
    .select(`
      *,
      units (
        unit_number,
        monto_mensual,
        payment_deadline,
        facturacion_activa
      ),
      vehicles (*)
    `)
    .in('condominium_id', condoIds);

  console.log('allResidents length as Luz:', allResidents?.length, 'Err:', resErr);

  const { data: allInvoices, error: invErr } = await clientSupabase
    .from('resident_invoices')
    .select(`
      *,
      residents (
        first_name,
        last_name,
        units (
          unit_number
        )
      ),
      condominiums (
        name,
        logo_url
      )
    `)
    .in('condominium_id', condoIds);

  console.log('allInvoices length as Luz:', allInvoices?.length, 'Err:', invErr);
}

testLuzCondos().catch(console.error);
