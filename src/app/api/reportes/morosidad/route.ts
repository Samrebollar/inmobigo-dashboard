import { NextResponse } from 'next/server'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createAdminClient } from '@/utils/supabase/admin'

export const runtime = 'nodejs'

function formatFechaCorta(d: Date) {
    const MESES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = MESES_ES[d.getMonth()].slice(0, 3)
    return `${dia} ${mes} ${d.getFullYear()}`
}

/**
 * Genera el reporte de morosidad de una privada en PDF, para adjuntar por WhatsApp
 * (mismo patron que /api/reportes/financiero).
 */
export async function GET(req: Request) {
    const url = new URL(req.url)
    const condominiumId = url.searchParams.get('condominiumId')

    if (!condominiumId) {
        return NextResponse.json({ error: 'Falta parametro: condominiumId' }, { status: 400 })
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

    const { data: morosos } = await supabase
        .from('resident_debt_aging_v')
        .select('resident_id, deuda_total, dias_max_atraso, nivel_riesgo')
        .eq('condominium_id', condominiumId)
        .order('dias_max_atraso', { ascending: false })

    const filas = morosos || []
    const residentIds = filas.map(f => f.resident_id)

    const { data: residentes } = residentIds.length > 0
        ? await supabase
            .from('residents')
            .select('id, first_name, last_name, unit_id')
            .in('id', residentIds)
        : { data: [] as { id: string; first_name: string | null; last_name: string | null; unit_id: string | null }[] }

    const unitIds = (residentes || []).map(r => r.unit_id).filter(Boolean) as string[]
    const { data: unidades } = unitIds.length > 0
        ? await supabase.from('units').select('id, unit_number').in('id', unitIds)
        : { data: [] as { id: string; unit_number: string | null }[] }

    const residentesMap = new Map((residentes || []).map(r => [r.id, r]))
    const unidadesMap = new Map((unidades || []).map(u => [u.id, u.unit_number]))

    const filasCompletas = filas.map(f => {
        const r = residentesMap.get(f.resident_id)
        return {
            nombre: r ? `${r.first_name || ''} ${r.last_name || ''}`.trim() : 'Sin nombre',
            unidad: r?.unit_id ? (unidadesMap.get(r.unit_id) || 's/u') : 's/u',
            monto: Number(f.deuda_total || 0),
            dias: f.dias_max_atraso,
        }
    })

    const deudaTotal = filasCompletas.reduce((sum, f) => sum + f.monto, 0)
    const fechaGeneracion = formatFechaCorta(new Date())

    const doc = new jsPDF()

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE DE MOROSIDAD', 14, 22)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Privada: ${condo.name}`, 150, 16)
    doc.text(`Generado: ${fechaGeneracion}`, 150, 23)

    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN', 14, 50)

    autoTable(doc, {
        head: [['Residentes morosos', 'Deuda total']],
        body: [[String(filasCompletas.length), `$${deudaTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]],
        startY: 56,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    const yDespues = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('DETALLE POR RESIDENTE', 14, yDespues)

    autoTable(doc, {
        head: [['Residente', 'Unidad', 'Monto', 'Dias de atraso']],
        body: filasCompletas.length > 0
            ? filasCompletas.map(f => [f.nombre, f.unidad || '', `$${f.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, String(f.dias)])
            : [['Sin residentes morosos', '', '', '']],
        startY: yDespues + 6,
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
            'Content-Disposition': `inline; filename="Reporte_Morosidad_${condo.name.replace(/\s+/g, '_')}.pdf"`,
            'Cache-Control': 'no-store',
        },
    })
}
