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

        let query = supabase.from('invoices').select('amount, status, created_at, paid_at, due_date, balance_due, paid_amount')
        
        if (condominiumId) {
            query = query.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            query = query.eq('organization_id', organizationId)
        }
        
        const { data: invoices, error } = await query
        
        if (error) throw error

        const currentYear = new Date().getFullYear()

        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
        const chartData = meses.map((mes) => ({
            mes,
            facturado: 0,
            cobrado: 0,
            pendiente: 0
        }))

        invoices?.forEach(inv => {
            const createdAt = new Date(inv.created_at)
            const paidAt = inv.paid_at ? new Date(inv.paid_at) : null
            const dueDate = new Date(inv.due_date)

            // 1. facturado: Suma de "amount" agrupado por mes usando "created_at"
            if (createdAt.getFullYear() === currentYear) {
                const monthIndex = createdAt.getMonth()
                chartData[monthIndex].facturado += Number(inv.amount || 0)
            }

            // 2. cobrado: Suma de "paid_amount" donde status = 'paid', agrupado por mes usando "paid_at"
            if (inv.status === 'paid' && paidAt && paidAt.getFullYear() === currentYear) {
                const monthIndex = paidAt.getMonth()
                chartData[monthIndex].cobrado += Number(inv.paid_amount ?? inv.amount ?? 0)
            }

            // 3. pendiente: Suma de "balance_due" donde status != 'paid', agrupado por mes usando "due_date"
            if (inv.status !== 'paid' && dueDate.getFullYear() === currentYear) {
                const monthIndex = dueDate.getMonth()
                chartData[monthIndex].pendiente += Number(inv.balance_due ?? inv.amount ?? 0)
            }
        })

        return NextResponse.json(chartData)
    } catch (error: any) {
        console.error('Revenue Chart API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
