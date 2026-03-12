
import { createClient } from './src/utils/supabase/server';

async function checkTable() {
    const supabase = await createClient();
    
    console.log('--- Checking tickets table ---');
    const { data: tickets, error: ticketError } = await supabase
        .from('tickets')
        .select('*')
        .limit(1);
    
    if (ticketError) {
        console.error('Error fetching tickets:', ticketError);
    } else {
        console.log('Tickets table exists. First record or empty:', tickets);
    }

    console.log('\n--- Checking organization_users for current session ---');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        console.log('Current User ID:', user.id);
        const { data: orgUser, error: orgError } = await supabase
            .from('organization_users')
            .select('*')
            .eq('user_id', user.id);
        
        if (orgError) {
            console.error('Error fetching orgUser:', orgError);
        } else {
            console.log('OrgUser record:', orgUser);
        }
    } else {
        console.log('No user logged in or auth failed.');
    }
}

checkTable();
