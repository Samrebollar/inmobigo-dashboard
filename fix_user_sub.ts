import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1];

const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixSub() {
  const orgId = 'cc123967-5f96-4d4e-acfa-0b4eb889b570';
  
  // They paid around April 26th. Next payment is May 26th.
  const nextPaymentDate = new Date('2026-05-26T00:00:00.000Z').toISOString();

  const { data: existing } = await supabase.from('subscriptions').select('id').eq('organization_id', orgId).maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        subscription_status: 'active',
        next_payment_date: nextPaymentDate
      })
      .eq('id', existing.id)
      .select();
    if (error) console.error('Error:', error);
    else console.log('Updated Subscription:', data);
  } else {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: orgId,
        subscription_status: 'active',
        next_payment_date: nextPaymentDate
      })
      .select();
    if (error) console.error('Error:', error);
    else console.log('Inserted Subscription:', data);
  }
}

fixSub().catch(console.error);
