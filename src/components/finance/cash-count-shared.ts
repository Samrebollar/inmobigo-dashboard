import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type CashCountStatus = 'cuadrado' | 'faltante' | 'sobrante'

export type CashCountRecord = {
    id: string
    count_date: string
    condominium?: string
    counted_by: string
    counted_for: string
    counted_for_id?: string | null
    expected_amount: number
    counted_amount: number
    difference: number
    status: CashCountStatus | string
    denominations?: Record<string, number>
    payments_count?: number
    notes: string
    created_at: string
}

// Billetes y monedas en circulación en México
export const DENOMINATIONS: { value: number, label: string, kind: 'billete' | 'moneda' }[] = [
    { value: 1000, label: '$1,000', kind: 'billete' },
    { value: 500, label: '$500', kind: 'billete' },
    { value: 200, label: '$200', kind: 'billete' },
    { value: 100, label: '$100', kind: 'billete' },
    { value: 50, label: '$50', kind: 'billete' },
    { value: 20, label: '$20', kind: 'billete' },
    { value: 10, label: '$10', kind: 'moneda' },
    { value: 5, label: '$5', kind: 'moneda' },
    { value: 2, label: '$2', kind: 'moneda' },
    { value: 1, label: '$1', kind: 'moneda' },
    { value: 0.5, label: '50¢', kind: 'moneda' },
]

export const money = (n: number) => `$${(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const statusOf = (diff: number): CashCountStatus => Math.abs(diff) < 0.005 ? 'cuadrado' : diff < 0 ? 'faltante' : 'sobrante'

export const STATUS_UI: Record<CashCountStatus, { label: (diff: number) => string, cls: string, dot: string }> = {
    cuadrado: { label: () => 'Cuadra', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
    faltante: { label: (d) => `Faltan ${money(Math.abs(d))}`, cls: 'bg-rose-500/10 text-rose-300 border-rose-500/30', dot: 'bg-rose-400' },
    sobrante: { label: (d) => `Sobran ${money(Math.abs(d))}`, cls: 'bg-amber-500/10 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
}

export const longDate = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/** Acta de arqueo en PDF, con firmas de quien arqueó y de la persona arqueada. */
export function downloadCashCountPdf(c: CashCountRecord, condoLabel: string) {
    const st = statusOf(c.difference)
    const doc = new jsPDF()
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 32, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('ACTA DE ARQUEO DE CAJA', 14, 20)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(longDate(c.count_date), 196, 14, { align: 'right' })
    doc.text(condoLabel || c.condominium || '', 196, 21, { align: 'right' })

    doc.setTextColor(40, 40, 40)
    doc.setFontSize(11)
    doc.text(`Persona arqueada: ${c.counted_for}`, 14, 44)
    doc.text(`Arqueo realizado por: ${c.counted_by}`, 14, 51)
    doc.text(`Hora del arqueo: ${new Date(c.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })}`, 14, 58)

    const denomRows = DENOMINATIONS
        .filter(d => Number(c.denominations?.[String(d.value)] || 0) > 0)
        .map(d => {
            const qty = Number(c.denominations?.[String(d.value)] || 0)
            return [`${d.kind === 'billete' ? 'Billete' : 'Moneda'} ${d.label}`, String(qty), money(qty * d.value)]
        })
    let y = 66
    if (denomRows.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [['Denominación', 'Cantidad', 'Importe']],
            body: denomRows,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [79, 70, 229] },
            columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
        })
        y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    }

    autoTable(doc, {
        startY: y,
        body: [
            ['Efectivo según sistema', money(c.expected_amount)],
            ['Efectivo contado', money(c.counted_amount)],
            [st === 'cuadrado' ? 'Resultado' : st === 'faltante' ? 'Faltante' : 'Sobrante', st === 'cuadrado' ? 'Cuadra' : money(Math.abs(c.difference))],
        ],
        styles: { fontSize: 11, cellPadding: 4 },
        columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' } },
        didParseCell: (data) => {
            if (data.row.index === 2) {
                data.cell.styles.textColor = st === 'cuadrado' ? [5, 150, 105] : st === 'faltante' ? [225, 29, 72] : [217, 119, 6]
                data.cell.styles.fontStyle = 'bold'
            }
        },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

    if (c.notes) {
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Observaciones:', 14, y)
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(90, 90, 90)
        const lines = doc.splitTextToSize(c.notes, 180)
        doc.text(lines, 14, y + 6)
        y += 10 + lines.length * 5
    }

    y = Math.max(y + 25, 230)
    doc.setDrawColor(160, 160, 160)
    doc.line(20, y, 90, y)
    doc.line(120, y, 190, y)
    doc.setFontSize(9)
    doc.setTextColor(90, 90, 90)
    doc.text(c.counted_for, 55, y + 5, { align: 'center' })
    doc.text('Persona arqueada', 55, y + 10, { align: 'center' })
    doc.text(c.counted_by, 155, y + 5, { align: 'center' })
    doc.text('Realizó el arqueo', 155, y + 10, { align: 'center' })

    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text('Documento generado por InmobiGo.', 14, 285)
    doc.save(`Arqueo_${c.count_date}_${c.counted_for.replace(/\s+/g, '_')}.pdf`)
}
