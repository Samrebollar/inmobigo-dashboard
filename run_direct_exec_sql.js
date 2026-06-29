const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const url = 'https://djxllvplxdigosbhhicn.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg';

const supabase = createClient(url, key);

async function run() {
    const sql = fs.readFileSync('supabase/migrations/20260628_control_operativo_v2.sql', 'utf8');
    console.log('Sending SQL to exec_sql...');
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
        console.error('Migration failed:', error.message || error);
    } else {
        console.log('Migration completed successfully! Result:', data);
    }
}

run();
