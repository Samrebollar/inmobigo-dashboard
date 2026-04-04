const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase env variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnose() {
  console.log('--- DIAGNÓSTICO DE PAQUETERÍA ---');

  // 1. Check package_alerts
  console.log('\nChecking table: package_alerts');
  const { data: alerts, error: alertsError } = await supabase
    .from('package_alerts')
    .select('*');
  
  if (alertsError) {
    console.error('Error in package_alerts:', alertsError.message);
  } else {
    console.log(`Found ${alerts?.length || 0} records in package_alerts`);
    if (alerts && alerts.length > 0) {
      alerts.forEach(a => {
        console.log(`- ID: ${a.id}, Org: ${a.organization_id}, Status: ${a.status}, Resident: ${a.resident_name}`);
      });
    }
  }

  // 2. Check package_notices (viejos)
  console.log('\nChecking table: package_notices');
  const { data: notices, error: noticesError } = await supabase
    .from('package_notices')
    .select('*');
  
  if (noticesError) {
    if (noticesError.code === '42P01') {
        console.log('Table package_notices does not exist (OK).');
    } else {
        console.error('Error in package_notices:', noticesError.message);
    }
  } else {
    console.log(`Found ${notices?.length || 0} records in package_notices`);
    if (notices && notices.length > 0) {
      notices.forEach(n => {
        console.log(`- ID: ${n.id}, Org: ${n.organization_id}, Status: ${n.status}, Courier: ${n.courier}`);
      });
    }
  }

  // 3. Current User Check (Optional, but let's see active organizations)
  console.log('\nChecking Organizations:');
  const { data: orgs } = await supabase.from('organizations').select('id, name');
  orgs?.forEach(o => console.log(`- ${o.name}: ${o.id}`));
}

diagnose();
