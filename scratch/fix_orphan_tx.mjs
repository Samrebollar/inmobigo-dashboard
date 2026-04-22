import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://djxllvplxdigosbhhicn.supabase.co"
const supabaseServiceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRqeGxsdnBseGRpZ29zYmhoaWNuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDIzODMwMywiZXhwIjoyMDg1ODE0MzAzfQ.W8sB7_M_2smipPtbXcADjArL1s_tCigha09h3S8Xrzg"

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function cleanup() {
    const txId = '05202e20-90a7-4dd8-9fbf-2f0156b6d6ff'
    
    // 1. Get transaction info
    const { data: tx } = await supabase
        .from('reserve_fund_transactions')
        .select('*')
        .eq('id', txId)
        .single()
    
    if (!tx) {
        console.log('Transaction already gone.')
        return
    }

    // 2. Delete transaction
    await supabase.from('reserve_fund_transactions').delete().eq('id', txId)
    console.log('Deleted transaction.')

    // 3. Restore balance
    const { data: fund } = await supabase
        .from('reserve_fund')
        .select('balance')
        .eq('id', tx.fund_id)
        .single()
    
    const newBalance = Number(fund.balance) + 30000
    await supabase.from('reserve_fund').update({ balance: newBalance }).eq('id', tx.fund_id)
    console.log(`Balance restored to ${newBalance}`)
}

cleanup()
