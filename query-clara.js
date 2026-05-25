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

async function queryClara() {
    // 1. Fetch Clara Licona
    const { data: residents, error: rErr } = await supabase
        .from('residents')
        .select('*')
        .ilike('first_name', '%Clara%');
        
    if (rErr) {
        console.error('Error fetching resident:', rErr);
        return;
    }
    
    console.log('Residents found:', residents);
    if (!residents || residents.length === 0) return;
    
    const resident = residents[0];
    
    // 2. Fetch invoices for Clara
    const { data: invoices, error: iErr } = await supabase
        .from('resident_invoices')
        .select('*')
        .eq('resident_id', resident.id);
        
    if (iErr) {
        console.error('Error fetching invoices:', iErr);
        return;
    }
    
    console.log('Invoices for Clara Licona:', invoices);
}

queryClara();
