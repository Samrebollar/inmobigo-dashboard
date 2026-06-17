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

export function getLocalDateParts(dateStr) {
    if (!dateStr) return null
    if (dateStr instanceof Date) {
        return {
            year: dateStr.getFullYear(),
            month: dateStr.getMonth(),
            day: dateStr.getDate()
        }
    }
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
        const [_, y, m, d] = match
        return {
            year: parseInt(y),
            month: parseInt(m) - 1,
            day: parseInt(d)
        }
    }
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.includes(':')) {
        return {
            year: d.getUTCFullYear(),
            month: d.getUTCMonth(),
            day: d.getUTCDate()
        }
    }
    return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate()
    }
}

export function calculateCondoMonthlyFinancials({
    units,
    residents,
    invoices,
    selectedMonth,
    selectedYear = new Date().getFullYear()
}) {
    const today = new Date()

    let firstMonth = 0
    let lastMonth = 11

    if (selectedMonth !== -1) {
        firstMonth = selectedMonth
        lastMonth = selectedMonth
    } else {
        const condoInvoicesInYear = invoices.filter(inv => {
            const dateStr = inv.due_date || inv.created_at
            if (!dateStr) return false
            const parts = getLocalDateParts(dateStr)
            return parts && parts.year === selectedYear
        })

        if (condoInvoicesInYear.length > 0) {
            const months = condoInvoicesInYear.map(inv => {
                const parts = getLocalDateParts(inv.due_date || inv.created_at)
                return parts ? parts.month : 0
            })
            firstMonth = Math.min(...months)
        }

        if (selectedYear === today.getFullYear()) {
            lastMonth = today.getMonth()
        } else if (selectedYear < today.getFullYear()) {
            lastMonth = 11
        } else {
            lastMonth = -1
        }
    }

    const numMonths = (lastMonth >= firstMonth) ? (lastMonth - firstMonth + 1) : 0

    let expectedMonthlyIncome = 0
    units.forEach(u => {
        if (u.facturacion_activa === false) return
        expectedMonthlyIncome += Number(u.monto_mensual || 0)
    })

    let porCobrar = 0
    let vencido = 0
    const debtorResidents = new Set()

    const maintenanceInvoices = invoices.filter(inv => inv.invoice_type === 'maintenance')
    const filteredInvoices = maintenanceInvoices.filter(inv => {
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = getLocalDateParts(dateStr)
        if (!parts) return false
        if (parts.year !== selectedYear) return false
        return parts.month >= firstMonth && parts.month <= lastMonth
    })

    filteredInvoices.forEach(inv => {
        const bal = Number(inv.balance_due || 0)
        if (bal <= 0) return

        const invDateStr = inv.due_date || inv.created_at
        const parts = getLocalDateParts(invDateStr)
        const invMonth = parts ? parts.month : selectedMonth
        const invYear  = parts ? parts.year : selectedYear

        const isPastPeriod = invYear < today.getFullYear() ||
            (invYear === today.getFullYear() && invMonth < today.getMonth())
        const isCurrentPeriod = invYear === today.getFullYear() && invMonth === today.getMonth()
        const isInOverduePeriod = isPastPeriod || (isCurrentPeriod && today.getDate() > 10)

        const effectiveStatus = (inv.status === 'pending' && isInOverduePeriod) ? 'overdue' : inv.status

        if (effectiveStatus === 'pending') {
            porCobrar += bal
        } else if (effectiveStatus === 'overdue') {
            vencido += bal
            if (inv.resident_id) {
                debtorResidents.add(inv.resident_id)
            }
        }
    })

    const paidInvoicesForPeriod = invoices.filter(inv => {
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = getLocalDateParts(dateStr)
        if (!parts) return false
        if (parts.year !== selectedYear) return false
        return parts.month >= firstMonth && parts.month <= lastMonth
    })

    const recaudado = paidInvoicesForPeriod.reduce(
        (sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)),
        0
    )

    const totalPeriodo = recaudado + porCobrar + vencido

    return {
        firstMonth,
        lastMonth,
        numMonths,
        totalPeriodo,
        recaudado,
        porCobrar,
        vencido,
        morososCount: debtorResidents.size
    }
}

async function test() {
    const condoId = '83ebf549-c241-4000-bbe8-3d53f818f008'
    const { data: units } = await supabase.from('units').select('*').eq('condominium_id', condoId)
    const { data: residents } = await supabase.from('residents').select('*').eq('condominium_id', condoId)
    const { data: invoices } = await supabase.from('resident_invoices').select('*').eq('condominium_id', condoId)

    console.log('Testing with selectedMonth = -1 (All Months)')
    const resAll = calculateCondoMonthlyFinancials({
        units,
        residents,
        invoices,
        selectedMonth: -1,
        selectedYear: 2026
    })
    console.log(resAll)

    console.log('Testing with selectedMonth = 5 (June)')
    const resJune = calculateCondoMonthlyFinancials({
        units,
        residents,
        invoices,
        selectedMonth: 5,
        selectedYear: 2026
    })
    console.log(resJune)
}

test().catch(console.error)
