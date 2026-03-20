require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("=== CHECKING ORGANIZATIONS ===");
    const { data: orgs } = await supabase.from('organizations').select('*').limit(5);
    console.log("Orgs:", orgs);

    if (orgs && orgs.length > 0) {
        for (const org of orgs) {
            console.log(`\n=== CHECKING LIMITS FOR ORG: ${org.name} (${org.id}) ===`);
            
            const { data: subs } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('organization_id', org.id);
            console.log("Subscriptions:", subs);

            const { data: condos } = await supabase
                .from('condominiums')
                .select('id, name')
                .eq('organization_id', org.id);
            console.log("Condominiums:", condos);

            if (condos && condos.length > 0) {
                const condoIds = condos.map(c => c.id);
                const { count } = await supabase
                    .from('units')
                    .select('*', { count: 'exact', head: true })
                    .in('condominium_id', condoIds);
                console.log(`CURRENT UNIT COUNT: ${count}`);
                
                // Fetch actual units
                const { data: units } = await supabase
                    .from('units')
                    .select('id, unit_number, condominium_id')
                    .in('condominium_id', condoIds);
                console.log("Units:", units);
            }
        }
    }
}

check().catch(console.error);
