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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    const condoId = '83ebf549-c241-4000-bbe8-3d53f818f008'
    const { data: invoices, error: invError } = await supabase
        .from('resident_invoices')
        .select('id, resident_id, unit_id, amount, balance_due, status, due_date')
        .eq('condominium_id', condoId)
        .gte('due_date', '2026-06-01')
        .lte('due_date', '2026-06-30')

    console.log('--- JUNE INVOICES ---')
    console.log(invoices)

    const { data: residents, error: resError } = await supabase
        .from('residents')
        .select('id, first_name, last_name, unit_id')
        .eq('condominium_id', condoId)

    console.log('\n--- RESIDENTS ---')
    console.log(residents)
    
    const { data: units, error: unitError } = await supabase
        .from('units')
        .select('id, unit_number')
        .eq('condominium_id', condoId)

    console.log('\n--- UNITS ---')
    console.log(units)
}

run().catch(console.error)
