const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const envFile = fs.readFileSync(envPath, 'utf8');
const envVars = envFile.split('\n').reduce((acc, line) => {
    const [key, ...rest] = line.split('=');
    const value = rest.join('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

async function main() {
    try {
        console.log('1. Checking benefit_referrals columns...');
        // Let's select one row or just query a limit of 1
        const { data: cols, error: colError } = await supabase
            .from('benefit_referrals')
            .select('referred_organization_id, referred_registered_at, plan_activated_at, reward_generated_at, reward_paid_at')
            .limit(1);

        if (colError) {
            console.log('❌ Error fetching benefit_referrals columns:', colError.message);
        } else {
            console.log('✅ Columns in benefit_referrals exist!');
        }

        console.log('2. Checking benefit_reward_payments...');
        const { data: pmts, error: pmtError } = await supabase
            .from('benefit_reward_payments')
            .select('*')
            .limit(1);

        if (pmtError) {
            console.log('❌ Error fetching benefit_reward_payments:', pmtError.message);
        } else {
            console.log('✅ Table benefit_reward_payments exists!');
        }
    } catch (err) {
        console.error('Exception:', err);
    }
}

main();
