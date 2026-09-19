import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

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
            const { data: residents, error: residentsError } = await adminSupabase
                .from('residents')
                .select('id, unit_id, fecha_ingreso, status')
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

            return NextResponse.json({ invoices: invoicesData || [] })
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

        if (body.action === 'mark_paid') {
            const { invoiceId, paidAt } = body
            if (!invoiceId) {
                return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 })
            }

            const nowIso = paidAt || new Date().toISOString()
            const { data: updated, error } = await adminSupabase
                .from('resident_invoices')
                .update({ status: 'paid', balance_due: 0, paid_at: nowIso })
                .eq('id', invoiceId)
                .select()
                .single()

            if (error) throw error

            return NextResponse.json({ success: true, updated })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        console.error('[API /properties/[id]/finance POST] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
