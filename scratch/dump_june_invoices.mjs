import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
    const parts = line.split('=')
    if (parts.length >= 2) {
        const key = parts[0].trim()
        const val = parts.slice(1).join('=').trim()
        env[key] = val
    }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const condoId = '83ebf549-c241-4000-bbe8-3d53f818f008'
    const { data: invoices } = await supabase.from('resident_invoices')
        .select('*')
        .eq('condominium_id', condoId)
        .gte('due_date', '2026-01-01')
        .lte('due_date', '2026-12-31')

    console.log('--- Unpaid Invoices in 2026 ---')
    invoices.filter(inv => Number(inv.balance_due || 0) > 0).forEach(inv => {
        console.log({
            id: inv.id,
            due_date: inv.due_date,
            status: inv.status,
            amount: inv.amount,
            balance_due: inv.balance_due,
            invoice_type: inv.invoice_type
        })
    })
}

test().catch(console.error)
