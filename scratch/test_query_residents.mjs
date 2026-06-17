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
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    console.log('Current local Month:', currentMonth, 'Year:', currentYear)

    // 1. Fetch units
    const { data: unitsData } = await supabase
        .from('units')
        .select('id, monto_mensual, facturacion_activa, unit_number')
        .eq('condominium_id', condoId)
        .neq('billing_status', 'suspended')

    // 2. Fetch residents
    const { data: residentsData } = await supabase
        .from('residents')
        .select('id, unit_id, first_name, last_name, fecha_ingreso, status')
        .eq('condominium_id', condoId)

    // 3. Fetch resident invoices for the current year
    const yearStart = new Date(currentYear, 0, 1).toISOString().substring(0, 10)
    const yearEnd   = new Date(currentYear, 11, 31).toISOString().substring(0, 10)
    const { data: invoicesData } = await supabase
        .from('resident_invoices')
        .select('id, amount, balance_due, status, resident_id, unit_id, invoice_type, created_at, due_date, paid_at')
        .eq('condominium_id', condoId)
        .gte('due_date', yearStart)
        .lte('due_date', yearEnd)

    const isCurrentMonth = (inv) => {
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = dateStr.split('T')[0].split('-')
        const year = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1
        return year === currentYear && month === currentMonth
    }

    const invoices = invoicesData || []
    const residents = residentsData || []
    const units = unitsData || []

    const residentById   = new Map(residents.map(r => [r.id, r]))
    const residentByUnit = new Map()
    residents.filter(r => r.status === 'active').forEach(r => {
        if (r.unit_id) residentByUnit.set(r.unit_id, r)
    })
    const unitById = new Map(units.map(u => [u.id, u]))

    const currentMonthInvoices = invoices.filter(isCurrentMonth)

    const overdueInvoices = currentMonthInvoices.filter(inv =>
        (inv.status === 'overdue' || inv.status === 'pending') &&
        Number(inv.balance_due || 0) > 0 &&
        inv.invoice_type === 'maintenance'
    )

    console.log('Overdue Invoices count:', overdueInvoices.length)

    const alertsMap = new Map()
    overdueInvoices.forEach(inv => {
        const resident = inv.resident_id
            ? (residentById.get(inv.resident_id) ?? residentByUnit.get(inv.unit_id))
            : residentByUnit.get(inv.unit_id)

        // Modified: fallback to resident.unit_id if inv.unit_id is null
        const unit = unitById.get(inv.unit_id || resident?.unit_id)
        
        console.log('--- invoice ---', inv.id)
        console.log('due_date:', inv.due_date, 'resident_id:', inv.resident_id, 'found resident:', !!resident)
        console.log('inv.unit_id:', inv.unit_id, 'resident.unit_id:', resident?.unit_id, 'found unit:', !!unit)

        const unitNum = resident?.unit_number ?? unit?.unit_number ?? 'S/N'
        const residentName = resident
            ? `${resident.first_name ?? ''} ${resident.last_name ?? ''}`.trim()
            : ''

        if (!residentName) {
            console.log('SKIPPING: no residentName')
            return
        }

        const dueDate    = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at)
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24))
        const timeText   = daysOverdue <= 0 ? 'Mes Actual' : `Hace ${daysOverdue} días`
        const amount     = Number(inv.balance_due || inv.amount || 0)
        const key        = inv.unit_id || resident?.unit_id || inv.id

        const alertItem = {
            id: inv.id,
            title: residentName,
            name: `Unidad ${unitNum}`,
            amount,
            timeText
        }
        console.log('Alert Item:', alertItem)
        
        if (!alertsMap.has(key) || alertsMap.get(key).amount < amount) {
            alertsMap.set(key, alertItem)
        }
    })

    console.log('--- ALERTS MAP VALUES ---')
    console.log(Array.from(alertsMap.values()))
}

test().catch(console.error)
