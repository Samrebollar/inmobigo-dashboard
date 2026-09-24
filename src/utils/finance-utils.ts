import { Resident } from '@/types/residents'
import { ResidentInvoice } from '@/types/finance'

const MESES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

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
    // Saldo inicial / arrastre: morosidad que un residente trae de antes (invoice_type
    // distinto de 'maintenance' — saldo inicial, ajustes manuales, etc.), reportada
    // aparte porque no es una cuota mensual y no debe inflar totalPeriodo/recaudado.
    saldoInicialPendiente: number
    morososCount: number
}

/**
 * Helper to check if billing is active for a resident in a given month.
 */
export function isBillingActiveForPeriod(resident: any, periodDate: Date): boolean {
    if (!resident) return false
    // 'delinquent' (moroso) sigue facturando/generando deuda — solo 'inactive'
    // (residente dado de baja) debe excluirse. Antes solo 'active' calificaba,
    // lo cual escondía del todo a los residentes ya marcados como morosos.
    if (resident.status === 'inactive') return false
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

    const emptyFinancials: ResidentFinancials = {
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

    // Páginas que aún no terminaron de cargar el residente (ej. useMemo que
    // corre antes de que resuelva el fetch) llaman esto con resident=null —
    // sin este guard, `resident?.status !== 'inactive'` da true para null/
    // undefined y sigue de largo hasta un `resident.fecha_ingreso` sin
    // optional chaining más abajo, que sí truena.
    if (!resident) {
        return emptyFinancials
    }

    // Día límite de pago real de la unidad del residente (Propiedades > Unidades >
    // "Fecha límite de cobro"). Antes este cálculo tenía el día 10 fijo en el código
    // para toda la plataforma, ignorando lo que cada unidad configuraba. Se mantiene
    // 10 como default para unidades que nunca configuraron el campo.
    const paymentDeadlineDay = Number(resident.payment_deadline) || 10

    // 1. Check if billing is active. 'delinquent' (moroso) sigue facturando/
    // generando deuda — solo 'inactive' (dado de baja) queda fuera. Antes esto
    // exigía 'active' exactamente, así que un residente ya marcado como moroso
    // desaparecía por completo del reporte de morosidad (devolvía todo en $0).
    const isBillingActive = resident.status !== 'inactive' && resident.facturacion_activa !== false

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

        // Calculate total paid in this month. Se usa amount - balance_due sin filtrar
        // por status: una factura con abono parcial sigue en 'pending' pero ya tiene
        // balance_due reducido, y ese monto abonado debe contar aquí — si solo se
        // contara lo que ya está 'paid', el residuo proyectado más abajo duplicaría
        // el saldo (contaría el abono parcial como si nunca se hubiera hecho).
        const totalPaidInMonth = dbInvoicesInMonth
            .reduce((sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)), 0)

        // Calculate sum of balance_due of existing overdue/pending maintenance invoices in this month
        const sumBalanceDueInMonth = dbInvoicesInMonth
            .filter(inv => inv.invoice_type === 'maintenance' && (inv.status === 'overdue' || inv.status === 'pending'))
            .reduce((sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0), 0)

        // The target is monthlyFee
        const projectedResidual = Math.max(0, monthlyFee - totalPaidInMonth - sumBalanceDueInMonth)

        if (projectedResidual > 0) {
            // Find if there is an existing maintenance invoice in the month that we can copy properties from
            const originalMaintenance = dbInvoicesInMonth.find(inv => inv.invoice_type === 'maintenance')

            // Regla de la fecha límite real de la unidad: meses pasados siempre están
            // vencidos; el mes en curso solo si ya pasó ese día. Antes esta fila
            // virtual se marcaba 'overdue' sin importar el mes, lo cual también
            // inflaba "Morosidad" cuando en realidad era deuda "Pendiente" del mes actual.
            const isPastMonthForVirtual = selectedYear < currentYear || (selectedYear === currentYear && m < currentMonthIndex)
            const isCurrentMonthForVirtual = selectedYear === currentYear && m === currentMonthIndex
            const isVirtualOverdue = isPastMonthForVirtual || (isCurrentMonthForVirtual && today.getDate() > paymentDeadlineDay)

            // Construct virtual overdue row
            const virtualId = `virtual-overdue-${originalMaintenance?.id || `${selectedYear}-${m}`}`
            const virtualFolio = originalMaintenance?.folio 
                ? `${originalMaintenance.folio}-RESID` 
                : `INV-VENC-${selectedYear}-${String(m + 1).padStart(2, '0')}`
            const virtualMonthLabel = `${MESES_ES[m]} ${selectedYear}`
            const virtualDescription = originalMaintenance?.description
                ? `${originalMaintenance.description} (Saldo Restante Vencido)`
                : `Cuota de Mantenimiento ${virtualMonthLabel}`

            // Create a default date for the unit's payment deadline day of that month
            // (or today if it's the current month and today is before the deadline)
            const yearStr = String(selectedYear)
            const monthStr = String(m + 1).padStart(2, '0')
            const lastDayOfM = new Date(selectedYear, m + 1, 0).getDate()
            const clampedDeadlineDay = Math.min(paymentDeadlineDay, lastDayOfM)
            const dateDay = (m === currentMonthIndex && selectedYear === currentYear)
                ? Math.min(clampedDeadlineDay, today.getDate())
                : clampedDeadlineDay
            const isoDate = `${yearStr}-${monthStr}-${String(dateDay).padStart(2, '0')}T12:00:00.000Z`

            const virtualRow = {
                id: virtualId,
                condominium_id: resident.condominium_id || originalMaintenance?.condominium_id || null,
                subscription_id: null,
                amount: projectedResidual,
                currency: 'MXN',
                status: isVirtualOverdue ? 'overdue' : 'pending',
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
        // totalPaid = suma de amount - balance_due de todas las facturas del año, sin
        // filtrar por status: una factura con abono parcial sigue 'pending' pero ya
        // tiene balance_due reducido, y ese abono debe sumar aquí (si solo se contara
        // lo 'paid', el saldo pendiente/vencido de abajo duplicaría el abono parcial).
        // Use due_date as the primary date for month/year assignment (same logic as the table filter)
        const allInvoicesForYear = invoices.filter(inv => {
            const dateStr = inv.due_date || inv.created_at
            if (!dateStr) return false
            const parts = getLocalDateParts(dateStr)
            if (!parts) return false
            return parts.year === selectedYear
        })
        const totalPaid = allInvoicesForYear
            .reduce((sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)), 0)

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

        // La deuda "no cubierta por un recibo real" ya viene resuelta por las
        // filas virtuales de arriba (que, mes por mes, solo proyectan un
        // residuo cuando NO existe ya un recibo para ese mes). Antes, aquí se
        // volvía a calcular un "annualFeeGap" (cuota anual esperada - total
        // pagado) y se sumaba encima de pendingSum/overdueSum — duplicando la
        // misma deuda ya representada por los recibos reales cuando estos sí
        // existen para todos los meses del periodo.
        const virtualPendingSum = virtualInvoices
            .filter(inv => inv.status === 'pending')
            .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0)
        const virtualOverdueSum = virtualInvoices
            .filter(inv => inv.status === 'overdue')
            .reduce((sum, inv) => sum + Number(inv.balance_due || 0), 0)

        const totalPending = pendingSum + virtualPendingSum
        const overdueAmount = overdueSum + virtualOverdueSum
        const overdueCount = overdueInvoices.length + virtualInvoices.filter(inv => inv.status === 'overdue').length

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

    const isOverduePeriod = isPastMonth || (isCurrentMonth && today.getDate() > paymentDeadlineDay)

    // totalPaid = suma de amount - balance_due de todas las facturas del mes, sin
    // filtrar por status (ver comentario equivalente en la rama 'all' de arriba):
    // un abono parcial deja la factura en 'pending' con balance_due reducido, y ese
    // abono debe contar como pagado para no duplicar el saldo pendiente.
    // Use due_date as the primary date for month/year assignment (same logic as the table filter)
    const allInvoicesForMonth = invoices.filter(inv => {
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = getLocalDateParts(dateStr)
        if (!parts) return false
        return parts.year === selectedYear && parts.month === monthNum
    })
    const totalPaid = allInvoicesForMonth
        .reduce((sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)), 0)

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

    // Día límite de pago real por unidad (Propiedades > Unidades > "Fecha límite de
    // cobro"). Antes el cálculo de morosidad de todo el condominio tenía el día 10
    // fijo en el código, ignorando lo que cada unidad configuraba. Se mantiene 10
    // como default para unidades que nunca configuraron el campo.
    const unitDeadlineById = new Map<string, number>(
        units.map(u => [u.id, Number(u.payment_deadline) || 10])
    )
    const getDeadlineDayForUnit = (unitId: string | null | undefined): number =>
        (unitId && unitDeadlineById.get(unitId)) || 10

    let porCobrar = 0
    let vencido = 0
    let saldoInicialPendiente = 0
    const debtorResidents = new Set<string>()

    // Filter operational maintenance invoices — use due_date as the billing month reference
    // filter strictly within the [firstMonth, lastMonth] range of selectedYear
    const maintenanceInvoices = invoices.filter(inv => inv.invoice_type === 'maintenance')

    // "Cuotas mensuales" del periodo: Total del Periodo, Recaudado, Pendiente y Morosidad
    // se calculan TODOS sobre este mismo conjunto (solo invoice_type = 'maintenance'),
    // para que cuadren entre sí como la cobranza real de la cuota recurrente.
    const maintenanceInvoicesForPeriod = maintenanceInvoices.filter(inv => {
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = getLocalDateParts(dateStr)
        if (!parts) return false
        if (parts.year !== selectedYear) return false
        return parts.month >= firstMonth && parts.month <= lastMonth
    })

    // Lo que un residente trae arrastrando de antes (saldo inicial, ajustes manuales, etc. —
    // cualquier invoice_type distinto de 'maintenance'). Es morosidad real del residente,
    // pero no es "cuota mensual": se reporta aparte para no inflar el Total del Periodo con
    // algo que no es una cuota del mes, y para no diluirlo entre todos los residentes.
    const otherInvoicesForPeriod = invoices.filter(inv => {
        if (inv.invoice_type === 'maintenance') return false
        const dateStr = inv.due_date || inv.created_at
        if (!dateStr) return false
        const parts = getLocalDateParts(dateStr)
        if (!parts) return false
        if (parts.year !== selectedYear) return false
        return parts.month >= firstMonth && parts.month <= lastMonth
    })
    otherInvoicesForPeriod.forEach(inv => {
        const bal = Number(inv.balance_due || 0)
        if (bal > 0) {
            saldoInicialPendiente += bal
            if (inv.resident_id) {
                debtorResidents.add(inv.resident_id)
            }
        }
    })

    // Saldo inicial cargado a mano en residents.debt_amount (Propiedades > Residentes,
    // al dar de alta o editar) para quienes NO tengan ya una factura real 'initial_balance'
    // representando esa misma deuda — si ya existe esa factura, se cuenta arriba y sumar
    // también el campo crudo la duplicaría. Antes esta tarjeta solo miraba facturas reales
    // de tipo distinto a 'maintenance', así que un debt_amount cargado a mano (el caso más
    // común: deuda previa capturada al dar de alta al residente, sin generar una factura
    // aparte) nunca aparecía aquí, aunque sí contara como morosidad del residente en su
    // propio panel y en la lista de Residentes.
    const residentsWithInitialBalanceInvoice = new Set(
        invoices
            .filter(inv => inv.invoice_type === 'initial_balance' && Number(inv.balance_due || 0) > 0)
            .map(inv => inv.resident_id)
            .filter(Boolean)
    )
    residents.forEach(r => {
        if (r.status === 'inactive') return
        if (residentsWithInitialBalanceInvoice.has(r.id)) return
        const debtAmount = Number(r.debt_amount || 0)
        if (debtAmount > 0) {
            saldoInicialPendiente += debtAmount
            debtorResidents.add(r.id)
        }
    })

    maintenanceInvoicesForPeriod.forEach(inv => {
        const bal = Number(inv.balance_due || 0)
        if (bal <= 0) return

        // Determine if this billing period is past the payment deadline of the
        // invoice's own unit. Past months are always overdue. For the current
        // month, check if today > the unit's deadline day.
        const invDateStr = inv.due_date || inv.created_at
        const parts = getLocalDateParts(invDateStr)
        const invMonth = parts ? parts.month : selectedMonth
        const invYear  = parts ? parts.year : selectedYear
        const deadlineDay = getDeadlineDayForUnit(inv.unit_id)

        const isPastPeriod = invYear < today.getFullYear() ||
            (invYear === today.getFullYear() && invMonth < today.getMonth())
        const isCurrentPeriod = invYear === today.getFullYear() && invMonth === today.getMonth()
        const isInOverduePeriod = isPastPeriod || (isCurrentPeriod && today.getDate() > deadlineDay)

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

    // Recaudado: suma de la porción pagada (amount - balance_due) de las cuotas mensuales del periodo
    const recaudado = maintenanceInvoicesForPeriod.reduce(
        (sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)),
        0
    )

    // Total del periodo: suma del monto total (amount) de las cuotas mensuales del periodo
    // (pagadas, pendientes y vencidas) — no incluye saldos iniciales/ajustes que no son
    // una cuota del mes.
    const totalPeriodo = maintenanceInvoicesForPeriod.reduce(
        (sum, inv) => sum + Number(inv.amount || 0),
        0
    )

    // ── PROJECT DEBT FOR MONTHS WITH NO INVOICES GENERATED ──────────────────────
    // When invoices haven't been generated (e.g., the cron didn't run this month),
    // we still show the correct Pendiente / Morosidad amount. This aggregates
    // ALL units in one lump sum for the month, so there's no single unit to read
    // a deadline from — we use the earliest (most conservative) deadline among
    // billing-active units as the cutoff, falling back to día 10 if none is set.
    // We calculate it per month in the period and add projected amounts on top of
    // what the existing invoices already account for.
    const earliestActiveDeadlineDay = units
        .filter(u => u.facturacion_activa !== false)
        .reduce((min: number | null, u) => {
            const d = Number(u.payment_deadline) || 10
            return min === null ? d : Math.min(min, d)
        }, null) ?? 10

    if (numMonths > 0 && expectedMonthlyIncome > 0) {
        for (let m = firstMonth; m <= lastMonth; m++) {
            // Skip future months
            if (selectedYear > today.getFullYear()) continue
            if (selectedYear === today.getFullYear() && m > today.getMonth()) continue

            // Determine if this month has passed the deadline
            const isPastMonth = selectedYear < today.getFullYear() ||
                (selectedYear === today.getFullYear() && m < today.getMonth())
            const isCurrentMonth = selectedYear === today.getFullYear() && m === today.getMonth()
            const isInOverduePeriod = isPastMonth || (isCurrentMonth && today.getDate() > earliestActiveDeadlineDay)

            // Check if any maintenance invoices already exist for this month
            const invoicesForThisMonth = maintenanceInvoices.filter(inv => {
                const dateStr = inv.due_date || inv.created_at
                if (!dateStr) return false
                const parts = getLocalDateParts(dateStr)
                return parts && parts.year === selectedYear && parts.month === m
            })

            // If invoices already exist for this month → skip (already counted above)
            if (invoicesForThisMonth.length > 0) continue

            // No invoices generated for this month — project the full expected income as debt
            // Subtract any amount already collected for this month (e.g., manual payments)
            const paidThisMonth = invoices.filter(inv => {
                const dateStr = inv.due_date || inv.created_at
                if (!dateStr) return false
                const parts = getLocalDateParts(dateStr)
                return parts && parts.year === selectedYear && parts.month === m
            }).reduce((sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)), 0)

            const projectedDebt = Math.max(0, expectedMonthlyIncome - paidThisMonth)

            if (projectedDebt > 0) {
                if (isInOverduePeriod) {
                    vencido += projectedDebt
                    // Count all billing-active residents as debtors for this projected
                    // month — incluye 'delinquent', solo excluye 'inactive'.
                    residents.forEach(r => {
                        if (r.status !== 'inactive' && r.id) {
                            debtorResidents.add(r.id)
                        }
                    })
                } else {
                    porCobrar += projectedDebt
                }
            }
        }
    }

    return {
        totalPeriodo,
        recaudado,
        porCobrar,
        vencido,
        saldoInicialPendiente,
        morososCount: debtorResidents.size
    }
}

export interface ResidentDebtSummary {
    debt: number
    // Porción de `debt` que viene del debt_amount arrastrado (saldo inicial, ajustes
    // manuales), ya neto de paymentSurplus y de facturas 'initial_balance' que lo
    // representen. Siempre es deuda YA vencida (viene de antes), nunca "pendiente
    // dentro del plazo" — quien muestre por separado Saldo Pendiente vs Cuotas
    // Vencidas debe sumar esto al lado de "vencida", no al de "pendiente".
    carriedOverDebt: number
    paymentSurplus: number
    overdueCount: number
    maxDaysOverdue: number
}

/**
 * Cuánto debe realmente un residente hoy — misma fórmula que usan
 * Propiedades > Residentes y Gestión de Cobranza (dashboard/residentes),
 * para que el propio residente vea exactamente la misma cifra que su
 * administrador. Antes cada pantalla (dashboard del residente, Pagos del
 * residente, Residentes del admin) tenía su propio cálculo independiente
 * y podían no coincidir entre sí.
 */
export function calculateResidentDebtSummary({
    resident,
    invoices,
    unit,
}: {
    resident: any
    invoices: any[]
    unit: any
}): ResidentDebtSummary {
    const today = new Date()
    const currentMonthIndex = today.getMonth()
    const paymentDeadlineDay = Number(unit?.payment_deadline) || 10

    const pendingInvoices = invoices.filter(i => i.status === 'pending' || i.status === 'overdue')
    const overdueInvoices = invoices.filter(i => i.status === 'overdue')

    const invoiceDebt = pendingInvoices
        .filter(inv => inv.invoice_type === 'maintenance')
        .reduce((sum, inv) => {
            const bd = inv.balance_due
            return sum + (bd != null && Number(bd) > 0 ? Number(bd) : Number(inv.amount) || 0)
        }, 0)

    const monthlyFee = Number(unit?.monto_mensual || 0)
    let feeBasedDebt = 0
    let paymentSurplus = 0
    if (monthlyFee > 0 && resident.status !== 'inactive' && unit?.facturacion_activa !== false) {
        const startDateStr = resident.fecha_ingreso ?? resident.created_at
        const startDate = startDateStr ? new Date(startDateStr) : null
        let firstBillingMonth = 0
        if (startDate) {
            firstBillingMonth = startDate.getMonth()
            if (startDate.getFullYear() < today.getFullYear()) firstBillingMonth = 0
        }
        // Si ya existe una factura real de mantenimiento con vencimiento anterior
        // al mes calculado arriba (p.ej. se le cargó un mes previo aunque su
        // fecha_ingreso/created_at diga que "empezó" después), ese mes real
        // manda: de lo contrario el pago ya aplicado a esa factura anterior se
        // contaría como si cubriera el mes actual, ocultando saldo pendiente real.
        const earliestMaintenanceDue = invoices
            .filter(inv => inv.invoice_type === 'maintenance' && inv.due_date)
            .reduce((earliest: Date | null, inv) => {
                const d = new Date(inv.due_date)
                return !earliest || d < earliest ? d : earliest
            }, null as Date | null)
        if (earliestMaintenanceDue) {
            firstBillingMonth = earliestMaintenanceDue.getFullYear() < today.getFullYear()
                ? 0
                : Math.min(firstBillingMonth, earliestMaintenanceDue.getMonth())
        }
        const lastBilledMonth = today.getDate() > paymentDeadlineDay ? currentMonthIndex : currentMonthIndex - 1
        const activeMonths = Math.max(0, lastBilledMonth - firstBillingMonth + 1)
        const annualTarget = monthlyFee * activeMonths
        const totalPaid = invoices.reduce((sum, inv) => {
            const paidAmt = Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0))
            return sum + paidAmt
        }, 0)
        feeBasedDebt = Math.max(0, annualTarget - totalPaid)
        paymentSurplus = Math.max(0, totalPaid - annualTarget)
    }

    const initialBalanceInvoiceDebt = invoices
        .filter(inv => inv.invoice_type === 'initial_balance' && (inv.status === 'overdue' || inv.status === 'pending'))
        .reduce((sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0), 0)
    const remainingDebtAmount = Math.max(0, Number(resident.debt_amount || 0) - paymentSurplus - initialBalanceInvoiceDebt)

    const debt = Math.max(invoiceDebt, feeBasedDebt) + remainingDebtAmount

    let overdueCount = overdueInvoices.length
    if (overdueCount === 0 && feeBasedDebt > 0 && monthlyFee > 0) {
        overdueCount = Math.ceil(feeBasedDebt / monthlyFee)
    }

    let maxDaysOverdue = 0
    if (overdueInvoices.length > 0) {
        const oldest = overdueInvoices.reduce((prev, curr) =>
            new Date(prev.due_date) < new Date(curr.due_date) ? prev : curr
        )
        maxDaysOverdue = Math.floor((today.getTime() - new Date(oldest.due_date).getTime()) / (1000 * 60 * 60 * 24))
    }

    return { debt, carriedOverDebt: remainingDebtAmount, paymentSurplus, overdueCount, maxDaysOverdue }
}
