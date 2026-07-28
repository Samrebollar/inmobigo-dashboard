import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { calculateResidentMonthlyFinancials } from '../src/utils/finance-utils.ts';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);
const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';

async function testCalc() {
  const { data: condos } = await supabase.from('condominiums').select('id, name').eq('organization_id', orgId);
  const condoIds = condos.map(c => c.id);

  const { data: residents } = await supabase.from('residents').select('*, units(*)').in('condominium_id', condoIds);
  const { data: invoices } = await supabase.from('resident_invoices').select('*').in('condominium_id', condoIds);
  const { data: units } = await supabase.from('units').select('*').in('condominium_id', condoIds);

  console.log(`Loaded ${residents.length} residents, ${invoices.length} invoices, ${units.length} units.`);

  let morososWithVirtual = 0;
  let totalDeudaVirtual = 0;

  for (const resident of residents) {
    const unit = units.find(u => u.id === resident.unit_id);
    const monthlyFee = Number(unit?.monto_mensual || 0);

    const residentInvoices = invoices.filter(inv => inv.resident_id === resident.id);

    const fin = calculateResidentMonthlyFinancials({
      resident,
      invoices: residentInvoices,
      selectedMonth: 'all',
      selectedYear: 2026,
      monthlyFee
    });

    if (fin.overdueAmount > 0 || fin.overdueCount > 0) {
      morososWithVirtual++;
      totalDeudaVirtual += fin.overdueAmount;
    }
  }

  console.log(`Morosos calculated via finance-utils: ${morososWithVirtual}`);
  console.log(`Total Deuda calculated via finance-utils: $${totalDeudaVirtual}`);
}

testCalc().catch(console.error);
