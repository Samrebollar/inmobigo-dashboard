import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log('=== PAYMENT VALIDATIONS FOR ZACIL ===')
    const { data: validations, error } = await supabase
        .from('payment_validations')
        .select('*')
        .eq('condominium_id', '83ebf549-c241-4000-bbe8-3d53f818f008')
        .order('created_at', { ascending: false })
    if (error) console.error(error)
    else {
        validations.forEach(v => {
            console.log(`ID: ${v.id} | Name: ${v.resident_name} | Unit: ${v.unit} | Amt: ${v.amount} | Status: ${v.status} | Date: ${v.date} | Note: ${v.nota} | Created: ${v.created_at}`)
        })
    }
}

run()
