import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'

async function test() {
    if (fs.existsSync('.env.local')) {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        const env: Record<string, string> = {};
        envContent.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
                env[key] = value;
            }
        });

        const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || '';
        const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'] || '';
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log("Supabase Client Initialized.");

        // Find all condominiums
        const { data: condos } = await supabase
            .from('condominiums')
            .select('*');
        console.log("All Condos in DB:", condos?.map(c => ({ id: c.id, name: c.name, orgId: c.organization_id })));

        // Find the condo with name NOH1BEC 1
        const targetCondo = condos?.find(c => c.name.includes("NOH1BEC"));
        if (targetCondo) {
            console.log("Found NOH1BEC condo:", targetCondo);

            // Let's see organization_users for this organization
            const { data: orgUsers } = await supabase
                .from('organization_users')
                .select('*')
                .eq('organization_id', targetCondo.organization_id);
            console.log("Organization users for this condo's org:", orgUsers);

            // Let's count units, residents, resident_invoices for this condo
            const { count: unitsCount } = await supabase
                .from('units')
                .select('*', { count: 'exact', head: true })
                .eq('condominium_id', targetCondo.id);
            
            const { count: residentsCount } = await supabase
                .from('residents')
                .select('*', { count: 'exact', head: true })
                .eq('condominium_id', targetCondo.id);

            const { data: invoices } = await supabase
                .from('resident_invoices')
                .select('*')
                .eq('condominium_id', targetCondo.id);

            const { count: activeResidents } = await supabase
                .from('residents')
                .select('*', { count: 'exact', head: true })
                .eq('condominium_id', targetCondo.id)
                .eq('status', 'active');

            const { count: occupiedUnits } = await supabase
                .from('residents')
                .select('unit_id', { count: 'exact', head: true })
                .eq('condominium_id', targetCondo.id)
                .eq('status', 'active')
                .not('unit_id', 'is', null);

            console.log(`Condo ${targetCondo.name} (${targetCondo.id}):`);
            console.log(` - Units total: ${unitsCount}`);
            console.log(` - Residents total: ${residentsCount}`);
            console.log(` - Active Residents: ${activeResidents}`);
            console.log(` - Occupied Units (active residents with unit): ${occupiedUnits}`);
            console.log(` - Invoices: ${invoices?.length || 0}`);

            // Let's inspect RPC return values for this user
            if (orgUsers && orgUsers.length > 0) {
                const userId = orgUsers[0].user_id;
                console.log("Simulating RPCs for user:", userId);

                // Wait, we can't run supabase.rpc using service role with auth.uid() because auth.uid() returns null for service role.
                // But we can check what the RPC queries would return when executed with auth.uid() = userId
                const { data: rpcUnits } = await supabase
                    .from('units')
                    .select('id')
                    .eq('condominium_id', targetCondo.id);

                console.log("Total units count in units table:", rpcUnits?.length);
            }
        }
    }
}

test();
