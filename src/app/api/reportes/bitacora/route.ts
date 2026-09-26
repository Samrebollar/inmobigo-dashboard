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

const ICONOS: Record<string, string> = { access: 'Acceso', delivery: 'Paqueteria', amenity: 'Amenidad' }

/**
 * Genera el reporte de bitacora de un dia especifico de una privada en PDF,
 * para adjuntar por WhatsApp (mismo patron que /api/reportes/financiero).
 */
export async function GET(req: Request) {
    const url = new URL(req.url)
    const condominiumId = url.searchParams.get('condominiumId')
    const fecha = url.searchParams.get('fecha')

    if (!condominiumId || !fecha) {
        return NextResponse.json({ error: 'Faltan parametros: condominiumId, fecha' }, { status: 400 })
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

    const desde = `${fecha}T00:00:00`
    const d = new Date(`${fecha}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + 1)
    const hasta = `${d.toISOString().slice(0, 10)}T00:00:00`

    const { data: entradas } = await supabase
        .from('bitacora_entries_view')
        .select('event_type, unit_number, person_name, guard_name, checked_in_at, checked_out_at, status, visitor_type, company, amenity_name')
        .eq('condominium_id', condominiumId)
        .gte('checked_in_at', desde)
        .lt('checked_in_at', hasta)
        .order('checked_in_at', { ascending: false })

    const filas = entradas || []
    const fechaGeneracion = formatFechaCorta(new Date())

    const doc = new jsPDF()

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE DE BITACORA', 14, 22)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Privada: ${condo.name}`, 150, 16)
    doc.text(`Dia: ${formatFechaCorta(new Date(`${fecha}T00:00:00Z`))}`, 150, 23)

    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.text(`RESUMEN — ${filas.length} evento(s)`, 14, 50)

    autoTable(doc, {
        head: [['Hora', 'Tipo', 'Persona / Empresa', 'Unidad', 'Detalle', 'Estatus']],
        body: filas.length > 0
            ? filas.map(f => [
                f.checked_in_at ? new Date(f.checked_in_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '',
                ICONOS[f.event_type || ''] || f.event_type || '',
                f.person_name || f.company || 'Sin nombre',
                f.unit_number || 's/u',
                f.amenity_name || f.visitor_type || '',
                f.status || '',
            ])
            : [['Sin actividad registrada este dia', '', '', '', '', '']],
        startY: 56,
        styles: { fontSize: 8, cellPadding: 4 },
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
            'Content-Disposition': `inline; filename="Reporte_Bitacora_${condo.name.replace(/\s+/g, '_')}_${fecha}.pdf"`,
            'Cache-Control': 'no-store',
        },
    })
}
