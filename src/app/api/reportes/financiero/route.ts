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
    if (!method) return 'Sin especificar'
    const m = method.toLowerCase()
    if (m.includes('mercado')) return 'Mercado Pago'
    if (m.includes('efectivo')) return 'Efectivo'
    if (m.includes('transferencia') || m.includes('deposito') || m.includes('depósito')) return 'Transferencia / Depósito'
    return method
}

/**
 * Genera el reporte financiero mensual de una privada en PDF, para poder
 * adjuntarlo por WhatsApp (mismo patrón que /api/receipts: Twilio necesita
 * una URL pública GET que pueda descargar el archivo).
 */
export async function GET(req: Request) {
    const url = new URL(req.url)
    const condominiumId = url.searchParams.get('condominiumId')
    const mesInicio = url.searchParams.get('mesInicio')
    const mesFin = url.searchParams.get('mesFin')

    if (!condominiumId || !mesInicio || !mesFin) {
        return NextResponse.json({ error: 'Faltan parámetros: condominiumId, mesInicio, mesFin' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: condo } = await supabase
        .from('condominiums')
        .select('name')
        .eq('id', condominiumId)
        .maybeSingle()

    if (!condo) {
        return NextResponse.json({ error: 'Condominio no encontrado' }, { status: 404 })
    }

    const { data: invoices } = await supabase
        .from('resident_invoices')
        .select('amount, balance_due, status')
        .eq('condominium_id', condominiumId)
        .gte('due_date', mesInicio)
        .lt('due_date', mesFin)

    const { data: payments } = await supabase
        .from('resident_invoice_payments')
        .select('amount, payment_method')
        .eq('condominium_id', condominiumId)
        .gte('paid_at', mesInicio)
        .lt('paid_at', mesFin)

    const facturas = invoices || []
    const pagos = payments || []

    const numFacturas = facturas.length
    const numPagadas = facturas.filter(f => f.status === 'paid').length
    const numVencidas = facturas.filter(f => f.status === 'overdue').length
    const totalFacturado = facturas.reduce((sum, f) => sum + Number(f.amount || 0), 0)
    const totalCobrado = facturas.reduce((sum, f) => sum + (Number(f.amount || 0) - Number(f.balance_due || 0)), 0)
    const totalPendiente = facturas.reduce((sum, f) => sum + Number(f.balance_due || 0), 0)

    const porMetodo = new Map<string, { numPagos: number; total: number }>()
    for (const p of pagos) {
        const metodo = formatMetodo(p.payment_method)
        const actual = porMetodo.get(metodo) || { numPagos: 0, total: 0 }
        actual.numPagos += 1
        actual.total += Number(p.amount || 0)
        porMetodo.set(metodo, actual)
    }

    const mesLabel = `${MESES_ES[new Date(mesInicio + 'T00:00:00Z').getUTCMonth()]} ${new Date(mesInicio + 'T00:00:00Z').getUTCFullYear()}`
    const fechaGeneracion = formatFechaCorta(new Date())

    const doc = new jsPDF()

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE FINANCIERO', 14, 22)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Privada: ${condo.name}`, 150, 16)
    doc.text(`Periodo: ${mesLabel}`, 150, 23)

    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN DE FACTURACIÓN', 14, 50)

    autoTable(doc, {
        head: [['Facturas', 'Pagadas', 'Vencidas', 'Total Facturado', 'Total Cobrado', 'Total Pendiente']],
        body: [[
            String(numFacturas),
            String(numPagadas),
            String(numVencidas),
            `$${totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `$${totalCobrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `$${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
        ]],
        startY: 56,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    const yDespuesResumen = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('DESGLOSE POR MÉTODO DE PAGO', 14, yDespuesResumen)

    const filasMetodos = Array.from(porMetodo.entries()).map(([metodo, datos]) => [
        metodo,
        String(datos.numPagos),
        `$${datos.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
    ])

    autoTable(doc, {
        head: [['Método de Pago', 'Pagos', 'Total Cobrado']],
        body: filasMetodos.length > 0 ? filasMetodos : [['Sin pagos registrados en el periodo', '', '']],
        startY: yDespuesResumen + 6,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.setFont('helvetica', 'normal')
    doc.text(`Generado el ${fechaGeneracion} por InmobiGo SaaS.`, 14, 285)

    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

    return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `inline; filename="Reporte_Financiero_${condo.name.replace(/\s+/g, '_')}_${mesLabel.replace(/\s+/g, '_')}.pdf"`,
            'Cache-Control': 'no-store',
        },
    })
}
