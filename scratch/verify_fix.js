const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
    // Samuel's userId: 5f6fee79-027e-434d-bad3-356071e715e6
    // Samuel's org: 16e61e52-a176-4631-b41c-7da89c9e1730
    const orgId = '16e61e52-a176-4631-b41c-7da89c9e1730';
    
    console.log('=== ALL subscriptions for Samuel org ===');
    const { data: allSubs } = await supabase
        .from('subscriptions')
        .select('id, subscription_status, plan_name, created_at, next_payment_date')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
    
    console.log(JSON.stringify(allSubs, null, 2));
    
    console.log('\n=== Active-only query (new logic) ===');
    const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('id, subscription_status, plan_name, created_at, next_payment_date')
        .eq('organization_id', orgId)
        .eq('subscription_status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    console.log(JSON.stringify(activeSub, null, 2));
    
    let globalDaysRemaining = 999;
    
    if (activeSub?.next_payment_date) {
        const nextPayment = new Date(activeSub.next_payment_date);
        const now = new Date();
        const diffTime = nextPayment.getTime() - now.getTime();
        globalDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log(`\nDays remaining (from active sub): ${globalDaysRemaining}`);
        console.log(`Next payment date: ${activeSub.next_payment_date}`);
    } else if (activeSub) {
        // Active sub found but no next_payment_date - fallback to created_at + 30 days
        console.log('\nActive sub found but no next_payment_date, using created_at + 30d fallback');
        const nextPayment = new Date(new Date(activeSub.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const diffTime = nextPayment.getTime() - now.getTime();
        globalDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log(`Days remaining: ${globalDaysRemaining}`);
    } else {
        console.log('\nNo active sub found at all!');
    }
    
    console.log(`\nFINAL shouldLock (daysRemaining <= 0): ${globalDaysRemaining <= 0}`);
}

check();
