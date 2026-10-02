import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getFinanceOrgForCondo } from '@/lib/finance-auth'
import { checkCanSignPayments, issuePaymentReceipt } from '@/lib/payment-receipts'

const N8N_BASE = () => (process.env.N8N_BASE_URL || 'https://n8n.inmobigo.mx').replace(/\/$/, '')

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
                .select('id, monto_mensual, facturacion_activa, payment_deadline, created_at')
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
                .select('id, unit_id, fecha_ingreso, created_at, status, debt_amount')
                .eq('condominium_id', condoId)

            if (residentsError) throw residentsError

            // 3. Fetch resident invoices for the selected year
            const yearStart = `${year}-01-01`
            const yearEnd = `${year}-12-31`
            const invoiceFields = 'amount, balance_due, status, resident_id, unit_id, invoice_type, created_at, due_date'
            const { data: yearInvoices, error: invoiceError } = await adminSupabase
                .from('resident_invoices')
                .select(invoiceFields)
                .eq('condominium_id', condoId)
                .gte('due_date', yearStart)
                .lte('due_date', yearEnd)

            if (invoiceError) throw invoiceError

            // Deuda sin pagar de años anteriores: cuenta en "Saldo Inicial (Arrastre)"
            const { data: priorUnpaid, error: priorError } = await adminSupabase
                .from('resident_invoices')
                .select(invoiceFields)
                .eq('condominium_id', condoId)
                .lt('due_date', yearStart)
                .in('status', ['pending', 'overdue'])

            if (priorError) throw priorError
            const invoices = [...(yearInvoices || []), ...(priorUnpaid || [])]

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

        // Solo el equipo de la organización dueña del condominio puede mover dinero
        // (antes bastaba con tener sesión, incluso un residente).
        const orgId = await getFinanceOrgForCondo(adminSupabase, user.id, condoId)
        if (!orgId) {
            return NextResponse.json({ error: 'No tienes permiso para operar las finanzas de esta propiedad' }, { status: 403 })
        }

        // Registrar dinero emite un recibo firmado por quien lo registra: debe
        // tener su firma cargada y no puede ser seguridad.
        if (body.action === 'add_credit' || body.action === 'register_payment') {
            const signing = await checkCanSignPayments(adminSupabase, user.id, orgId)
            if (!signing.ok) {
                return NextResponse.json({ error: signing.error }, { status: 403 })
            }
        }

        // ── Saldo a favor: suma el excedente de un pago al crédito del residente ──
        if (body.action === 'add_credit') {
            const amount = Math.round(Number(body.amount) * 100) / 100
            if (!body.residentId || !(amount > 0)) {
                return NextResponse.json({ error: 'residentId y amount (mayor a 0) son requeridos' }, { status: 400 })
            }
            const { data: res } = await adminSupabase.from('residents').select('id, credit_amount, condominium_id').eq('id', body.residentId).maybeSingle()
            if (!res || res.condominium_id !== condoId) {
                return NextResponse.json({ error: 'Residente no encontrado' }, { status: 404 })
            }
            const newCredit = Math.round((Number(res.credit_amount || 0) + amount) * 100) / 100
            const { error } = await adminSupabase.from('residents').update({ credit_amount: newCredit }).eq('id', res.id)
            if (error) throw error
            // El anticipo es dinero que entró hoy: se registra como pago sin factura
            // para que cuente en Ingresos del Mes y en el Corte de Caja.
            const advanceId = randomUUID()
            const { data: advance, error: advanceError } = await adminSupabase
                .from('resident_invoice_payments')
                .insert({
                    id: advanceId,
                    invoice_id: null,
                    resident_id: res.id,
                    condominium_id: condoId,
                    organization_id: orgId,
                    amount,
                    folio: `REC-${advanceId.substring(0, 8).toUpperCase()}`,
                    payment_method: body.paymentMethod || 'Efectivo',
                    notes: 'Anticipo · saldo a favor',
                    paid_at: new Date().toISOString(),
                    created_by: user.id,
                })
                .select()
                .single()
            if (advanceError) console.error('[add_credit] No se pudo registrar el anticipo:', advanceError)
            else await issuePaymentReceipt(adminSupabase, advanceId, 'manual')
            return NextResponse.json({ success: true, credit_amount: newCredit, payment: advance })
        }

        // ── Recibo al residente por WhatsApp + correo (flujo n8n 37) ──
        if (body.action === 'send_receipt') {
            const { data: res } = await adminSupabase
                .from('residents')
                .select('id, first_name, last_name, phone, email, condominium_id, units(unit_number), condominiums(name)')
                .eq('id', body.residentId)
                .maybeSingle()
            if (!res || res.condominium_id !== condoId) {
                return NextResponse.json({ error: 'Residente no encontrado' }, { status: 404 })
            }
            const unit = (Array.isArray(res.units) ? res.units[0] : res.units) as { unit_number?: string } | null
            const condo = (Array.isArray(res.condominiums) ? res.condominiums[0] : res.condominiums) as { name?: string } | null
            const items = Array.isArray(body.items) ? body.items.slice(0, 30).map((i: { concept?: string, period?: string, amount?: number }) => ({
                concept: String(i.concept || 'Pago').slice(0, 120),
                period: String(i.period || '').slice(0, 60),
                amount: Number(i.amount) || 0,
            })) : []
            const r = await fetch(`${N8N_BASE()}/webhook/recibo-pago-residente`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: `${res.first_name || ''} ${res.last_name || ''}`.trim(),
                    phone: body.sendWhatsApp === false ? '' : (res.phone || ''),
                    email: body.sendEmail === false ? '' : (res.email || ''),
                    total: Number(body.total) || 0,
                    remaining: Number(body.remaining) || 0,
                    method: String(body.method || 'Efectivo'),
                    folio: String(body.folio || ''),
                    date: new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' }),
                    condominium: condo?.name || '',
                    unit: unit?.unit_number || '',
                    items,
                }),
            }).catch(() => null)
            if (!r || !r.ok) {
                return NextResponse.json({ error: 'No se pudo enviar el recibo' }, { status: 502 })
            }
            return NextResponse.json({ success: true, whatsapp: Boolean(res.phone) && body.sendWhatsApp !== false, email: Boolean(res.email) && body.sendEmail !== false })
        }

        if (body.action === 'register_payment') {
            const { invoiceId, amount, paymentMethod, notes, paidAt } = body
            // Un cobro que abarca varias cuotas comparte folio: así su recibo (y su
            // QR) amparan el total del cobro, no solo una cuota.
            const groupFolio = typeof body.folio === 'string' && /^REC-[A-Z0-9]{6,12}$/.test(body.folio) ? body.folio : null
            const paymentAmount = Number(amount)

            if (!invoiceId || !paymentAmount || paymentAmount <= 0) {
                return NextResponse.json({ error: 'invoiceId y amount (mayor a 0) son requeridos' }, { status: 400 })
            }

            const { data: invoice, error: invoiceFetchError } = await adminSupabase
                .from('resident_invoices')
                .select('id, amount, balance_due, status, paid_at, resident_id, condominium_id, organization_id')
                .eq('id', invoiceId)
                .single()

            if (invoiceFetchError || !invoice || invoice.condominium_id !== condoId) {
                return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
            }

            const currentBalance = Number(invoice.balance_due ?? invoice.amount)
            if (paymentAmount > currentBalance + 0.01) {
                return NextResponse.json({ error: `El monto excede el saldo pendiente ($${currentBalance.toFixed(2)})` }, { status: 400 })
            }

            // Pago con saldo a favor: se descuenta del crédito del residente (sin
            // permitir que quede negativo; el update condicionado evita carreras).
            const isCreditPayment = paymentMethod === 'Saldo a favor'
            if (isCreditPayment) {
                const { data: res } = await adminSupabase.from('residents').select('credit_amount').eq('id', invoice.resident_id).maybeSingle()
                const credit = Number(res?.credit_amount || 0)
                if (credit + 0.001 < paymentAmount) {
                    return NextResponse.json({ error: `Saldo a favor insuficiente ($${credit.toFixed(2)})` }, { status: 400 })
                }
                const { data: updated, error: creditError } = await adminSupabase
                    .from('residents')
                    .update({ credit_amount: Math.round((credit - paymentAmount) * 100) / 100 })
                    .eq('id', invoice.resident_id)
                    .eq('credit_amount', res?.credit_amount ?? 0)
                    .select('id')
                if (creditError) throw creditError
                if (!updated || updated.length === 0) {
                    return NextResponse.json({ error: 'El saldo a favor cambió, intenta de nuevo' }, { status: 409 })
                }
            }

            const paymentId = randomUUID()
            const folio = groupFolio || `REC-${paymentId.substring(0, 8).toUpperCase()}`
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
                    created_by: user.id,
                })
                .select()
                .single()

            if (paymentError) throw paymentError
            await issuePaymentReceipt(adminSupabase, paymentId, 'manual')

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

            // Si ya no le queda nada vencido, deja de aparecer como Moroso
            if (invoice.resident_id) {
                const todayMx = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
                const { count: stillOverdue, error: overdueError } = await adminSupabase
                    .from('resident_invoices')
                    .select('id', { count: 'exact', head: true })
                    .eq('resident_id', invoice.resident_id)
                    .in('status', ['pending', 'overdue'])
                    .gt('balance_due', 0)
                    .lt('due_date', todayMx)
                if (!overdueError && !stillOverdue) {
                    await adminSupabase
                        .from('residents')
                        .update({ status: 'active' })
                        .eq('id', invoice.resident_id)
                        .eq('status', 'delinquent')
                }
            }

            return NextResponse.json({ success: true, payment, invoice: updatedInvoice })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (err: any) {
        console.error('[API /properties/[id]/finance POST] Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
