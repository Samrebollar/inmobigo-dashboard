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
        const { data: units } = await supabase
            .from('units')
            .select('monto_mensual')
            .eq('condominium_id', condominiumId)
        const monthlyUnitsSum = units?.reduce((acc, u) => acc + (Number(u.monto_mensual) || 0), 0) || 0

        // 2. Fetch Invoices
        let query = supabase.from('invoices').select('amount, status, created_at, paid_at, due_date, balance_due, paid_amount')
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
            facturado: 0, // "Pendiente" (Bars) - Total Expected
            cobrado: 0,   // "Cobrado" (Area) - Paid
            pendiente: 0  // "Morosidad" (Line) - Balance
        }))

        // Helper to group by month
        invoices?.forEach(inv => {
            const createdAt = new Date(inv.created_at)
            if (createdAt.getFullYear() === currentYear) {
                const monthIndex = createdAt.getMonth()
                // Sum actual invoices amount as the "Total Invoiced" for that month
                chartData[monthIndex].facturado += Number(inv.amount || 0)
            }

            const paidAt = inv.paid_at ? new Date(inv.paid_at) : (inv.status === 'paid' ? new Date(inv.created_at) : null)
            if (paidAt && paidAt.getFullYear() === currentYear) {
                const monthIndex = paidAt.getMonth()
                chartData[monthIndex].cobrado += Number(inv.paid_amount ?? inv.amount ?? 0)
            }
        })

        const currentDay = now.getDate()

        // Apply logic for each month up to current
        chartData.forEach((item, index) => {
            if (index > currentMonthIndex) return

            // Ensure current month target is based on Units
            const target = index === currentMonthIndex ? Math.max(item.facturado, monthlyUnitsSum) : item.facturado
            const balance = Math.max(0, target - item.cobrado)
            
            if (index === currentMonthIndex) {
                // Current Month
                if (currentDay <= 10) {
                    item.facturado = balance // Pendiente (Yellow Bars)
                    item.pendiente = 0       // Morosidad (Red Line)
                } else {
                    item.facturado = 0       // Pendiente is 0 after day 10
                    item.pendiente = balance // Balance moves to Morosidad
                }
            } else {
                // Past Month (Always Morosidad)
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
