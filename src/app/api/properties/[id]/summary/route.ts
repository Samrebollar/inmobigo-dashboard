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

        if (!condoId) {
            return NextResponse.json({ error: 'Condominium ID is required' }, { status: 400 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const adminSupabase = createAdminClient()

        const now = new Date()
        const currentYear = now.getFullYear()
        const yearStart = `${currentYear}-01-01`
        const yearEnd = `${currentYear}-12-31`

        // 1. Fetch units
        const { data: units, error: unitsError } = await adminSupabase
            .from('units')
            .select('id, monto_mensual, facturacion_activa, unit_number')
            .eq('condominium_id', condoId)
            .neq('billing_status', 'suspended')

        if (unitsError) throw unitsError

        // 2. Fetch residents
        const { data: residents, error: residentsError } = await adminSupabase
            .from('residents')
            .select('id, unit_id, first_name, last_name, fecha_ingreso, status')
            .eq('condominium_id', condoId)

        if (residentsError) throw residentsError

        // 3. Fetch invoices
        const { data: invoices, error: invoiceError } = await adminSupabase
            .from('resident_invoices')
            .select('id, amount, balance_due, status, resident_id, unit_id, invoice_type, created_at, due_date, paid_at')
            .eq('condominium_id', condoId)
            .gte('due_date', yearStart)
            .lte('due_date', yearEnd)

        if (invoiceError) throw invoiceError

        return NextResponse.json({
            units: units || [],
            residents: residents || [],
            invoices: invoices || []
        })
    } catch (err: any) {
        console.error('[API /properties/[id]/summary] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
