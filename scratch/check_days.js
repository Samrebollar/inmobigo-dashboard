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

async function checkDays() {
    const orgId = 'cc123967-5f96-4d4e-acfa-0b4eb889b570'; // Clara's organization
    
    // Fetch condo / organization info
    const { data: condoData } = await supabase
        .from('condominiums')
        .select('id, name, organization_id')
        .eq('id', '83ebf549-c241-4000-bbe8-3d53f818f008')
        .maybeSingle();
        
    console.log('Condo Data:', condoData);
    
    const { data: activeSub } = await supabase
        .from('subscriptions')
        .select('subscription_status, plan_name, created_at, next_payment_date')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
    console.log('Active Sub:', activeSub);
    
    let globalDaysRemaining = 999;
    
    if (activeSub?.next_payment_date) {
        const nextPayment = new Date(activeSub.next_payment_date);
        const now = new Date();
        const diffTime = nextPayment.getTime() - now.getTime();
        globalDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        console.log(`Sub Branch: next_payment_date=${activeSub.next_payment_date}, now=${now.toISOString()}, diff=${diffTime}, remaining=${globalDaysRemaining}`);
    } else {
        const { data: org } = await supabase.from('organizations').select('created_at').eq('id', orgId).maybeSingle();
        console.log('Org:', org);
        if (org?.created_at) {
            const nextPayment = new Date(new Date(org.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
            const now = new Date();
            const diffTime = nextPayment.getTime() - now.getTime();
            globalDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            console.log(`Org Branch: created_at=${org.created_at}, nextPayment=${nextPayment.toISOString()}, now=${now.toISOString()}, diff=${diffTime}, remaining=${globalDaysRemaining}`);
        }
    }
    
    console.log('Final Calculated globalDaysRemaining:', globalDaysRemaining);
}

checkDays();
