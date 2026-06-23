import { Resident } from '@/types/residents'
import { ResidentInvoice } from '@/types/finance'

/**
 * Safely parses a date string or Date object to local parts (year, month, day) without timezone shifts.
 */
export function getLocalDateParts(dateStr: string | Date | null | undefined): { year: number, month: number, day: number } | null {
    if (!dateStr) return null
    if (dateStr instanceof Date) {
        return {
            year: dateStr.getFullYear(),
            month: dateStr.getMonth(), // 0-indexed
            day: dateStr.getDate()
        }
    }
    
    // Match YYYY-MM-DD
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (match) {
        const [_, y, m, d] = match
        return {
            year: parseInt(y),
            month: parseInt(m) - 1, // Convert to 0-indexed
            day: parseInt(d)
        }
    }
    
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    
    // If it's a date-only string without T or :, extract UTC parts to avoid local timezone shifts
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

/**
 * Safely formats a date string or Date object to DD/MM/YY or DD/MM/YYYY without timezone shifts.
 */
export function formatLocalDate(dateStr: string | Date | null | undefined, formatType: 'short' | 'full' = 'short'): string {
    if (!dateStr) return 'S/N'
    
    const parts = getLocalDateParts(dateStr)
    if (!parts) return 'S/N'
    
    const day = String(parts.day).padStart(2, '0')
    const month = String(parts.month + 1).padStart(2, '0')
    const year = String(parts.year)
    const yr = formatType === 'short' ? year.substring(2) : year
    return `${day}/${month}/${yr}`
}

export interface ResidentFinancials {
    cuotaMensual: number
    totalPaid: number
    totalPending: number
    overdueCount: number
    overdueAmount: number
    maxDaysOverdue: number
    creditBalance: number
    activeMonthlyFee: number
    filteredInvoices: any[]
}

export interface CondoFinancials {
    totalPeriodo: number
    recaudado: number
    porCobrar: number
    vencido: number
    morososCount: number
}

/**
 * Helper to check if billing is active for a resident in a given month.
 */
export function isBillingActiveForPeriod(resident: any, periodDate: Date): boolean {
    if (!resident) return false
    if (resident.status !== 'active') return false
    if (resident.facturacion_activa === false) return false
    const fechaIngresoStr = resident.fecha_ingreso || resident.created_at
    if (!fechaIngresoStr) return true
    const fechaIngreso = new Date(fechaIngresoStr)
    return fechaIngreso <= periodDate
}

/**
 * Calculates resident monthly financials for a selected month/year.
 */
export function calculateResidentMonthlyFinancials({
    resident,
    invoices,
    selectedMonth, // 'all' or '0'-'11'
    selectedYear = new Date().getFullYear(),
    monthlyFee
}: {
    resident: any
    invoices: any[]
    selectedMonth: string
    selectedYear?: number
    monthlyFee: number
}): ResidentFinancials {
    const today = new Date()
    const currentMonthIndex = today.getMonth()
    const currentYear = today.getFullYear()

    // 1. Check if resident is active and billing is active
    const isBillingActive = resident?.status === 'active' && resident?.facturacion_activa !== false

    if (!isBillingActive) {
        return {
            cuotaMensual: 0,
            totalPaid: 0,
            totalPending: 0,
            overdueCount: 0,
            overdueAmount: 0,
            maxDaysOverdue: 0,
            creditBalance: 0,
            activeMonthlyFee: 0,
            filteredInvoices: []
        }
    }

    const startDateStr = resident.fecha_ingreso || resident.created_at
    const startDate = startDateStr ? new Date(startDateStr) : null

    // Determine first billing month
    let firstBillingMonth = 0
    if (startDate) {
        const startYear = startDate.getFullYear()
        if (startYear === selectedYear) {
            firstBillingMonth = startDate.getMonth()
        } else if (startYear > selectedYear) {
            // Not started billing in this selected year yet
            return {
                cuotaMensual: 0,
                totalPaid: 0,
                totalPending: 0,
                overdueCount: 0,
                overdueAmount: 0,
                maxDaysOverdue: 0,
                creditBalance: 0,
                activeMonthlyFee: 0,
                filteredInvoices: []
            }
        } else {
            firstBillingMonth = 0
        }
    }

    const monthNum = selectedMonth === 'all' ? -1 : parseInt(selectedMonth)

    // Filter invoices belonging to operational maintenance dues for selected year and month
    const maintenanceInvoices = invoices.filter(inv => inv.invoice_type === 'maintenance')
    
    const kpiInvoices = maintenanceInvoices.filter(inv => {
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = getLocalDateParts(dateStr)
        if (!parts) return false
        if (parts.year !== selectedYear) return false
        if (monthNum !== -1) {
            return parts.month === monthNum
        }
        return true
    })

    // Calculate annual target based on active billing months up to today
    let lastActiveMonthInSelectedYear = 11
    if (selectedYear === currentYear) {
        lastActiveMonthInSelectedYear = currentMonthIndex
    } else if (selectedYear > currentYear) {
        lastActiveMonthInSelectedYear = -1
    }

    const activeMonthsInYear = lastActiveMonthInSelectedYear >= firstBillingMonth 
        ? (lastActiveMonthInSelectedYear - firstBillingMonth + 1) 
        : 0

    const annualFeeTarget = monthlyFee * activeMonthsInYear

    // Guard: if looking at a single month prior to ingress month, return 0s
    if (monthNum !== -1 && monthNum < firstBillingMonth) {
        return {
            cuotaMensual: 0,
            totalPaid: 0,
            totalPending: 0,
            overdueCount: 0,
            overdueAmount: 0,
            maxDaysOverdue: 0,
            creditBalance: 0,
            activeMonthlyFee: 0,
            filteredInvoices: []
        }
    }

    // Map all database invoices to their standardized shape first
    const mappedDbInvoices = invoices.filter(inv => {
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = getLocalDateParts(dateStr)
        if (!parts) return false
        if (parts.year !== selectedYear) return false
        if (monthNum !== -1) {
            return parts.month === monthNum
        }
        return true
    }).map(inv => {
        const isPaid = inv.status === 'paid'
        const paidAmt = Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0))
        
        // Correct visual amount mapping based on user rule:
        // Overdue or pending: display balance_due
        // Fully paid or partially paid: display amount - balance_due as paid amount
        const monto = isPaid 
            ? (Number(inv.amount) - Number(inv.balance_due || 0)) 
            : (inv.balance_due ?? inv.amount)

        const folio = inv.folio || (inv.id ? `FAC-${inv.id.substring(0, 8).toUpperCase()}` : '')

        return {
            ...inv,
            folio,
            monto,
            paid_amount: paidAmt
        }
    })

    const virtualInvoices: any[] = []
    
    // Determine the range of months to inspect
    const monthsToInspect: number[] = []
    if (selectedMonth === 'all') {
        for (let m = firstBillingMonth; m <= lastActiveMonthInSelectedYear; m++) {
            monthsToInspect.push(m)
        }
    } else {
        if (monthNum >= firstBillingMonth && monthNum <= lastActiveMonthInSelectedYear) {
            monthsToInspect.push(monthNum)
        }
    }

    // Loop through each month and check if a virtual overdue row is needed
    for (const m of monthsToInspect) {
        // Find all invoices in DB belonging to this month 'm'
        const dbInvoicesInMonth = invoices.filter(inv => {
            const dateStr = inv.due_date || inv.created_at
            if (!dateStr) return false
            const parts = getLocalDateParts(dateStr)
            if (!parts) return false
            return parts.year === selectedYear && parts.month === m
        })

        // Calculate total paid in this month
        const totalPaidInMonth = dbInvoicesInMonth
            .filter(inv => inv.status === 'paid' || inv.invoice_type === 'manual_payment')
            .reduce((sum, inv) => sum + (Number(inv.amount || 0) - Number(inv.balance_due || 0)), 0)

        // Calculate sum of balance_due of existing overdue/pending maintenance invoices in this month
        const sumBalanceDueInMonth = dbInvoicesInMonth
            .filter(inv => inv.invoice_type === 'maintenance' && (inv.status === 'overdue' || inv.status === 'pending'))
            .reduce((sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0), 0)

        // The target is monthlyFee
        const projectedResidual = Math.max(0, monthlyFee - totalPaidInMonth - sumBalanceDueInMonth)

        if (projectedResidual > 0) {
            // Find if there is an existing maintenance invoice in the month that we can copy properties from
            const originalMaintenance = dbInvoicesInMonth.find(inv => inv.invoice_type === 'maintenance')

            // Construct virtual overdue row
            const virtualId = `virtual-overdue-${originalMaintenance?.id || `${selectedYear}-${m}`}`
            const virtualFolio = originalMaintenance?.folio 
                ? `${originalMaintenance.folio}-RESID` 
                : `INV-VENC-${selectedYear}-${String(m + 1).padStart(2, '0')}`
            const virtualDescription = originalMaintenance?.description 
                ? `${originalMaintenance.description} (Saldo Restante Vencido)`
                : `Cuota de Mantenimiento Vencida`

            // Create a default date for the 10th of that month (or today if it's the current month and today is before the 10th)
            const yearStr = String(selectedYear)
            const monthStr = String(m + 1).padStart(2, '0')
            const dateDay = (m === currentMonthIndex && selectedYear === currentYear) 
                ? Math.min(10, today.getDate()) 
                : 10
            const isoDate = `${yearStr}-${monthStr}-${String(dateDay).padStart(2, '0')}T12:00:00.000Z`

            const virtualRow = {
                id: virtualId,
                condominium_id: resident.condominium_id || originalMaintenance?.condominium_id || null,
                subscription_id: null,
                amount: projectedResidual,
                currency: 'MXN',
                status: 'overdue',
                due_date: originalMaintenance?.due_date || isoDate.substring(0, 10),
                paid_at: null,
                payment_provider: null,
                external_payment_id: null,
                period_start: originalMaintenance?.period_start || null,
                period_end: originalMaintenance?.period_end || null,
                created_at: originalMaintenance?.created_at || isoDate,
                updated_at: originalMaintenance?.updated_at || isoDate,
                paid_amount: 0,
                invoice_type: 'maintenance',
                balance_due: projectedResidual,
                closed_at: null,
                external_invoice_id: null,
                payment_link: null,
                organization_id: resident.organization_id || originalMaintenance?.organization_id || null,
                unit_id: resident.unit_id || originalMaintenance?.unit_id || null,
                description: virtualDescription,
                folio: virtualFolio,
                reminder_sent: false,
                user_id: null,
                resident_id: resident.id,
                last_reminder_sent: null,
                last_morosity_sent: null,
                recargo_aplicado: false,
                payment_method: null,
                invoice_scope: 'resident',
                monto: projectedResidual
            }

            virtualInvoices.push(virtualRow)
        }
    }

    const filteredInvoices = [...mappedDbInvoices, ...virtualInvoices].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    if (selectedMonth === 'all') {
        // totalPaid = ALL real paid invoices in period (maintenance + manual_payment + any type)
        // Use due_date as the primary date for month/year assignment (same logic as the table filter)
        const allPaidInvoicesForYear = invoices.filter(inv => {
            if (inv.status !== 'paid') return false
            const dateStr = inv.due_date || inv.created_at
            if (!dateStr) return false
            const parts = getLocalDateParts(dateStr)
            if (!parts) return false
            return parts.year === selectedYear
        })
        const totalPaid = allPaidInvoicesForYear
            .reduce((sum, inv) => sum + (Number(inv.amount || 0) - Number(inv.balance_due || 0)), 0)

        const pendingSum = kpiInvoices
            .filter(inv => inv.status === 'pending')
            .reduce((sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0), 0)

        const overdueSum = kpiInvoices
            .filter(inv => inv.status === 'overdue')
            .reduce((sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0), 0)

        const overdueInvoices = kpiInvoices.filter(inv => inv.status === 'overdue')
        let maxDays = 0
        if (overdueInvoices.length > 0) {
            const oldest = overdueInvoices.reduce((prev, curr) =>
                new Date(prev.due_date) < new Date(curr.due_date) ? prev : curr
            )
            const diffTime = today.getTime() - new Date(oldest.due_date).getTime()
            maxDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
        }

        const creditBalance = annualFeeTarget > 0 ? Math.max(0, totalPaid - annualFeeTarget) : 0
        const annualFeeGap = Math.max(0, annualFeeTarget - totalPaid)
        const isOverduePeriod = today.getDate() > 10

        let pendingGap = 0
        let overdueGap = 0

        if (isOverduePeriod) {
            overdueGap = annualFeeGap
        } else {
            pendingGap = Math.min(annualFeeGap, monthlyFee)
            overdueGap = Math.max(0, annualFeeGap - pendingGap)
        }

        const totalPending = pendingGap + pendingSum
        const overdueAmount = overdueGap + overdueSum
        const overdueCount = overdueInvoices.length > 0
            ? overdueInvoices.length
            : (overdueAmount > 0 ? Math.ceil(overdueAmount / (monthlyFee || 3000)) : 0)

        return {
            cuotaMensual: annualFeeTarget,
            totalPaid,
            totalPending,
            overdueCount,
            overdueAmount,
            maxDaysOverdue: maxDays,
            creditBalance,
            activeMonthlyFee: monthlyFee,
            filteredInvoices
        }
    }

    // Single Month calculations
    const isPastMonth = selectedYear < currentYear || (selectedYear === currentYear && monthNum < currentMonthIndex)
    const isCurrentMonth = selectedYear === currentYear && monthNum === currentMonthIndex
    const isFutureMonth = selectedYear > currentYear || (selectedYear === currentYear && monthNum > currentMonthIndex)

    const isOverduePeriod = isPastMonth || (isCurrentMonth && today.getDate() > 10)

    // totalPaid = ALL real paid invoices for this month (maintenance + manual_payment + any type)
    // Use due_date as the primary date for month/year assignment (same logic as the table filter)
    const allPaidInvoicesForMonth = invoices.filter(inv => {
        if (inv.status !== 'paid') return false
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = getLocalDateParts(dateStr)
        if (!parts) return false
        return parts.year === selectedYear && parts.month === monthNum
    })
    const totalPaid = allPaidInvoicesForMonth
        .reduce((sum, inv) => sum + (Number(inv.amount || 0) - Number(inv.balance_due || 0)), 0)

    const explicitDebtThisMonth = kpiInvoices
        .filter(inv => inv.status === 'overdue' || inv.status === 'pending')
        .reduce((sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0), 0)

    const feeGapForMonth = Math.max(0, monthlyFee - totalPaid)
    const monthlyDebt = Math.max(feeGapForMonth, explicitDebtThisMonth)

    const overdueInvoicesThisMonth = kpiInvoices.filter(inv => inv.status === 'overdue')
    let maxDays = 0
    if (overdueInvoicesThisMonth.length > 0) {
        const oldest = overdueInvoicesThisMonth.reduce((prev, curr) =>
            new Date(prev.due_date) < new Date(curr.due_date) ? prev : curr
        )
        const diffTime = today.getTime() - new Date(oldest.due_date).getTime()
        maxDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))
    }

    const creditBalance = totalPaid > monthlyFee ? totalPaid - monthlyFee : 0

    return {
        cuotaMensual: monthlyFee,
        totalPaid,
        totalPending: isOverduePeriod ? 0 : (isFutureMonth ? 0 : monthlyDebt),
        overdueCount: overdueInvoicesThisMonth.length > 0
            ? overdueInvoicesThisMonth.length
            : ((isOverduePeriod && !isFutureMonth && monthlyDebt > 0) ? Math.ceil(monthlyDebt / (monthlyFee || 3000)) : 0),
        overdueAmount: isOverduePeriod && !isFutureMonth ? monthlyDebt : 0,
        maxDaysOverdue: maxDays,
        creditBalance,
        activeMonthlyFee: monthlyFee,
        filteredInvoices
    }
}

/**
 * Calculates aggregated condo-level financials for a selected month/year.
 */
export function calculateCondoMonthlyFinancials({
    units,
    residents,
    invoices,
    selectedMonth, // -1 for all, 0-11 for months
    selectedYear = new Date().getFullYear()
}: {
    units: any[]
    residents: any[]
    invoices: any[]
    selectedMonth: number
    selectedYear?: number
}): CondoFinancials {
    const today = new Date()

    // Determine the first and last months of the period
    let firstMonth = 0
    let lastMonth = 11

    if (selectedMonth !== -1) {
        firstMonth = selectedMonth
        lastMonth = selectedMonth
    } else {
        // Find the earliest month that has invoices in selectedYear
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

        // Bounded by today's month if it's the current year
        if (selectedYear === today.getFullYear()) {
            lastMonth = today.getMonth()
        } else if (selectedYear < today.getFullYear()) {
            lastMonth = 11
        } else {
            lastMonth = -1 // Future year
        }
    }

    // Number of months in the period
    const numMonths = (lastMonth >= firstMonth) ? (lastMonth - firstMonth + 1) : 0

    // Calculate total expected income for the period:
    // Sum monto_mensual for ALL billing-active units (facturacion_activa !== false) and multiply by numMonths.
    let expectedMonthlyIncome = 0
    units.forEach(u => {
        if (u.facturacion_activa === false) return
        expectedMonthlyIncome += Number(u.monto_mensual || 0)
    })

    let porCobrar = 0
    let vencido = 0
    const debtorResidents = new Set<string>()

    // Filter operational maintenance invoices — use due_date as the billing month reference
    // filter strictly within the [firstMonth, lastMonth] range of selectedYear
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

        // Determine if this billing period is past the payment deadline (day 10).
        // Past months are always overdue. For the current month, check if today > day 10.
        const invDateStr = inv.due_date || inv.created_at
        const parts = getLocalDateParts(invDateStr)
        const invMonth = parts ? parts.month : selectedMonth
        const invYear  = parts ? parts.year : selectedYear

        const isPastPeriod = invYear < today.getFullYear() ||
            (invYear === today.getFullYear() && invMonth < today.getMonth())
        const isCurrentPeriod = invYear === today.getFullYear() && invMonth === today.getMonth()
        const isInOverduePeriod = isPastPeriod || (isCurrentPeriod && today.getDate() > 10)

        // Treat pending as overdue when the payment deadline has passed
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

    // Calculate collected amount (recaudado) — use due_date for month assignment,
    // filter strictly within the [firstMonth, lastMonth] range of selectedYear
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

    const totalPeriodo = expectedMonthlyIncome * numMonths

    return {
        totalPeriodo,
        recaudado,
        porCobrar,
        vencido,
        morososCount: debtorResidents.size
    }
}
