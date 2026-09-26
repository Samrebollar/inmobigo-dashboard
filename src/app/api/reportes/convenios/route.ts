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

const ETIQUETAS: Record<string, string> = { approved: 'Aprobado', pending: 'Pendiente', rejected: 'Rechazado' }

/**
 * Genera el reporte de convenios de pago de una privada en PDF, para adjuntar por WhatsApp
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

    const { data: residentesCondo } = await supabase
        .from('residents')
        .select('id, unit_id')
        .eq('condominium_id', condominiumId)

    const residentIds = (residentesCondo || []).map(r => r.id)
    const unitIdByResident = new Map((residentesCondo || []).map(r => [r.id, r.unit_id]))

    const { data: convenios } = residentIds.length > 0
        ? await supabase
            .from('payment_agreements')
            .select('resident_id, resident_name, status, num_installments, total_debt, created_at')
            .in('resident_id', residentIds)
            .order('created_at', { ascending: false })
        : { data: [] as { resident_id: string; resident_name: string | null; status: string | null; num_installments: number | null; total_debt: number | null; created_at: string | null }[] }

    const filas = convenios || []
    const unitIds = filas.map(f => unitIdByResident.get(f.resident_id)).filter(Boolean) as string[]
    const { data: unidades } = unitIds.length > 0
        ? await supabase.from('units').select('id, unit_number').in('id', unitIds)
        : { data: [] as { id: string; unit_number: string | null }[] }
    const unidadesMap = new Map((unidades || []).map(u => [u.id, u.unit_number]))

    const aprobados = filas.filter(f => f.status === 'approved').length
    const pendientes = filas.filter(f => f.status === 'pending').length
    const rechazados = filas.filter(f => f.status === 'rejected').length
    const deudaCubierta = filas.filter(f => f.status === 'approved').reduce((sum, f) => sum + Number(f.total_debt || 0), 0)

    const fechaGeneracion = formatFechaCorta(new Date())

    const doc = new jsPDF()

    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setFontSize(22)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.text('REPORTE DE CONVENIOS', 14, 22)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Privada: ${condo.name}`, 150, 16)
    doc.text(`Generado: ${fechaGeneracion}`, 150, 23)

    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.text('RESUMEN', 14, 50)

    autoTable(doc, {
        head: [['Total', 'Aprobados', 'Pendientes', 'Rechazados', 'Deuda cubierta']],
        body: [[String(filas.length), String(aprobados), String(pendientes), String(rechazados), `$${deudaCubierta.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`]],
        startY: 56,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
    })

    const yDespues = (doc as any).lastAutoTable.finalY + 15
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('DETALLE DE CONVENIOS', 14, yDespues)

    autoTable(doc, {
        head: [['Residente', 'Unidad', 'Estatus', 'Cuotas', 'Monto', 'Fecha']],
        body: filas.length > 0
            ? filas.map(f => [
                f.resident_name || 'Sin nombre',
                unitIdByResident.get(f.resident_id) ? (unidadesMap.get(unitIdByResident.get(f.resident_id)!) || 's/u') : 's/u',
                ETIQUETAS[f.status || ''] || f.status || '',
                String(f.num_installments ?? ''),
                `$${Number(f.total_debt || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                f.created_at ? formatFechaCorta(new Date(f.created_at)) : '',
            ])
            : [['Sin convenios registrados', '', '', '', '', '']],
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
            'Content-Disposition': `inline; filename="Reporte_Convenios_${condo.name.replace(/\s+/g, '_')}.pdf"`,
            'Cache-Control': 'no-store',
        },
    })
}
