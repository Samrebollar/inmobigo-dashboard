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
    const orgId = 'cc123967-5f96-4d4e-acfa-0b4eb889b570'

    console.log('--- FETCH INVOICES ---')
    const { data: invoices } = await supabase
        .from('resident_invoices')
        .select(`
            *,
            condominium_id,
            resident_id,
            condominiums (name),
            residents (
                first_name,
                last_name,
                unit_id,
                units (unit_number, condominium_id)
            )
        `)
        .eq('condominium_id', condoId)
    
    console.log('Total invoices fetched:', invoices.length)

    console.log('--- FETCH UNITS ---')
    const { data: units } = await supabase
        .from('units')
        .select('id, condominium_id, unit_number, monto_mensual, payment_deadline')
        .eq('condominium_id', condoId)

    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const todayDay = now.getDate()

    console.log('currentMonth:', currentMonth, 'currentYear:', currentYear, 'todayDay:', todayDay)

    const expectedMonthly = (units || []).reduce((sum, u) => sum + (Number(u.monto_mensual) || 0), 0)
    console.log('expectedMonthly:', expectedMonthly)

    const unitPaidMap = {}
    ;(invoices || []).forEach((inv) => {
        const invDate = new Date(inv.created_at)
        if (inv.status === 'paid' && invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear) {
            const unitId = inv.residents?.unit_id
            if (unitId) {
                unitPaidMap[unitId] = (unitPaidMap[unitId] || 0) + inv.amount
            }
        }
    })

    const condoData = {}
    ;(units || []).forEach((u) => {
        const cId = u.condominium_id || 'org_total'
        if (!condoData[cId]) condoData[cId] = { expected: 0, collected: 0, currentMonthMorosidad: 0, historicalMorosidad: 0, overdueUnits: 0, unitCount: 0 }

        const quota = Number(u.monto_mensual) || 0
        const paidThisMonth = unitPaidMap[u.id] || 0
        condoData[cId].expected += quota
        condoData[cId].collected += paidThisMonth
        condoData[cId].unitCount += 1

        if (todayDay > (u.payment_deadline || 10) && paidThisMonth < quota) {
            condoData[cId].currentMonthMorosidad += (quota - paidThisMonth)
            condoData[cId].overdueUnits += 1
        }
    })

    ;(invoices || []).forEach((inv) => {
        const cId = inv.condominium_id || 'org_total'
        if (!condoData[cId]) condoData[cId] = { expected: 0, collected: 0, currentMonthMorosidad: 0, historicalMorosidad: 0, overdueUnits: 0, unitCount: 0 }

        const invDate = new Date(inv.created_at)
        const isHistorical = (invDate.getFullYear() < currentYear) ||
            (invDate.getFullYear() === currentYear && invDate.getMonth() < currentMonth)

        if ((inv.status === 'overdue' || inv.status === 'pending') && isHistorical) {
            condoData[cId].historicalMorosidad += (inv.balance_due ?? inv.amount)
            console.log('Historical unpaid invoice:', inv.id, 'due_date:', inv.due_date, 'created_at:', inv.created_at, 'amount:', inv.amount, 'balance_due:', inv.balance_due)
        } else if (inv.status === 'overdue' || inv.status === 'pending') {
            console.log('Current/Future unpaid invoice:', inv.id, 'due_date:', inv.due_date, 'created_at:', inv.created_at, 'amount:', inv.amount, 'balance_due:', inv.balance_due)
        }
    })

    console.log('condoData for Zacil:', condoData[condoId])
}

test().catch(console.error)
