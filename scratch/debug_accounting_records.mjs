import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugAccounting() {
  console.log('--- Condominios ---')
  const { data: condos } = await supabase.from('condominiums').select('id, name')
  console.table(condos)

  console.log('--- Invoices (Ingresos) ---')
  const { data: invoices } = await supabase.from('invoices').select('id, amount, status, condominium_id')
  const invoiceStats = condos.map(c => ({
    name: c.name,
    count: invoices.filter(i => i.condominium_id === c.id).length,
    paid_sum: invoices.filter(i => i.condominium_id === c.id && (i.status === 'pagado' || i.status === 'paid')).reduce((acc, i) => acc + i.amount, 0)
  }))
  console.table(invoiceStats)

  console.log('--- Expenses (Egresos) ---')
  const { data: expenses } = await supabase.from('condo_expenses').select('id, amount, condominium_id')
  const expenseStats = condos.map(c => ({
    name: c.name,
    count: expenses.filter(e => e.condominium_id === c.id).length,
    sum: expenses.filter(e => e.condominium_id === c.id).reduce((acc, e) => acc + e.amount, 0)
  }))
  console.table(expenseStats)

  console.log('--- Records with NULL condominium_id ---')
  console.log('Invoices:', invoices.filter(i => !i.condominium_id).length)
  console.log('Expenses:', expenses.filter(e => !e.condominium_id).length)
}

debugAccounting()
