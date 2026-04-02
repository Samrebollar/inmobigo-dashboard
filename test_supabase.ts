import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  const { data: organizations } = await supabase.from('organizations').select('*').limit(1);
  const orgId = organizations?.[0]?.id;
  
  console.log('Using Org ID:', orgId);

  const { data: d1, error: e1 } = await supabase.from('amenity_reservations').select('*').eq('organization_id', orgId);
  console.log('\n--- Plain Select ---');
  console.log('Error:', e1?.message);
  console.log('Count:', d1?.length);
  if (d1?.length > 0) console.log('Resident ID:', d1[0].resident_id);

  const { data: d2, error: e2 } = await supabase.from('amenity_reservations').select('*, profiles(*)').eq('organization_id', orgId);
  console.log('\n--- Select with profiles(*) ---');
  console.log('Error:', e2?.message);
  console.log('Count:', d2?.length);

  const { data: d3, error: e3 } = await supabase.from('amenity_reservations').select('*, profiles!amenity_reservations_resident_id_fkey(*)').eq('organization_id', orgId);
  console.log('\n--- Select with profiles!fkey ---');
  console.log('Error:', e3?.message);
  console.log('Count:', d3?.length);
}

runTest();
