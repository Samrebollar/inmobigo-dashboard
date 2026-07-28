import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

const orgId = '6b06be84-1812-48c6-8fbb-45268a2fde60';

async function check() {
  console.log('=== CHECKING MOROSOS FOR ORG 6b06be84-1812-48c6-8fbb-45268a2fde60 ===');

  // 1. Condominiums
  const { data: condos, error: condoErr } = await supabase
    .from('condominiums')
    .select('id, name, status, organization_id')
    .eq('organization_id', orgId);
  console.log('Condominiums:', condos, 'Err:', condoErr);

  const condoIds = condos?.map(c => c.id) || [];

  // 2. Residents
  const { data: residents, error: resErr } = await supabase
    .from('residents')
    .select('id, first_name, last_name, condominium_id, unit_id')
    .in('condominium_id', condoIds.length ? condoIds : [orgId]);
  console.log(`Residents count in condos: ${residents?.length}`);
  if (residents && residents.length > 0) {
    console.log('Sample resident:', residents[0]);
  }

  // Also check residents by orgId directly if any
  const { data: orgResidents } = await supabase
    .from('residents')
    .select('id, first_name, last_name, condominium_id')
    .eq('organization_id', orgId);
  console.log(`Residents with organization_id=${orgId}: ${orgResidents?.length}`);

  // 3. Resident Invoices
  const { data: resInvoices, error: resInvErr } = await supabase
    .from('resident_invoices')
    .select('id, resident_id, condominium_id, organization_id, amount, balance_due, status, due_date, created_at')
    .or(`organization_id.eq.${orgId}${condoIds.length ? `,condominium_id.in.(${condoIds.join(',')})` : ''}`);
  
  console.log(`Resident Invoices total: ${resInvoices?.length}`, 'Err:', resInvErr);
  if (resInvoices) {
    console.log('Resident Invoices by status:', 
      resInvoices.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {})
    );
    console.log('Sample resident invoices:', resInvoices.slice(0, 5));
  }

  // 4. Invoices (standard table)
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, resident_id, condominium_id, organization_id, amount, status, due_date')
    .or(`organization_id.eq.${orgId}${condoIds.length ? `,condominium_id.in.(${condoIds.join(',')})` : ''}`);
  
  console.log(`Invoices total: ${invoices?.length}`, 'Err:', invErr);
  if (invoices) {
    console.log('Invoices by status:', 
      invoices.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {})
    );
    console.log('Sample invoices:', invoices.slice(0, 5));
  }

  // 5. Units (to see if there are unpaid units)
  const { data: units } = await supabase
    .from('units')
    .select('id, unit_number, condominium_id, status, is_occupied')
    .in('condominium_id', condoIds.length ? condoIds : [orgId]);
  console.log(`Units count: ${units?.length}`);

  // 6. Test what residentsService.getByCondominiums(condoIds) returns
  const { data: resByCondo } = await supabase
    .from('residents')
    .select('*, units(unit_number), vehicles(*)')
    .in('condominium_id', condoIds);
  console.log(`residentsService.getByCondominiums count: ${resByCondo?.length}`);

  // 7. Test what financeService.getByCondominiums(condoIds) returns
  const { data: finByCondo } = await supabase
    .from('resident_invoices')
    .select('*, residents(first_name, last_name, units(unit_number)), condominiums(name, logo_url)')
    .in('condominium_id', condoIds);
  console.log(`financeService.getByCondominiums count: ${finByCondo?.length}`);
}

check().catch(console.error);
