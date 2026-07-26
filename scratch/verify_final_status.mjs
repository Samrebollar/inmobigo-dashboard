import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();
const mpAccessToken = env.match(/MP_ACCESS_TOKEN=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';
const subId = '634862d9-b5ce-4066-8777-2e49b2586cf5';
const preapprovalId = '456de373832144648a1f326e666bf332';

async function verify() {
  console.log('=== VERIFY SUPABASE ORG ===');
  const { data: org } = await supabase.from('organizations').select('id, name, plan, units_limit, status').eq('id', orgId).single();
  console.log('Org:', org);

  console.log('=== VERIFY SUPABASE SUB ===');
  const { data: sub } = await supabase.from('subscriptions').select('id, plan_name, price, unit_limit, subscription_status, next_payment_date').eq('id', subId).single();
  console.log('Sub:', sub);

  console.log('=== VERIFY MERCADO PAGO PREAPPROVAL ===');
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${mpAccessToken}` }
  });
  const mp = await res.json();
  console.log('Mercado Pago:', {
    id: mp.id,
    reason: mp.reason,
    amount: mp.auto_recurring?.transaction_amount,
    currency: mp.auto_recurring?.currency_id,
    next_payment_date: mp.next_payment_date,
    status: mp.status
  });
}

verify().catch(console.error);
