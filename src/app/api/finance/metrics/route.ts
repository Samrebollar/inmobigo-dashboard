import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

        // 1. Fetch expected monthly income (total_periodo) from units
        let unitsQuery = supabase
            .from('units')
            .select('monto_mensual')
            .neq('billing_status', 'suspended')

        if (condominiumId) {
            unitsQuery = unitsQuery.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            unitsQuery = unitsQuery.eq('organization_id', organizationId)
        }

        const { data: units, error: unitsError } = await unitsQuery
        if (unitsError) throw unitsError
        
        const total_periodo = units?.reduce((sum, u) => sum + Number(u.monto_mensual || 0), 0) || 0

        // 2. Fetch current month's invoices (strictly maintenance type to avoid manual payment duplicates)
        let invoiceQuery = supabase
            .from('resident_invoices')
            .select('amount, balance_due, status, resident_id, invoice_type')
            .eq('invoice_type', 'maintenance')
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth)

        if (condominiumId) {
            invoiceQuery = invoiceQuery.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            invoiceQuery = invoiceQuery.eq('organization_id', organizationId)
        }

        const { data: invoices, error: invoiceError } = await invoiceQuery
        if (invoiceError) throw invoiceError

        let total_por_cobrar = 0
        let total_vencido = 0
        const debtorResidents = new Set<string>()

        invoices?.forEach(inv => {
            const bal = Number(inv.balance_due || 0)

            if (inv.status === 'pending') {
                total_por_cobrar += bal
            } else if (inv.status === 'overdue') {
                total_vencido += bal
                if (bal > 0 && inv.resident_id) {
                    debtorResidents.add(inv.resident_id)
                }
            }
        })

        // ingresos_mes is the complement of outstanding debt
        const ingresos_mes = Math.max(0, total_periodo - total_por_cobrar - total_vencido)
        const cartera_vencida = total_vencido
        
        const eficacia_cobro = total_periodo > 0
            ? Math.round((ingresos_mes / total_periodo) * 100 * 100) / 100
            : 0

        return NextResponse.json({
            ingresos_mes,
            total_facturado: total_periodo,
            total_por_cobrar,
            cartera_vencida,
            eficacia_cobro,
            residentes_morosos: debtorResidents.size,
        })
    } catch (error: any) {
        console.error('Metrics API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
