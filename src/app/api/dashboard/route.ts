import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/dashboard
 *
 * KPIs globales del dashboard.
 * MIGRADO: Lee de `resident_invoices` (fuente de verdad).
 */
export async function GET() {
    const supabase = await createClient()

    // Facturas desde resident_invoices
    const { data: invoices } = await supabase
        .from('resident_invoices')
        .select('id, amount, balance_due, status, created_at, due_date')

    // Pagos (tabla payments sigue siendo independiente)
    const { data: payments } = await supabase
        .from('payments')
        .select('*')

    const allInvoices = invoices || []

    // ===============================
    // KPIs
    // ===============================

    const totalFacturado = allInvoices.reduce((acc, i) => acc + Number(i.amount), 0)

    const totalCobrado = allInvoices
        .filter(i => i.status === 'paid')
        .reduce((acc, i) => acc + Math.max(0, Number(i.amount) - Number(i.balance_due ?? 0)), 0)

    const facturasVencidas = allInvoices.filter(
        i => i.status === 'overdue' ||
            (i.status === 'pending' && new Date() > new Date(i.due_date))
    )

    const pendientes = allInvoices.filter(i => i.status === 'pending')

    const tasaCobranza =
        totalFacturado > 0
            ? ((totalCobrado / totalFacturado) * 100).toFixed(1)
            : 0

    // ===============================
    // Actividad reciente
    // ===============================

    const actividad = (payments || [])
        .sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 5)

    return NextResponse.json({
        kpis: {
            totalFacturado,
            totalCobrado,
            facturasVencidas: facturasVencidas.length,
            pendientes: pendientes.length,
            tasaCobranza,
        },
        actividad,
    })
}