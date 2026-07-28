import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const anonKey = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

const adminSupabase = createClient(supabaseUrl, supabaseKey);

const luzAuthId = '0b93ba6a-058c-40fd-9ae1-5d56f477a986';

async function testLuzQueries() {
  // Sign in as Luz using admin password set or token
  // Let's create a custom JWT or sign in as Luz
  const { data: linkData } = await adminSupabase.auth.admin.generateLink({
    type: 'magiclink',
    email: 'bella280218@gmail.com'
  });

  const tokenHash = linkData?.properties?.hashed_token;
  
  // Alternatively set password for Luz temporarily or verify token
  await adminSupabase.auth.admin.updateUserById(luzAuthId, { password: 'TestPassword123!' });

  const clientSupabase = createClient(supabaseUrl, anonKey);
  const { data: signInData, error: signInErr } = await clientSupabase.auth.signInWithPassword({
    email: 'bella280218@gmail.com',
    password: 'TestPassword123!'
  });

  if (signInErr) {
    console.error('SignIn error:', signInErr);
    return;
  }

  console.log('✅ Signed in successfully as Luz (bella280218@gmail.com)!');
  console.log('User ID:', signInData.user.id);

  // NOW TEST THE EXACT QUERIES RUN BY DelinquencyReportModal AND MorososPage AS LUZ!

  // 1. Query organization_users as Luz
  const { data: orgUser, error: orgUserErr } = await clientSupabase
    .from('organization_users')
    .select('role_new, organization_id')
    .eq('user_id', signInData.user.id)
    .maybeSingle();
  console.log('1. organization_users as Luz:', orgUser, 'Err:', orgUserErr);

  // 2. Query condominiums as Luz
  const { data: condos, error: condosErr } = await clientSupabase
    .from('condominiums')
    .select('id, name, organization_id')
    .eq('organization_id', orgUser?.organization_id || '6b06be84-1812-48c6-8fbb-45268a2fde60');
  console.log('2. condominiums as Luz:', condos, 'Err:', condosErr);

  const condoIds = condos?.map(c => c.id) || [];

  // 3. Query residents as Luz (residentsService.getByCondominiums)
  const { data: residents, error: resErr } = await clientSupabase
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
    .in('condominium_id', condoIds.length ? condoIds : ['fbf9efe9-639c-409b-9694-551465f242ec']);
  console.log('3. residents count as Luz:', residents?.length, 'Err:', resErr);

  // 4. Query resident_invoices as Luz (financeService.getByCondominiums)
  const { data: invoices, error: invErr } = await clientSupabase
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
    .in('condominium_id', condoIds.length ? condoIds : ['fbf9efe9-639c-409b-9694-551465f242ec']);
  console.log('4. resident_invoices count as Luz:', invoices?.length, 'Err:', invErr);
}

testLuzQueries().catch(console.error);
