import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { calculateCondoMonthlyFinancials } from '@/utils/finance-utils'
import { isDepositInvoice, isReservationInvoice } from '@/lib/invoice-types'

/**
 * GET /api/finance/metrics
 *
 * Returns the KPI cards for the top-level Finanzas module (Ingresos del Mes,
 * Total por Cobrar del Periodo, Cartera Vencida, Eficacia de Cobro).
 *
 * Antes esta ruta tenía su propia cadena de más de diez consultas de
 * respaldo (payments, receipts, resident_debt_summary,
 * resident_debt_breakdown, resident_financial_summary,
 * resident_debt_aging_v, charges, resident_monthly_charges, units...) con su
 * propia regla del día 10 duplicada — una tercera implementación paralela a
 * calculateCondoMonthlyFinancials (usada en Gestión de Cobranza y en el
 * dashboard de inicio), que obligaba a corregir el mismo tipo de bug en
 * varios lugares distintos. Ahora reutiliza esa misma función, para que los
 * tres módulos siempre reporten el mismo número para un mismo
 * condominio/periodo.
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
        const todayMxKey = now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }).slice(0, 7)
        // ?month=YYYY-MM permite pedir otro mes (el dashboard lo usa para el
        // "vs mes anterior"); por defecto es el mes en curso.
        const monthParam = searchParams.get('month')
        const monthKey = monthParam && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : todayMxKey
        const [yy, mm] = monthKey.split('-').map(Number)
        const currentYear = yy
        const currentMonth = mm - 1

        // Unidades (para el ingreso mensual esperado y proyectar meses sin recibos generados)
        let unitsQuery = supabase
            .from('units')
            .select('id, condominium_id, unit_number, monto_mensual, payment_deadline, facturacion_activa, created_at')

        if (condominiumId) {
            unitsQuery = unitsQuery.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            unitsQuery = unitsQuery.eq('organization_id', organizationId)
        }
        const { data: units } = await unitsQuery

        // Residentes (residents no tiene organization_id, se resuelve vía condominiums)
        // debt_amount es obligatorio: calculateCondoMonthlyFinancials lo suma a
        // "Saldo Inicial (Arrastre)" — sin seleccionarlo aquí, esa tarjeta siempre
        // calculaba con debt_amount=undefined y mostraba $0.
        let residents: any[] = []
        if (condominiumId) {
            const { data } = await supabase
                .from('residents')
                .select('id, status, condominium_id, debt_amount, unit_id, created_at, fecha_ingreso')
                .eq('condominium_id', condominiumId)
            residents = data || []
        } else if (organizationId) {
            const { data: condoList } = await supabase
                .from('condominiums')
                .select('id')
                .eq('organization_id', organizationId)
            const condoIds = condoList?.map(c => c.id) || []
            if (condoIds.length > 0) {
                const { data } = await supabase
                    .from('residents')
                    .select('id, status, condominium_id, debt_amount, unit_id, created_at, fecha_ingreso')
                    .in('condominium_id', condoIds)
                residents = data || []
            }
        }

        // Recibos (resident_invoices)
        let invoicesQuery = supabase
            .from('resident_invoices')
            .select('id, amount, balance_due, status, due_date, created_at, paid_at, invoice_type, resident_id, condominium_id')

        if (condominiumId) {
            invoicesQuery = invoicesQuery.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            invoicesQuery = invoicesQuery.eq('organization_id', organizationId)
        }
        const { data: invoices } = await invoicesQuery

        // KPI cards siempre muestran el mes en curso — misma regla que Gestión de
        // Cobranza y el dashboard de inicio.
        const condoFinancials = calculateCondoMonthlyFinancials({
            units: units || [],
            residents,
            invoices: invoices || [],
            selectedMonth: currentMonth,
            selectedYear: currentYear
        })

        // ── Definiciones (ver tarjetas de Finanzas) ──────────────────────────────
        // · Ingresos del Mes = FLUJO DE CAJA: todo el dinero que entró este mes
        //   (por fecha de pago), sin importar a qué mes pertenece la deuda. Se
        //   desglosa en cuotas del mes, recuperación de meses anteriores y
        //   adelantos (cuotas futuras / anticipos que quedaron como saldo a favor).
        //   Aplicar saldo a favor NO es ingreso nuevo (ya se contó cuando entró).
        // · Facturado del Mes = cuotas de mantenimiento del mes (cobrado + pendiente).
        // · Cartera Vencida = TODO lo vencido sin pagar a hoy (acumulado), con
        //   cuánto es del mes y cuánto de meses anteriores.
        // · Eficacia de Cobro = % cobrado de las cuotas del mes. Lo recuperado de
        //   meses anteriores no la infla: se reporta aparte.
        const todayMx = now.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
        const monthStart = `${monthKey}-01`
        const monthStartIso = new Date(`${monthStart}T00:00:00-06:00`).toISOString()
        const nextMonth = mm === 12 ? `${yy + 1}-01-01` : `${yy}-${String(mm + 1).padStart(2, '0')}-01`
        const monthEndIso = new Date(`${nextMonth}T00:00:00-06:00`).toISOString()

        type InvRow = { id: string, amount: number | null, balance_due: number | null, status: string | null, due_date: string | null, created_at: string | null, paid_at: string | null, invoice_type?: string | null }
        const invList = (invoices || []) as InvRow[]
        const invById = new Map(invList.map(i => [i.id, i]))

        let paymentsQuery = supabase
            .from('resident_invoice_payments')
            .select('invoice_id, amount, payment_method, paid_at')
            .gte('paid_at', monthStartIso)
            .lt('paid_at', monthEndIso)
        if (condominiumId) paymentsQuery = paymentsQuery.eq('condominium_id', condominiumId)
        else if (organizationId) paymentsQuery = paymentsQuery.eq('organization_id', organizationId)
        const { data: monthPayments } = await paymentsQuery

        const ingresos = { del_mes: 0, recuperacion: 0, adelantos: 0 }
        const classify = (dueDate: string | null | undefined, amount: number) => {
            const due = String(dueDate || '').slice(0, 10)
            if (!due || due >= nextMonth) ingresos.adelantos += amount
            else if (due < monthStart) ingresos.recuperacion += amount
            else ingresos.del_mes += amount
        }
        const invoicesWithPaymentRows = new Set<string>()
        for (const p of monthPayments || []) {
            if (p.invoice_id) invoicesWithPaymentRows.add(p.invoice_id)
            if (p.payment_method === 'Saldo a favor') continue
            // El depósito en garantía no es ingreso (se devuelve); lo retenido por
            // daños entra como cargo aparte (amenity_damage)
            if (p.invoice_id && isDepositInvoice(invById.get(p.invoice_id))) continue
            classify(p.invoice_id ? invById.get(p.invoice_id)?.due_date : null, Number(p.amount || 0))
        }
        // Facturas marcadas como pagadas este mes sin renglón de pago (flujos
        // antiguos): se cuenta lo pagado de la factura.
        const paidThisMonthIds = invList
            .filter(i => i.status === 'paid' && i.paid_at && i.paid_at >= monthStartIso && i.paid_at < monthEndIso && !invoicesWithPaymentRows.has(i.id) && !isDepositInvoice(i))
            .map(i => i.id)
        if (paidThisMonthIds.length > 0) {
            const { data: anyRows } = await supabase
                .from('resident_invoice_payments')
                .select('invoice_id')
                .in('invoice_id', paidThisMonthIds)
            const hasRows = new Set((anyRows || []).map(r => r.invoice_id))
            for (const id of paidThisMonthIds) {
                if (hasRows.has(id)) continue
                const inv = invById.get(id)!
                classify(inv.due_date, Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)))
            }
        }
        const round = (n: number) => Math.round(n * 100) / 100
        const ingresos_mes = round(ingresos.del_mes + ingresos.recuperacion + ingresos.adelantos)

        // Cartera vencida acumulada (facturas reales vencidas sin pagar)
        let vencidoMes = 0
        let vencidoAnterior = 0
        for (const i of invList) {
            if (!['pending', 'overdue', 'partial'].includes(String(i.status))) continue
            if (isReservationInvoice(i)) continue
            const due = String(i.due_date || '').slice(0, 10)
            const bal = Number(i.balance_due ?? i.amount ?? 0)
            if (!due || bal <= 0 || due >= todayMx) continue
            if (due < monthStart) vencidoAnterior += bal
            else vencidoMes += bal
        }

        const facturado = Math.max(0, condoFinancials.totalPeriodo)
        const cobradoCuotas = Math.max(0, condoFinancials.recaudado)
        const eficacia_cobro = facturado > 0
            ? Math.min(100, Math.max(0, Math.round((cobradoCuotas / facturado) * 10000) / 100))
            : 0

        return NextResponse.json({
            ingresos_mes,
            ingresos_del_mes: round(ingresos.del_mes),
            ingresos_recuperacion: round(ingresos.recuperacion),
            ingresos_adelantos: round(ingresos.adelantos),
            total_generado: facturado,
            cobrado_cuotas_mes: cobradoCuotas,
            total_por_cobrar: Math.max(0, facturado - cobradoCuotas),
            cartera_vencida: round(vencidoMes + vencidoAnterior),
            cartera_vencida_mes: round(vencidoMes),
            cartera_vencida_anterior: round(vencidoAnterior),
            eficacia_cobro,
        })
    } catch (error: any) {
        console.error('Metrics API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
