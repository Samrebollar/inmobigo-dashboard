const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://djxllvplxdigosbhhicn.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: condos } = await supabase.from('condominiums').select('*')
  console.log('CONDOMINIOS found:', condos.length)
  condos.forEach(c => console.log(`- ${c.name} (ID: ${c.id})`))

  const { data: invoices } = await supabase.from('invoices').select('id, amount, status, condominium_id')
  console.log('\nINVOICES found:', invoices.length)
  invoices.forEach(i => {
    const condo = condos.find(c => c.id === i.condominium_id)
    console.log(`- ${i.id}: $${i.amount} [${i.status}] -> ${condo ? condo.name : 'N/A'}`)
  })

  const { data: expenses } = await supabase.from('condo_expenses').select('id, amount, condominium_id')
  console.log('\nEXPENSES found:', expenses.length)
  expenses.forEach(e => {
    const condo = condos.find(c => c.id === e.condominium_id)
    console.log(`- ${e.id}: $${e.amount} -> ${condo ? condo.name : 'N/A'}`)
  })
}

run()
