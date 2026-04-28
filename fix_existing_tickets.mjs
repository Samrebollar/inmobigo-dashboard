import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log("Looking for Clara Licona's resident profile...")
    const { data: residents, error: resError } = await supabase
        .from('residents')
        .select('id, first_name, last_name')
    
    if (resError) {
        console.error("Error fetching residents:", resError)
        return
    }

    const clara = residents.find(r => 
        (r.first_name?.toLowerCase().includes('clara')) || 
        (r.last_name?.toLowerCase().includes('licona'))
    )

    const targetId = clara ? clara.id : residents[0]?.id

    if (!targetId) {
        console.error("No resident profiles found in the database.")
        return
    }

    console.log(`Assigning all unlinked tickets to resident ID: ${targetId} (${clara ? clara.first_name : 'Default Resident'})`)

    const { data: updatedTickets, error: updateError } = await supabase
        .from('tickets')
        .update({ resident_id: targetId })
        .is('resident_id', null)
        .select()

    if (updateError) {
        console.error("Error updating tickets:", updateError)
    } else {
        console.log(`Success! Linked ${updatedTickets.length} unlinked reports to resident.`);
    }
}

run()
