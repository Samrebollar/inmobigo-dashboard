import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const condominiumId = searchParams.get('condominium_id')
        
        const supabase = await createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let query = supabase.from('invoices').select('amount, status, created_at, paid_at, due_date, balance_due, paid_amount')
        
        if (condominiumId) {
            query = query.eq('condominium_id', condominiumId)
        }
        
        const { data: invoices, error } = await query
        
        if (error) throw error

        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        let ingresos_mes = 0
        let total_facturado = 0
        let total_por_cobrar = 0
        let cartera_vencida = 0
        let total_cobrado_mes = 0

        invoices?.forEach(inv => {
            const createdAt = new Date(inv.created_at)
            const paidAt = inv.paid_at ? new Date(inv.paid_at) : null
            const dueDate = new Date(inv.due_date)
            
            // 1. ingresos_mes & 4. total_cobrado_mes
            if (inv.status === 'paid' && paidAt && paidAt.getMonth() === currentMonth && paidAt.getFullYear() === currentYear) {
                ingresos_mes += Number(inv.amount || 0)
                total_cobrado_mes += Number(inv.paid_amount ?? inv.amount ?? 0)
            }
            
            // 2. total_facturado (used for efficiency math)
            if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) {
                total_facturado += Number(inv.amount || 0)
                
                // total_por_cobrar (unpaid inside current month)
                if (inv.status !== 'paid') {
                    total_por_cobrar += Number(inv.balance_due ?? inv.amount ?? 0)
                }
            }
            
            // 3. cartera_vencida
            // Only count if due date is strictly in the past (before today)
            const isOverdue = dueDate < new Date(now.setHours(0, 0, 0, 0))
            if (inv.status !== 'paid' && isOverdue) {
                cartera_vencida += Number(inv.balance_due ?? inv.amount ?? 0)
            }
        })

        // 5. eficacia_cobro
        let eficacia_cobro = 0
        if (total_facturado > 0) {
            // Formula: (total_cobrado_mes / total_facturado) * 100
            eficacia_cobro = Math.round((total_cobrado_mes / total_facturado) * 100 * 100) / 100
        }

        return NextResponse.json({
            ingresos_mes,
            total_facturado,
            total_por_cobrar,
            cartera_vencida,
            eficacia_cobro
        })
    } catch (error: any) {
        console.error('Metrics API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
