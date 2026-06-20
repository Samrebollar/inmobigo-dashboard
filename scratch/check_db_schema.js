const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
let supabaseUrl, supabaseKey;

if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const lines = env.split('\n');
    lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = trimmed.split('=')[1].trim();
        if (trimmed.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = trimmed.split('=')[1].trim();
    });
}

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Service Role Key not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log('Checking benefit_referrals table columns...');
    const { data: refCols, error: err1 } = await supabase
        .from('benefit_referrals')
        .select('*')
        .limit(1);

    if (err1) {
        console.error('Error fetching benefit_referrals:', err1.message);
    } else {
        console.log('Columns in benefit_referrals:', Object.keys(refCols[0] || {}));
    }

    console.log('Checking benefit_reward_payments table...');
    const { data: payData, error: err2 } = await supabase
        .from('benefit_reward_payments')
        .select('*')
        .limit(1);

    if (err2) {
        console.error('Error fetching benefit_reward_payments:', err2.message);
    } else {
        console.log('benefit_reward_payments table exists and is accessible. Sample data keys:', Object.keys(payData[0] || {}));
    }
}

checkSchema();
