import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/finance/metrics
 *
 * Returns the 4 KPI cards for the financial dashboard:
 *   - ingresos_mes       : Total collected payments this calendar month
 *   - total_por_cobrar   : Total pending debt (all residents)
 *   - cartera_vencida    : Total overdue debt (past due-date, balance > 0)
 *   - eficacia_cobro     : Collection efficiency % (collected / generated * 100)
 *
 * Data source priority:
 *   Ingresos del Mes     → payments (paid_at / created_at this month) → receipts → resident_invoices (paid, this month)
 *   Total por Cobrar     → resident_debt_summary → resident_debt_breakdown → resident_debt_aging_v → resident_invoices (pending)
 *   Cartera Vencida      → resident_debt_aging_v (dias_max_atraso > 0) → resident_debt_breakdown (overdue) → resident_invoices (overdue)
 *   Eficacia de Cobro    → (ingresos_mes / charges or resident_monthly_charges total) * 100 → fallback ratio
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const condominiumId = searchParams.get('condominium_id')
        const organizationId = searchParams.get('organization_id')

        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() // 0-indexed
        const monthStart = new Date(currentYear, currentMonth, 1).toISOString()
        const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString()

        // ─────────────────────────────────────────────────────────────────────
        // 1. INGRESOS DEL MES — payments → receipts → resident_invoices (paid)
        // ─────────────────────────────────────────────────────────────────────
        let ingresos_mes = 0

        // 1a. Try payments table first
        try {
            let paymentsQuery = supabase
                .from('payments')
                .select('amount, created_at')
                .gte('created_at', monthStart)
                .lte('created_at', monthEnd)

            if (condominiumId) {
                paymentsQuery = paymentsQuery.eq('condominium_id', condominiumId)
            } else if (organizationId) {
                paymentsQuery = paymentsQuery.eq('organization_id', organizationId)
            }

            const { data: payments, error: paymentsError } = await paymentsQuery

            if (!paymentsError && payments && payments.length > 0) {
                ingresos_mes = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
            }
        } catch (_) { /* table may not exist yet, continue to next source */ }

        // 1b. If payments had no data, try receipts
        if (ingresos_mes === 0) {
            try {
                let receiptsQuery = supabase
                    .from('receipts')
                    .select('amount, created_at')
                    .gte('created_at', monthStart)
                    .lte('created_at', monthEnd)

                if (condominiumId) {
                    receiptsQuery = receiptsQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    receiptsQuery = receiptsQuery.eq('organization_id', organizationId)
                }

                const { data: receipts, error: receiptsError } = await receiptsQuery

                if (!receiptsError && receipts && receipts.length > 0) {
                    ingresos_mes = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0)
                }
            } catch (_) { /* receipts table may not exist, continue */ }
        }

        // 1c. Fallback: resident_invoices (status='paid', current month)
        if (ingresos_mes === 0) {
            try {
                let invQuery = supabase
                    .from('resident_invoices')
                    .select('amount, balance_due, created_at')
                    .eq('status', 'paid')
                    .gte('created_at', monthStart)
                    .lte('created_at', monthEnd)

                if (condominiumId) {
                    invQuery = invQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    invQuery = invQuery.eq('organization_id', organizationId)
                }

                const { data: paidInvs } = await invQuery

                if (paidInvs && paidInvs.length > 0) {
                    ingresos_mes = paidInvs.reduce(
                        (sum, inv) => sum + Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)),
                        0
                    )
                }
            } catch (_) { /* ignore */ }
        }

        // ─────────────────────────────────────────────────────────────────────
        // 2. TOTAL POR COBRAR — debt summary views → resident_invoices (pending)
        // ─────────────────────────────────────────────────────────────────────
        let total_por_cobrar = 0

        // 2a. Try resident_debt_summary view
        try {
            let debtSummaryQuery = supabase
                .from('resident_debt_summary')
                .select('total_debt, pending_amount')

            if (condominiumId) {
                debtSummaryQuery = debtSummaryQuery.eq('condominium_id', condominiumId)
            } else if (organizationId) {
                debtSummaryQuery = debtSummaryQuery.eq('organization_id', organizationId)
            }

            const { data: debtSummary, error: debtSummaryError } = await debtSummaryQuery

            if (!debtSummaryError && debtSummary && debtSummary.length > 0) {
                // Use pending_amount if available; else total_debt
                total_por_cobrar = debtSummary.reduce(
                    (sum, row) => sum + Number(row.pending_amount ?? row.total_debt ?? 0),
                    0
                )
            }
        } catch (_) { /* view may not exist */ }

        // 2b. Try resident_debt_breakdown view
        if (total_por_cobrar === 0) {
            try {
                let breakdownQuery = supabase
                    .from('resident_debt_breakdown')
                    .select('pending_amount, balance_due, amount')

                if (condominiumId) {
                    breakdownQuery = breakdownQuery.eq('condominium_id', condominiumId)
                }

                const { data: breakdown, error: breakdownError } = await breakdownQuery

                if (!breakdownError && breakdown && breakdown.length > 0) {
                    total_por_cobrar = breakdown.reduce(
                        (sum, row) => sum + Number(row.pending_amount ?? row.balance_due ?? row.amount ?? 0),
                        0
                    )
                }
            } catch (_) { /* view may not exist */ }
        }

        // 2c. Try resident_financial_summary view
        if (total_por_cobrar === 0) {
            try {
                let financialSummaryQuery = supabase
                    .from('resident_financial_summary')
                    .select('*')

                if (condominiumId) {
                    financialSummaryQuery = financialSummaryQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    financialSummaryQuery = financialSummaryQuery.eq('organization_id', organizationId)
                }

                const { data: financialSummary, error: fsError } = await financialSummaryQuery

                if (!fsError && financialSummary && financialSummary.length > 0) {
                    // Try common column names for pending debt
                    const firstRow = financialSummary[0]
                    const possibleCols = ['total_pendiente', 'pending_total', 'deuda_pendiente', 'total_debt', 'balance_due']
                    const col = possibleCols.find(c => c in firstRow)
                    if (col) {
                        total_por_cobrar = financialSummary.reduce((sum, row) => sum + Number(row[col] || 0), 0)
                    }
                }
            } catch (_) { /* view may not exist */ }
        }

        // 2d. Try resident_debt_aging_v (sum all deuda_total)
        if (total_por_cobrar === 0) {
            try {
                let agingQuery = supabase
                    .from('resident_debt_aging_v')
                    .select('deuda_total')

                if (condominiumId) {
                    agingQuery = agingQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    agingQuery = agingQuery.eq('organization_id', organizationId)
                }

                const { data: agingRows, error: agingError } = await agingQuery

                if (!agingError && agingRows && agingRows.length > 0) {
                    total_por_cobrar = agingRows.reduce((sum, row) => sum + Number(row.deuda_total || 0), 0)
                }
            } catch (_) { /* view may not exist */ }
        }

        // 2e. Fallback: resident_invoices (pending + overdue balance_due)
        if (total_por_cobrar === 0) {
            try {
                let pendingQuery = supabase
                    .from('resident_invoices')
                    .select('balance_due, amount')
                    .or('status.eq.pending,status.eq.overdue')

                if (condominiumId) {
                    pendingQuery = pendingQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    pendingQuery = pendingQuery.eq('organization_id', organizationId)
                }

                const { data: pendingInvs } = await pendingQuery

                if (pendingInvs && pendingInvs.length > 0) {
                    total_por_cobrar = pendingInvs.reduce(
                        (sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0),
                        0
                    )
                }
            } catch (_) { /* ignore */ }
        }

        // ─────────────────────────────────────────────────────────────────────
        // 3. CARTERA VENCIDA — resident_debt_aging_v → resident_debt_breakdown → resident_invoices (overdue)
        // ─────────────────────────────────────────────────────────────────────
        let cartera_vencida = 0

        // 3a. Primary: resident_debt_aging_v (rows with dias_max_atraso > 0)
        try {
            let agingOverdueQuery = supabase
                .from('resident_debt_aging_v')
                .select('deuda_total, dias_max_atraso')
                .gt('dias_max_atraso', 0)

            if (condominiumId) {
                agingOverdueQuery = agingOverdueQuery.eq('condominium_id', condominiumId)
            } else if (organizationId) {
                agingOverdueQuery = agingOverdueQuery.eq('organization_id', organizationId)
            }

            const { data: overdueAging, error: overdueAgingError } = await agingOverdueQuery

            if (!overdueAgingError && overdueAging && overdueAging.length > 0) {
                cartera_vencida = overdueAging.reduce((sum, row) => sum + Number(row.deuda_total || 0), 0)
            }
        } catch (_) { /* view may not exist */ }

        // 3b. Try resident_debt_breakdown with overdue filter
        if (cartera_vencida === 0) {
            try {
                let breakdownOverdueQuery = supabase
                    .from('resident_debt_breakdown')
                    .select('balance_due, amount, due_date, status')

                if (condominiumId) {
                    breakdownOverdueQuery = breakdownOverdueQuery.eq('condominium_id', condominiumId)
                }

                const { data: breakdownOverdue, error: breakdownOverdueError } = await breakdownOverdueQuery

                if (!breakdownOverdueError && breakdownOverdue && breakdownOverdue.length > 0) {
                    const nowIso = now.toISOString()
                    cartera_vencida = breakdownOverdue
                        .filter(row => {
                            // Include if status is overdue, OR if due_date is past and has balance
                            const isStatusOverdue = row.status === 'overdue'
                            const isPastDue = row.due_date && row.due_date < nowIso
                            const hasBalance = Number(row.balance_due ?? row.amount ?? 0) > 0
                            return hasBalance && (isStatusOverdue || isPastDue)
                        })
                        .reduce((sum, row) => sum + Number(row.balance_due ?? row.amount ?? 0), 0)
                }
            } catch (_) { /* view may not exist */ }
        }

        // 3c. Fallback: resident_invoices (overdue OR past due_date with balance)
        if (cartera_vencida === 0) {
            try {
                let overdueQuery = supabase
                    .from('resident_invoices')
                    .select('balance_due, amount, due_date, status')
                    .or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${now.toISOString().split('T')[0]})`)

                if (condominiumId) {
                    overdueQuery = overdueQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    overdueQuery = overdueQuery.eq('organization_id', organizationId)
                }

                const { data: overdueInvs } = await overdueQuery

                if (overdueInvs && overdueInvs.length > 0) {
                    cartera_vencida = overdueInvs.reduce(
                        (sum, inv) => sum + Number(inv.balance_due ?? inv.amount ?? 0),
                        0
                    )
                }
            } catch (_) { /* ignore */ }
        }

        // ─────────────────────────────────────────────────────────────────────
        // 4. EFICACIA DE COBRO % = (ingresos / total_generado) * 100
        //    total_generado = charges → resident_monthly_charges → units.monto_mensual sum → total facturado
        // ─────────────────────────────────────────────────────────────────────
        let total_generado = 0

        // 4a. Try charges table (this month)
        try {
            let chargesQuery = supabase
                .from('charges')
                .select('amount, created_at')
                .gte('created_at', monthStart)
                .lte('created_at', monthEnd)

            if (condominiumId) {
                chargesQuery = chargesQuery.eq('condominium_id', condominiumId)
            } else if (organizationId) {
                chargesQuery = chargesQuery.eq('organization_id', organizationId)
            }

            const { data: charges, error: chargesError } = await chargesQuery

            if (!chargesError && charges && charges.length > 0) {
                total_generado = charges.reduce((sum, c) => sum + Number(c.amount || 0), 0)
            }
        } catch (_) { /* table may not exist */ }

        // 4b. Try resident_monthly_charges (this month)
        if (total_generado === 0) {
            try {
                let monthlyChargesQuery = supabase
                    .from('resident_monthly_charges')
                    .select('amount, period_month, period_year')
                    .eq('period_month', currentMonth + 1) // 1-indexed
                    .eq('period_year', currentYear)

                if (condominiumId) {
                    monthlyChargesQuery = monthlyChargesQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    monthlyChargesQuery = monthlyChargesQuery.eq('organization_id', organizationId)
                }

                const { data: monthlyCharges, error: monthlyChargesError } = await monthlyChargesQuery

                if (!monthlyChargesError && monthlyCharges && monthlyCharges.length > 0) {
                    total_generado = monthlyCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0)
                }
            } catch (_) { /* table may not exist */ }
        }

        // 4c. Fallback: sum of units monto_mensual (active units with residents)
        if (total_generado === 0) {
            try {
                let unitsQuery = supabase
                    .from('units')
                    .select('monto_mensual')
                    .neq('billing_status', 'suspended')

                if (condominiumId) {
                    unitsQuery = unitsQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    unitsQuery = unitsQuery.eq('organization_id', organizationId)
                }

                const { data: units } = await unitsQuery

                if (units && units.length > 0) {
                    total_generado = units.reduce((sum, u) => sum + Number(u.monto_mensual || 0), 0)
                }
            } catch (_) { /* ignore */ }
        }

        // 4d. Final fallback: use resident_invoices total for the month
        if (total_generado === 0) {
            try {
                let invAllQuery = supabase
                    .from('resident_invoices')
                    .select('amount')
                    .gte('created_at', monthStart)
                    .lte('created_at', monthEnd)

                if (condominiumId) {
                    invAllQuery = invAllQuery.eq('condominium_id', condominiumId)
                } else if (organizationId) {
                    invAllQuery = invAllQuery.eq('organization_id', organizationId)
                }

                const { data: allMonthInvs } = await invAllQuery

                if (allMonthInvs && allMonthInvs.length > 0) {
                    total_generado = allMonthInvs.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)
                }
            } catch (_) { /* ignore */ }
        }

        // Calculate efficiency (clamp 0–100, 2 decimal places)
        const eficacia_cobro = total_generado > 0
            ? Math.min(100, Math.max(0, Math.round((ingresos_mes / total_generado) * 10000) / 100))
            : 0

        return NextResponse.json({
            ingresos_mes: Math.max(0, ingresos_mes),
            total_por_cobrar: Math.max(0, total_por_cobrar),
            cartera_vencida: Math.max(0, cartera_vencida),
            eficacia_cobro,
            total_generado: Math.max(0, total_generado),
        })
    } catch (error: any) {
        console.error('Metrics API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
