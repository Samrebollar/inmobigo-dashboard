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

        // 1. Fetch units for expected income (Current Month reference)
        let unitsQuery = supabase.from('units').select('monto_mensual')
        if (condominiumId) {
            unitsQuery = unitsQuery.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            unitsQuery = unitsQuery.eq('organization_id', organizationId)
        }
        const { data: units } = await unitsQuery
        const monthlyUnitsSum = units?.reduce((acc, u) => acc + (Number(u.monto_mensual) || 0), 0) || 0

        // 2. Fetch Invoices from resident_invoices
        let query = supabase
            .from('resident_invoices')
            .select('amount, balance_due, status, created_at, due_date')

        if (condominiumId) {
            query = query.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            query = query.eq('organization_id', organizationId)
        }

        const { data: invoices, error } = await query
        if (error) throw error

        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonthIndex = now.getMonth()

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const chartData = meses.map((mes) => ({
            mes,
            facturado: 0,  // "Pendiente" (Bars) - Total Expected
            cobrado: 0,    // "Cobrado" (Area) - Paid
            pendiente: 0   // "Morosidad" (Line) - Balance
        }))

        // Group by month
        invoices?.forEach(inv => {
            const createdAt = new Date(inv.created_at)
            if (createdAt.getFullYear() === currentYear) {
                const monthIndex = createdAt.getMonth()
                chartData[monthIndex].facturado += Number(inv.amount || 0)
            }

            // For cobrado: use when paid (status=paid → full amount collected)
            if (inv.status === 'paid') {
                const paidAt = new Date(inv.created_at) // fallback since no paid_at in resident_invoices
                if (paidAt.getFullYear() === currentYear) {
                    const monthIndex = paidAt.getMonth()
                    // Paid amount = amount - balance_due
                    const paidAmt = Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0))
                    chartData[monthIndex].cobrado += paidAmt
                }
            }
        })

        const currentDay = now.getDate()

        // Apply logic for each month up to current
        chartData.forEach((item, index) => {
            if (index > currentMonthIndex) return

            const target = index === currentMonthIndex ? Math.max(item.facturado, monthlyUnitsSum) : item.facturado
            const balance = Math.max(0, target - item.cobrado)

            if (index === currentMonthIndex) {
                if (currentDay <= 10) {
                    item.facturado = balance
                    item.pendiente = 0
                } else {
                    item.facturado = 0
                    item.pendiente = balance
                }
            } else {
                item.facturado = 0
                item.pendiente = balance
            }
        })

        return NextResponse.json(chartData)
    } catch (error: any) {
        console.error('Revenue Chart API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
