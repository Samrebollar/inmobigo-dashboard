import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const condoId = params.id
        const { searchParams } = new URL(request.url)
        const action = searchParams.get('action') || 'billing'
        const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10)
        const month = parseInt(searchParams.get('month') || '-1', 10)

        if (!condoId) {
            return NextResponse.json({ error: 'Condominium ID is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = createAdminClient()

        if (action === 'billing') {
            // 1. Fetch units
            const { data: units, error: unitsError } = await adminSupabase
                .from('units')
                .select('id, monto_mensual, facturacion_activa')
                .eq('condominium_id', condoId)
                .neq('billing_status', 'suspended')

            if (unitsError) throw unitsError

            // 2. Fetch residents
            // debt_amount es obligatorio: calculateCondoMonthlyFinancials lo suma a
            // "Saldo Inicial (Arrastre)" — sin seleccionarlo aquí, esa tarjeta siempre
            // calculaba con debt_amount=undefined y mostraba $0 aunque el residente sí
            // tuviera saldo inicial cargado.
            const { data: residents, error: residentsError } = await adminSupabase
                .from('residents')
                .select('id, unit_id, fecha_ingreso, status, debt_amount')
                .eq('condominium_id', condoId)

            if (residentsError) throw residentsError

            // 3. Fetch resident invoices for the selected year
            const yearStart = `${year}-01-01`
            const yearEnd = `${year}-12-31`
            const { data: invoices, error: invoiceError } = await adminSupabase
                .from('resident_invoices')
                .select('amount, balance_due, status, resident_id, invoice_type, created_at, due_date')
                .eq('condominium_id', condoId)
                .gte('due_date', yearStart)
                .lte('due_date', yearEnd)

            if (invoiceError) throw invoiceError

            return NextResponse.json({
                units: units || [],
                residents: residents || [],
                invoices: invoices || []
            })
        }

        if (action === 'invoices') {
            let query = adminSupabase
                .from('resident_invoices')
                .select(`
                    id, folio, paid_at, amount, balance_due, status, created_at, due_date, period_start, description, invoice_type,
                    residents (
                        first_name, last_name, phone,
                        units (unit_number)
                    )
                `)
                .eq('condominium_id', condoId)

            if (month !== -1) {
                const startOfPeriod = new Date(year, month, 1).toISOString().substring(0, 10)
                const endOfPeriod = new Date(year, month + 1, 0).toISOString().substring(0, 10)
                query = query.gte('due_date', startOfPeriod).lte('due_date', endOfPeriod)
                query = query.eq('invoice_type', 'maintenance')
            }

            const { data: invoicesData, error: invoiceError } = await query
                .order('created_at', { ascending: false })
                .limit(100)

            if (invoiceError) throw invoiceError

            // Pagos individuales aplicados a estas facturas (soporta abonos
            // parciales: una factura puede tener varios pagos, cada uno con
            // su propio folio de recibo).
            const invoiceIds = (invoicesData || []).map((inv: any) => inv.id)
            let payments: any[] = []
            if (invoiceIds.length > 0) {
                const { data: paymentsData, error: paymentsError } = await adminSupabase
                    .from('resident_invoice_payments')
                    .select('id, invoice_id, amount, folio, payment_method, notes, paid_at')
                    .in('invoice_id', invoiceIds)
                    .order('paid_at', { ascending: true })

                if (paymentsError) throw paymentsError
                payments = paymentsData || []
            }

            return NextResponse.json({ invoices: invoicesData || [], payments })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        console.error('[API /properties/[id]/finance GET] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}

export async function POST(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params
        const condoId = params.id
        const body = await request.json()

        if (!condoId) {
            return NextResponse.json({ error: 'Condominium ID is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = createAdminClient()

        if (body.action === 'register_payment') {
            const { invoiceId, amount, paymentMethod, notes, paidAt } = body
            const paymentAmount = Number(amount)

            if (!invoiceId || !paymentAmount || paymentAmount <= 0) {
                return NextResponse.json({ error: 'invoiceId y amount (mayor a 0) son requeridos' }, { status: 400 })
            }

            const { data: invoice, error: invoiceFetchError } = await adminSupabase
                .from('resident_invoices')
                .select('id, amount, balance_due, status, paid_at, resident_id, condominium_id, organization_id')
                .eq('id', invoiceId)
                .single()

            if (invoiceFetchError || !invoice) {
                return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
            }

            const currentBalance = Number(invoice.balance_due ?? invoice.amount)
            if (paymentAmount > currentBalance + 0.01) {
                return NextResponse.json({ error: `El monto excede el saldo pendiente ($${currentBalance.toFixed(2)})` }, { status: 400 })
            }

            const paymentId = randomUUID()
            const folio = `REC-${paymentId.substring(0, 8).toUpperCase()}`
            const paidAtIso = paidAt || new Date().toISOString()

            const { data: payment, error: paymentError } = await adminSupabase
                .from('resident_invoice_payments')
                .insert({
                    id: paymentId,
                    invoice_id: invoice.id,
                    resident_id: invoice.resident_id,
                    condominium_id: invoice.condominium_id,
                    organization_id: invoice.organization_id,
                    amount: paymentAmount,
                    folio,
                    payment_method: paymentMethod || null,
                    notes: notes || null,
                    paid_at: paidAtIso,
                })
                .select()
                .single()

            if (paymentError) throw paymentError

            const newBalance = Math.max(0, currentBalance - paymentAmount)
            const isFullyPaid = newBalance <= 0.01

            const { data: updatedInvoice, error: updateError } = await adminSupabase
                .from('resident_invoices')
                .update({
                    balance_due: newBalance,
                    status: isFullyPaid ? 'paid' : invoice.status,
                    paid_at: isFullyPaid ? paidAtIso : invoice.paid_at,
                    payment_method: paymentMethod || undefined,
                })
                .eq('id', invoice.id)
                .select()
                .single()

            if (updateError) throw updateError

            return NextResponse.json({ success: true, payment, invoice: updatedInvoice })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        console.error('[API /properties/[id]/finance POST] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
