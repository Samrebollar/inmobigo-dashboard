import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log('=== RECONCILING DATABASE INVOICES ===')

    // 1. Reconcile Unit 1 (Clara Licona)
    // Main invoice: f09fc9d3-c65d-4589-bcae-2a218d310296 (amount: 3000)
    // Payments: dbd8d5c3 (manual, 1000) + 87069966 (maintenance, 1000) = 2000
    // Target balance_due: 3000 - 2000 = 1000
    console.log('Reconciling Clara Licona (Unit 1)...')
    const { data: res1, error: err1 } = await supabase
        .from('resident_invoices')
        .update({ balance_due: 1000 })
        .eq('id', 'f09fc9d3-c65d-4589-bcae-2a218d310296')
        .select()
    if (err1) console.error('Error Unit 1:', err1)
    else console.log('Updated Unit 1 Invoice:', res1)

    // 2. Reconcile Unit 2
    // Main invoice: 90fdfc6e-4d38-4d96-95e8-b6171005bd7d (amount: 3000)
    // Payments: f931d985 (maintenance, 2000) = 2000
    // Target balance_due: 3000 - 2000 = 1000
    console.log('Reconciling Unit 2...')
    const { data: res2, error: err2 } = await supabase
        .from('resident_invoices')
        .update({ balance_due: 1000 })
        .eq('id', '90fdfc6e-4d38-4d96-95e8-b6171005bd7d')
        .select()
    if (err2) console.error('Error Unit 2:', err2)
    else console.log('Updated Unit 2 Invoice:', res2)

    console.log('Reconciliation complete!')
}

run()
