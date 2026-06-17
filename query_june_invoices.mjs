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

async function queryInvoices() {
    console.log('Querying invoices...')
    const { data: invoices, error } = await supabase
        .from('resident_invoices')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching invoices:', error)
        return
    }

    console.log(`Found ${invoices.length} invoices:`)
    invoices.forEach(inv => {
        console.log({
            id: inv.id,
            condominium_id: inv.condominium_id,
            resident_id: inv.resident_id,
            amount: inv.amount,
            balance_due: inv.balance_due,
            status: inv.status,
            due_date: inv.due_date,
            period_start: inv.period_start,
            created_at: inv.created_at,
            invoice_type: inv.invoice_type,
            description: inv.description
        })
    })
}

queryInvoices().catch(console.error)
