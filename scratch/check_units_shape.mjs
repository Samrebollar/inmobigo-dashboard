import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUnitsShape() {
  const { data: res } = await supabase
    .from('residents')
    .select(`
      *,
      units (
        unit_number,
        monto_mensual,
        payment_deadline,
        facturacion_activa
      )
    `)
    .eq('condominium_id', 'fbf9efe9-639c-409b-9694-551465f242ec')
    .limit(3);

  console.log('Sample resident row from Supabase query:');
  console.log(JSON.stringify(res, null, 2));

  for (const r of res) {
    const isArr = Array.isArray(r.units);
    console.log(`Resident ${r.first_name}: units type is Array?`, isArr, 'value:', r.units);
    const unitObj = isArr ? r.units[0] : r.units;
    const monto = Number(unitObj?.monto_mensual || 0);
    console.log(`Extracted monto_mensual: ${monto}`);
  }
}

checkUnitsShape().catch(console.error);
