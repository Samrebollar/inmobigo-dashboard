import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

const condoId = '83ebf549-c241-4000-bbe8-3d53f818f008' // Zacil

async function run() {
    const selectedPeriod = {
        month: 4, // Mayo (0-indexed 4)
        year: 2026
    }

    let totalPeriodo = 0
    let recaudado = 0
    let porCobrar = 0
    let vencido = 0

    // Fetch expected monthly income (totalPeriodo) from units (active only)
    const { data: unitsData, error: unitsError } = await supabase
        .from('units')
        .select('monto_mensual')
        .eq('condominium_id', condoId)
        .neq('billing_status', 'suspended')
    
    if (unitsError) throw unitsError
    totalPeriodo = unitsData?.reduce((acc, u) => acc + Number(u.monto_mensual || 0), 0) || 0
    console.log('Total esperado (totalPeriodo):', totalPeriodo)

    // Fetch invoices of selected month (all types to capture manual payments)
    const startOfPeriod = new Date(selectedPeriod.year, selectedPeriod.month, 1).toISOString()
    const endOfPeriod = new Date(selectedPeriod.year, selectedPeriod.month + 1, 0, 23, 59, 59).toISOString()
    
    console.log('Query date range:', startOfPeriod, 'to', endOfPeriod)

    const { data: invoices, error: invoiceError } = await supabase
        .from('resident_invoices')
        .select('id, amount, balance_due, status, resident_id, invoice_type, created_at')
        .eq('condominium_id', condoId)
        .gte('created_at', startOfPeriod)
        .lte('created_at', endOfPeriod)

    if (invoiceError) throw invoiceError

    console.log('\nQueried invoices count:', invoices?.length)
    invoices?.forEach(inv => {
        const amt = Number(inv.amount || 0)
        const bal = Number(inv.balance_due || 0)
        const paid = Math.max(0, amt - bal)
        
        console.log(`Invoice ${inv.id.substring(0, 8)} | Type: ${inv.invoice_type} | Status: ${inv.status} | Amt: ${amt} | Bal: ${bal} | Paid: ${paid} | CreatedAt: ${inv.created_at}`)
        
        // Recaudado includes all payments made in this month across any invoice type
        recaudado += paid
        
        if (inv.invoice_type === 'maintenance') {
            if (inv.status === 'pending') {
                porCobrar += bal
            }
        }
    })

    // La fórmula correcta es: morosidad_mes = total_periodo - recaudado - pendiente
    vencido = Math.max(0, totalPeriodo - recaudado - porCobrar)

    console.log('\nCalculated KPIs:')
    console.log('Recaudado:', recaudado)
    console.log('Pendiente:', porCobrar)
    console.log('Morosidad (vencido):', vencido)
}

run()
