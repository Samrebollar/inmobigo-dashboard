import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
    console.log('=== CONDOMINIUMS ===')
    const { data: condos, error: errC } = await supabase
        .from('condominiums')
        .select('id, name')
    if (errC) console.error(errC)
    else console.log(condos)

    for (const condo of condos || []) {
        console.log(`\n=== CONDO: ${condo.name} (${condo.id}) ===`)
        
        console.log('--- UNITS ---')
        const { data: units, error: errU } = await supabase
            .from('units')
            .select('id, unit_number, monto_mensual, billing_status')
            .eq('condominium_id', condo.id)
        if (errU) console.error(errU)
        else {
            console.log(units)
            const activeSum = (units || [])
                .filter(u => u.billing_status !== 'suspended')
                .reduce((sum, u) => sum + Number(u.monto_mensual || 0), 0)
            console.log('Active units sum:', activeSum)
        }

        console.log('--- RESIDENT INVOICES ---')
        const { data: invoices, error: errI } = await supabase
            .from('resident_invoices')
            .select('id, resident_id, invoice_type, status, amount, balance_due, created_at, due_date, description')
            .eq('condominium_id', condo.id)
            .order('created_at', { ascending: true })
        if (errI) console.error(errI)
        else {
            console.log(invoices)
        }
    }
}

run()
