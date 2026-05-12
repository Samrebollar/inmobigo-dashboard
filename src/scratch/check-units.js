const { createClient } = require('../utils/supabase/client');
const supabase = createClient();

async function checkUnits() {
    const { data: condos } = await supabase.from('condominiums').select('id, name').eq('name', 'Zacil').single();
    if (!condos) {
        console.log('Condo Zacil not found');
        return;
    }
    const { data: units } = await supabase.from('units').select('unit_number, payment_deadline, monto_mensual').eq('condominium_id', condos.id);
    console.log(JSON.stringify(units, null, 2));
}

checkUnits();
