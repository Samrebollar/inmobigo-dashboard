import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const mpAccessToken = env.match(/MP_ACCESS_TOKEN=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';
const preapprovalId = '456de373832144648a1f326e666bf332';

async function main() {
  console.log('=== 1. CHECK EXISTING SUBSCRIPTION IN DB ===');
  const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).single();
  console.log('Org before update:', org);

  const { data: subs } = await supabase.from('subscriptions').select('*').or(`organization_id.eq.${orgId},mercado_subscription_id.eq.${preapprovalId}`);
  console.log('Subs for org:', subs);

  console.log('\n=== 2. TEST MERCADO PAGO UPDATE ===');
  // GET current preapproval
  const getRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` }
  });
  const currentMp = await getRes.json();
  console.log('Current MP Preapproval:', {
    id: currentMp.id,
    reason: currentMp.reason,
    amount: currentMp.auto_recurring?.transaction_amount,
    next_payment_date: currentMp.next_payment_date,
    status: currentMp.status
  });

  // Try PUT update to Mercado Pago
  const updateBody = {
    reason: 'InmobiGo CORPORATE PLUS',
    auto_recurring: {
      transaction_amount: 9999,
      currency_id: 'MXN'
    }
  };

  console.log('Sending PUT to Mercado Pago with body:', updateBody);
  const putRes = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${mpAccessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updateBody)
  });

  const putData = await putRes.json();
  console.log('MP PUT Response status:', putRes.status);
  console.log('MP PUT Response data:', JSON.stringify(putData, null, 2));
}

main().catch(console.error);
