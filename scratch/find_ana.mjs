import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const mpAccessToken = env.match(/MP_ACCESS_TOKEN=(.*)/)?.[1]?.trim();

const testMpAccessToken = 'TEST-4638494103392780-020918-16f254edc06d4a6a550f527f4cae7a90-3190862015';

const targetEmail = 'anarebollar891@gmail.com';

console.log('=== CHECKING SUPABASE ===');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. List Users in Supabase
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) console.error('Error listing users:', usersErr);
  
  const allUsers = usersData?.users || [];
  console.log(`Found ${allUsers.length} total users in Supabase auth.`);
  
  const targetUser = allUsers.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase());
  if (targetUser) {
    console.log('User found in Supabase Auth:', JSON.stringify(targetUser, null, 2));
    
    // Check org user / org
    const { data: orgUsers } = await supabase.from('organization_users').select('*').eq('user_id', targetUser.id);
    console.log('Organization Users:', JSON.stringify(orgUsers, null, 2));
    
    const { data: ownedOrgs } = await supabase.from('organizations').select('*').eq('owner_id', targetUser.id);
    console.log('Owned Organizations:', JSON.stringify(ownedOrgs, null, 2));
    
    const orgIds = [
      ...(orgUsers?.map(ou => ou.organization_id) || []),
      ...(ownedOrgs?.map(o => o.id) || [])
    ];
    
    for (const orgId of orgIds) {
      const { data: sub } = await supabase.from('subscriptions').select('*').eq('organization_id', orgId);
      console.log(`Subscriptions for org ${orgId}:`, JSON.stringify(sub, null, 2));
    }
  } else {
    console.log(`User ${targetEmail} NOT found in Supabase Auth.`);
    console.log('Sample users in Supabase:');
    allUsers.forEach(u => console.log(` - ${u.id}: ${u.email}`));
  }

  // Also check if any subscriptions table has email or payer_email column
  const { data: allSubs } = await supabase.from('subscriptions').select('*');
  console.log('All Subscriptions in Supabase DB:', JSON.stringify(allSubs, null, 2));

  const { data: allOrgs } = await supabase.from('organizations').select('*');
  console.log('All Organizations in Supabase DB:', JSON.stringify(allOrgs, null, 2));

  console.log('\n=== CHECKING MERCADO PAGO (PROD ACCESS TOKEN) ===');
  await checkMercadoPago(mpAccessToken);

  console.log('\n=== CHECKING MERCADO PAGO (TEST ACCESS TOKEN) ===');
  await checkMercadoPago(testMpAccessToken);
}

async function checkMercadoPago(token) {
  if (!token) {
    console.log('No token provided.');
    return;
  }
  
  // Preapprovals search by email
  try {
    const res = await fetch(`https://api.mercadopago.com/preapproval/search?payer_email=${encodeURIComponent(targetEmail)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(`Preapproval search by email (${targetEmail}):`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching preapproval by email:', err);
  }

  // All preapprovals
  try {
    const res = await fetch(`https://api.mercadopago.com/preapproval/search?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(`All Preapprovals list (total ${data.paging?.total || data.results?.length}):`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching all preapprovals:', err);
  }

  // Payments search by email
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/search?payer.email=${encodeURIComponent(targetEmail)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(`Payments search by email (${targetEmail}):`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching payments by email:', err);
  }

  // All payments
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/search?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(`All Payments list (total ${data.paging?.total || data.results?.length}):`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching all payments:', err);
  }
}

run().catch(console.error);
