import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { calculateCondoMonthlyFinancials } from '@/utils/finance-utils'

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
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth()

        // Unidades (para el ingreso mensual esperado y proyectar meses sin recibos generados)
        let unitsQuery = supabase
            .from('units')
            .select('id, condominium_id, unit_number, monto_mensual, payment_deadline, facturacion_activa')

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
                .select('id, status, condominium_id, debt_amount')
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
                    .select('id, status, condominium_id, debt_amount')
                    .in('condominium_id', condoIds)
                residents = data || []
            }
        }

        // Recibos (resident_invoices)
        let invoicesQuery = supabase
            .from('resident_invoices')
            .select('amount, balance_due, status, due_date, created_at, invoice_type, resident_id, condominium_id')

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

        const eficacia_cobro = condoFinancials.totalPeriodo > 0
            ? Math.min(100, Math.max(0, Math.round((condoFinancials.recaudado / condoFinancials.totalPeriodo) * 10000) / 100))
            : 0

        return NextResponse.json({
            ingresos_mes: Math.max(0, condoFinancials.recaudado),
            total_por_cobrar: Math.max(0, condoFinancials.porCobrar),
            cartera_vencida: Math.max(0, condoFinancials.vencido),
            eficacia_cobro,
            total_generado: Math.max(0, condoFinancials.totalPeriodo),
        })
    } catch (error: any) {
        console.error('Metrics API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
