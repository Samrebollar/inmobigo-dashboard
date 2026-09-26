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

/**
 * Reporte ejecutivo de una privada: un solo PDF (one-pager) que combina
 * financiero + morosidad + bitacora del dia, pensado para presentar en
 * junta de condominio. Mismo patron de adjunto por WhatsApp que los
 * demas endpoints en /api/reportes.
 */
export async function GET(req: Request) {
    const url = new URL(req.url)
    const condominiumId = url.searchParams.get('condominiumId')
    const mesInicio = url.searchParams.get('mesInicio')
    const mesFin = url.searchParams.get('mesFin')

    if (!condominiumId || !mesInicio || !mesFin) {
        return NextResponse.json({ error: 'Faltan parametros: condominiumId, mesInicio, mesFin' }, { status: 400 })
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

    const [{ data: invoices }, { data: morosos }, { data: bitacoraHoy }] = await Promise.all([
        supabase
            .from('resident_invoices')
            .select('amount, balance_due, status')
            .eq('condominium_id', condominiumId)
            .gte('due_date', mesInicio)
            .lt('due_date', mesFin),
        supabase
            .from('resident_debt_aging_v')
            .select('resident_id, deuda_total, dias_max_atraso')
            .eq('condominium_id', condominiumId)
            .order('dias_max_atraso', { ascending: false })
            .limit(10),
        supabase
            .from('bitacora_entries_view')
            .select('event_type')
            .eq('condominium_id', condominiumId)
            .gte('checked_in_at', `${new Date().toISOString().slice(0, 10)}T00:00:00`),
    ])

    const facturas = invoices || []
    const totalFacturado = facturas.reduce((sum, f) => sum + Number(f.amount || 0), 0)
    const totalCobrado = facturas.reduce((sum, f) => sum + (Number(f.amount || 0) - Number(f.balance_due || 0)), 0)
    const totalPendiente = facturas.reduce((sum, f) => sum + Number(f.balance_due || 0), 0)
    const numVencidas = facturas.filter(f => f.status === 'overdue').length

    const filasMorosos = morosos || []
    const residentIds = filasMorosos.map(m => m.resident_id)
    const { data: residentes } = residentIds.length > 0
        ? await supabase.from('residents').select('id, first_name, last_name, unit_id').in('id', residentIds)
        : { data: [] as { id: string; first_name: string | null; last_name: string | null; unit_id: string | null }[] }
    const unitIds = (residentes || []).map(r => r.unit_id).filter(Boolean) as string[]
    const { data: unidades } = unitIds.length > 0
        ? await supabase.from('units').select('id, unit_number').in('id', unitIds)
        : { data: [] as { id: string; unit_number: string | null }[] }
    const residentesMap = new Map((residentes || []).map(r => [r.id, r]))
    const unidadesMap = new Map((unidades || []).map(u => [u.id, u.unit_number]))

    const eventos = bitacoraHoy || []
    const accesos = eventos.filter(e => e.event_type === 'access').length
    const paqueteria = eventos.filter(e => e.event_type === 'delivery').length
    const amenidades = eventos.filter(e => e.event_type === 'amenity').length

    const mesLabel = `${MESES_ES[new Date(`${mesInicio}T00:00:00Z`).getUTCMonth()]} ${new Date(`${mesInicio}T00:00:00Z`).getUTCFullYear()}`
    const fechaGeneracion = formatFechaCorta(new Date())

    const doc = new jsPDF()

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE EJECUTIVO', 14, 22)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Privada: ${condo.name}`, 150, 16)
    doc.text(`Periodo: ${mesLabel}`, 150, 23)

    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.text('1. FINANZAS DEL MES', 14, 50)

    autoTable(doc, {
        head: [['Total facturado', 'Total cobrado', 'Total pendiente', 'Facturas vencidas']],
        body: [[
            `$${totalFacturado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `$${totalCobrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            `$${totalPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            String(numVencidas),
        ]],
        startY: 56,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    let y = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('2. TOP 10 MOROSOS', 14, y)

    autoTable(doc, {
        head: [['Residente', 'Unidad', 'Deuda', 'Dias de atraso']],
        body: filasMorosos.length > 0
            ? filasMorosos.map(m => {
                const r = residentesMap.get(m.resident_id)
                const nombre = r ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : 'Sin nombre'
                const unidad = r?.unit_id ? (unidadesMap.get(r.unit_id) || 's/u') : 's/u'
                return [nombre, unidad || '', `$${Number(m.deuda_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, String(m.dias_max_atraso)]
            })
            : [['Sin residentes morosos', '', '', '']],
        startY: y + 6,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    y = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('3. ACTIVIDAD DE HOY', 14, y)

    autoTable(doc, {
        head: [['Accesos', 'Paqueteria', 'Uso de amenidades']],
        body: [[String(accesos), String(paqueteria), String(amenidades)]],
        startY: y + 6,
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
            'Content-Disposition': `inline; filename="Reporte_Ejecutivo_${condo.name.replace(/\s+/g, '_')}_${mesLabel.replace(/\s+/g, '_')}.pdf"`,
            'Cache-Control': 'no-store',
        },
    })
}
