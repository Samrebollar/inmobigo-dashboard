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

async function checkAllResidents() {
    const { data: residents } = await supabase.from('residents').select('*');
    
    console.log(`Checking ${residents.length} residents:`);
    for (const res of residents) {
        let organizationId = null;
        if (res.condominium_id) {
            const { data: condoData } = await supabase
                .from('condominiums')
                .select('organization_id')
                .eq('id', res.condominium_id)
                .maybeSingle();
            organizationId = condoData?.organization_id;
        }
        
        const { data: activeSub } = await supabase
            .from('subscriptions')
            .select('subscription_status, plan_name, created_at, next_payment_date')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
            
        let globalDaysRemaining = 999;
        
        if (activeSub?.next_payment_date) {
            const nextPayment = new Date(activeSub.next_payment_date);
            const now = new Date();
            const diffTime = nextPayment.getTime() - now.getTime();
            globalDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } else if (organizationId) {
            const { data: org } = await supabase.from('organizations').select('created_at').eq('id', organizationId).maybeSingle();
            if (org?.created_at) {
                const nextPayment = new Date(new Date(org.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);
                const now = new Date();
                const diffTime = nextPayment.getTime() - now.getTime();
                globalDaysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            }
        }
        
        console.log(`Resident: ${res.first_name} ${res.last_name} | CondoId: ${res.condominium_id} | OrgId: ${organizationId} | ActiveSub: ${JSON.stringify(activeSub)} | DaysRemaining: ${globalDaysRemaining}`);
    }
}

checkAllResidents();
