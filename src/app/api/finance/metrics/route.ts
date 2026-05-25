import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { calculateCondoMonthlyFinancials } from '@/utils/finance-utils'

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

        // Calculate current month's dynamic metrics
        const now = new Date()

        // 1. Fetch units
        let unitsQuery = supabase
            .from('units')
            .select('id, monto_mensual')
            .neq('billing_status', 'suspended')

        if (condominiumId) {
            unitsQuery = unitsQuery.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            unitsQuery = unitsQuery.eq('organization_id', organizationId)
        }

        const { data: units, error: unitsError } = await unitsQuery
        if (unitsError) throw unitsError

        // 2. Fetch residents
        let residentsQuery = supabase
            .from('residents')
            .select('unit_id, fecha_ingreso, facturacion_activa, status')

        if (condominiumId) {
            residentsQuery = residentsQuery.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            residentsQuery = residentsQuery.eq('organization_id', organizationId)
        }

        const { data: residents, error: residentsError } = await residentsQuery
        if (residentsError) throw residentsError

        // 3. Fetch resident invoices
        let invoiceQuery = supabase
            .from('resident_invoices')
            .select('amount, balance_due, status, resident_id, invoice_type, created_at')

        if (condominiumId) {
            invoiceQuery = invoiceQuery.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            invoiceQuery = invoiceQuery.eq('organization_id', organizationId)
        }

        const { data: invoices, error: invoiceError } = await invoiceQuery
        if (invoiceError) throw invoiceError

        const condoFinancials = calculateCondoMonthlyFinancials({
            units: units || [],
            residents: residents || [],
            invoices: invoices || [],
            selectedMonth: now.getMonth(),
            selectedYear: now.getFullYear()
        })

        const ingresos_mes = condoFinancials.recaudado
        const total_facturado = condoFinancials.totalPeriodo
        const total_por_cobrar = condoFinancials.porCobrar
        const cartera_vencida = condoFinancials.vencido

        const eficacia_cobro = total_facturado > 0
            ? Math.round((ingresos_mes / total_facturado) * 100 * 100) / 100
            : 0

        return NextResponse.json({
            ingresos_mes,
            total_facturado,
            total_por_cobrar,
            cartera_vencida,
            eficacia_cobro,
            residentes_morosos: condoFinancials.morososCount,
        })
    } catch (error: any) {
        console.error('Metrics API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
