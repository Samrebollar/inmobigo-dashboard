import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createAdminClient } from '@/utils/supabase/admin'

export const runtime = 'nodejs'

const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

function formatFechaCorta(d: Date) {
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = MESES_ES[d.getMonth()].slice(0, 3)
    return `${dia} ${mes} ${d.getFullYear()}`
}

function formatMetodo(method?: string | null): string {
    if (!method) return 'Transferencia / Depósito'
    const m = method.toLowerCase()
    if (m.includes('mercado')) return 'Mercado Pago'
    if (m.includes('efectivo')) return 'Efectivo'
    if (m.includes('transferencia') || m.includes('deposito') || m.includes('depósito')) return 'Transferencia / Depósito'
    return method
}

/**
 * Genera el mismo recibo en PDF que el residente descarga desde su portal
 * (ver generateReceiptForResident en resident-payments-client.tsx), pero
 * server-side, para poder adjuntarlo como documento en WhatsApp (Twilio
 * necesita una URL pública que pueda descargar, no un archivo generado en
 * el navegador del residente).
 */
export async function GET(req: Request, { params }: { params: Promise<{ paymentId: string }> }) {
    const { paymentId } = await params
    const url = new URL(req.url)
    const residentId = url.searchParams.get('residentId')

    if (!residentId) {
        return NextResponse.json({ error: 'Falta residentId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: payment } = await supabase
        .from('payments')
        .select('id, invoice_id, amount, payment_method, payment_type, mp_payment_id, paid_at, condominium_id, unit_id')
        .eq('id', paymentId)
        .maybeSingle()

    if (!payment) {
        return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('first_name, last_name, condominiums(name), units(unit_number)')
        .eq('id', residentId)
        .maybeSingle()

    if (!resident) {
        return NextResponse.json({ error: 'Residente no encontrado' }, { status: 404 })
    }

    let folio = payment.mp_payment_id ? `MP-${String(payment.mp_payment_id).slice(-8)}` : `PAY-${String(payment.id).slice(0, 8).toUpperCase()}`
    let concepto = 'Cuota de mantenimiento'

    if (payment.payment_type === 'factura' && payment.invoice_id) {
        const { data: invoice } = await supabase
            .from('invoices')
            .select('folio, description')
            .eq('id', payment.invoice_id)
            .maybeSingle()
        if (invoice?.folio) folio = invoice.folio
        if (invoice?.description) concepto = invoice.description
    } else if (payment.payment_type === 'convenio') {
        concepto = 'Cuota de convenio de pago'
    } else if (payment.payment_type === 'deposito_amenidad') {
        concepto = 'Depósito de amenidad'
    }

    const residentName = `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
    const condoName = (resident as any).condominiums?.name || ''
    const unitNumber = (resident as any).units?.unit_number || ''
    const fecha = formatFechaCorta(payment.paid_at ? new Date(payment.paid_at) : new Date())

    const doc = new jsPDF()

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('RECIBO DE PAGO', 14, 22)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Folio: ${folio}`, 150, 16)
    doc.text(`Fecha: ${fecha}`, 150, 23)

    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMACIÓN DEL RESIDENTE', 14, 50)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Nombre: ${residentName}`, 14, 60)
    if (condoName) doc.text(`Condominio: ${condoName}`, 14, 66)
    if (unitNumber) doc.text(`Unidad: ${unitNumber}`, 14, 72)
    doc.setDrawColor(220, 220, 220)
    doc.line(14, 82, 196, 82)

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('DETALLES DEL PAGO', 14, 94)

    autoTable(doc, {
        head: [['Concepto', 'Monto Pagado', 'Forma de Pago', 'Fecha']],
        body: [[
            concepto,
            `$${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            formatMetodo(payment.payment_method),
            fecha,
        ]],
        startY: 100,
        styles: { fontSize: 10, cellPadding: 5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 60)
    doc.text(`Total Procesado: $${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 120, finalY)

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text('Este documento es un comprobante de operación digital generado por InmobiGo SaaS.', 14, 275)
    doc.text('Conserve este recibo para cualquier aclaración futura.', 14, 281)

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="Recibo_${folio}.pdf"`,
            'Cache-Control': 'no-store',
        },
    })
}
