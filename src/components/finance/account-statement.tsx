'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, FileSpreadsheet, Download } from 'lucide-react'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getLocalDateParts } from '@/utils/finance-utils'

/**
 * Estado de cuenta mensual de un residente (PDF o Excel). Lo usan el panel del
 * residente (Pagos) y el detalle del residente en el panel del administrador,
 * para que ambos generen exactamente el mismo documento.
 */

const MESES_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

type Num = number | string | null | undefined

export type StatementInvoice = {
    status?: string | null
    due_date?: string | null
    created_at?: string | null
    amount?: Num
    balance_due?: Num
    folio?: string | null
    description?: string | null
}

export type StatementPayment = {
    paid_at?: string | null
    created_at?: string | null
    amount?: Num
    folio?: string | null
    concept?: string | null
    payment_method?: string | null
}

const money = (n: Num) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function formatDate(dateStr: string) {
    const parts = getLocalDateParts(dateStr)
    if (!parts) return ''
    return `${String(parts.day).padStart(2, '0')} ${MESES_ES[parts.month]?.slice(0, 3) || ''} ${parts.year}`
}

const lastTableY = (doc: jsPDF) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

function mapStatus(status: string) {
    const map: Record<string, string> = { paid: 'Pagado', pending: 'Pendiente', overdue: 'Vencido', cancelled: 'Cancelado' }
    return map[status] || status
}

function formatPaymentMethod(method?: string | null): string {
    if (!method || method === 'N/A') return 'Transferencia / Depósito'
    const m = method.toLowerCase()
    if (m.includes('mercado')) return 'Mercado Pago'
    if (m.includes('efectivo')) return 'Efectivo'
    if (m.includes('transferencia') || m.includes('depósito') || m.includes('deposito')) return 'Transferencia / Depósito'
    return method
}

// ─── ESTADO DE CUENTA MENSUAL ─────────────────────────────────────────────────
// Mes contable de una fecha: 'YYYY-MM-DD' se toma tal cual; los timestamps se
// convierten a hora de México para no brincar de mes por la zona horaria.
export function statementMonthKey(value?: string | null): string | null {
    if (!value) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7)
    const d = new Date(value)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' }).slice(0, 7)
}

export function statementMonthLabel(key: string) {
    const [y, m] = key.split('-').map(Number)
    return `${MESES_ES[m - 1]} ${y}`
}

type StatementParams = {
    residentName: string
    condoName: string
    unitNumber?: string
    monthKey: string
    invoices: StatementInvoice[]
    payments: StatementPayment[]
    saldoTotal: number
    saldoFavor: number
}

function buildStatement(params: StatementParams) {
    const { monthKey, invoices, payments } = params
    const cargos = invoices
        .filter(i => i.status !== 'cancelled' && statementMonthKey(i.due_date || i.created_at) === monthKey)
        .sort((a, b) => String(a.due_date || a.created_at).localeCompare(String(b.due_date || b.created_at)))
        .map(i => {
            const cargo = Number(i.amount || 0)
            const saldo = i.status === 'paid' ? 0 : Number(i.balance_due ?? cargo)
            return {
                vencimiento: formatDate(i.due_date || i.created_at || ''),
                folio: i.folio || '—',
                concepto: i.description || 'Cuota de mantenimiento',
                cargo,
                pagado: Math.max(0, cargo - saldo),
                saldo,
                estado: mapStatus(i.status || ''),
            }
        })
    const pagos = payments
        .filter(p => statementMonthKey(p.paid_at || p.created_at) === monthKey)
        .sort((a, b) => String(a.paid_at || a.created_at).localeCompare(String(b.paid_at || b.created_at)))
        .map(p => ({
            fecha: formatDate(p.paid_at || p.created_at || ''),
            folio: p.folio || '—',
            concepto: p.concept || 'Cuota de mantenimiento',
            forma: formatPaymentMethod(p.payment_method),
            monto: Number(p.amount || 0),
        }))
    const totalCargos = cargos.reduce((s, c) => s + c.cargo, 0)
    const pendienteMes = cargos.reduce((s, c) => s + c.saldo, 0)
    const totalPagado = pagos.reduce((s, p) => s + p.monto, 0)
    const periodo = statementMonthLabel(monthKey)
    const fileBase = `Estado_de_cuenta_${(params.unitNumber || params.residentName).replace(/\s+/g, '_')}_${periodo.replace(' ', '_')}`
    return { cargos, pagos, totalCargos, pendienteMes, totalPagado, periodo, fileBase }
}

/**
 * Estado de cuenta de un mes en PDF: resumen del mes, cargos con vencimiento
 * en ese mes y pagos recibidos en ese mes, más el saldo total a la fecha.
 */
export function generateAccountStatementPdf(params: StatementParams) {
    const { residentName, condoName, unitNumber, saldoTotal, saldoFavor } = params
    const st = buildStatement(params)
    const doc = new jsPDF()
    const emision = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })

    // Encabezado (mismo estilo que el recibo de pago)
    doc.setFillColor(79, 70, 229)
    doc.rect(0, 0, 210, 35, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('ESTADO DE CUENTA', 14, 18)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Periodo: ${st.periodo}`, 14, 27)
    doc.setFontSize(10)
    doc.text('InmobiGo', 196, 16, { align: 'right' })
    doc.text(`Emitido: ${emision}`, 196, 23, { align: 'right' })

    // Datos del residente
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('RESIDENTE', 14, 48)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Nombre: ${residentName}`, 14, 56)
    if (condoName) doc.text(`Condominio: ${condoName}`, 14, 62)
    if (unitNumber) doc.text(`Unidad: ${unitNumber}`, 14, 68)

    // Resumen del mes
    autoTable(doc, {
        startY: 76,
        head: [[`Resumen de ${st.periodo}`, 'Monto']],
        body: [
            ['Cargos del mes', money(st.totalCargos)],
            ['Pagos recibidos en el mes', money(st.totalPagado)],
            ['Pendiente de los cargos del mes', money(st.pendienteMes)],
            ['Saldo a favor (hoy)', money(saldoFavor)],
            [{ content: 'SALDO TOTAL A LA FECHA DE EMISIÓN', styles: { fontStyle: 'bold' } }, { content: money(saldoTotal), styles: { fontStyle: 'bold', textColor: saldoTotal > 0 ? [190, 18, 60] : [5, 150, 105] } }],
        ],
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [79, 70, 229] },
        columnStyles: { 1: { halign: 'right', cellWidth: 50 } },
        margin: { left: 14, right: 14 },
    })

    // Cargos
    let y = lastTableY(doc) + 12
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(40, 40, 40)
    doc.text('CARGOS DEL MES', 14, y)
    autoTable(doc, {
        startY: y + 4,
        head: [['Vencimiento', 'Folio', 'Concepto', 'Cargo', 'Pagado', 'Saldo', 'Estado']],
        body: st.cargos.length === 0
            ? [[{ content: 'Sin cargos en este mes', colSpan: 7, styles: { halign: 'center', textColor: [120, 120, 120] } }]]
            : st.cargos.map(c => [c.vencimiento, c.folio, c.concepto, money(c.cargo), money(c.pagado), money(c.saldo), c.estado]),
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
        margin: { left: 14, right: 14 },
    })

    // Pagos
    y = lastTableY(doc) + 12
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('PAGOS RECIBIDOS EN EL MES', 14, y)
    autoTable(doc, {
        startY: y + 4,
        head: [['Fecha', 'Folio', 'Concepto', 'Forma de pago', 'Monto']],
        body: st.pagos.length === 0
            ? [[{ content: 'Sin pagos en este mes', colSpan: 5, styles: { halign: 'center', textColor: [120, 120, 120] } }]]
            : [
                ...st.pagos.map(p => [p.fecha, p.folio, p.concepto, p.forma, money(p.monto)]),
                [{ content: 'Total pagado', colSpan: 4, styles: { fontStyle: 'bold' } }, { content: money(st.totalPagado), styles: { fontStyle: 'bold' } }],
            ],
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [5, 150, 105] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { 4: { halign: 'right' } },
        margin: { left: 14, right: 14 },
    })

    // Pie de página en todas las hojas
    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text('Documento informativo generado por InmobiGo. Para cualquier aclaración, contacta a la administración de tu condominio.', 14, 287)
        doc.text(`Página ${i} de ${pages}`, 196, 287, { align: 'right' })
    }

    doc.save(`${st.fileBase}.pdf`)
}

/** Mismo estado de cuenta mensual en Excel: hojas Resumen, Cargos y Pagos. */
export function generateAccountStatementExcel(params: StatementParams) {
    const { residentName, condoName, unitNumber, saldoTotal, saldoFavor } = params
    const st = buildStatement(params)
    const emision = new Date().toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })

    const resumen = XLSX.utils.aoa_to_sheet([
        ['ESTADO DE CUENTA'],
        ['Periodo', st.periodo],
        ['Emitido', emision],
        ['Residente', residentName],
        ['Condominio', condoName || '—'],
        ['Unidad', unitNumber || '—'],
        [],
        ['Concepto', 'Monto'],
        ['Cargos del mes', st.totalCargos],
        ['Pagos recibidos en el mes', st.totalPagado],
        ['Pendiente de los cargos del mes', st.pendienteMes],
        ['Saldo a favor (hoy)', saldoFavor],
        ['Saldo total a la fecha de emisión', saldoTotal],
    ])
    resumen['!cols'] = [{ wch: 34 }, { wch: 22 }]

    const cargos = XLSX.utils.json_to_sheet(
        st.cargos.map(c => ({ Vencimiento: c.vencimiento, Folio: c.folio, Concepto: c.concepto, Cargo: c.cargo, Pagado: c.pagado, Saldo: c.saldo, Estado: c.estado })),
        { header: ['Vencimiento', 'Folio', 'Concepto', 'Cargo', 'Pagado', 'Saldo', 'Estado'] }
    )
    cargos['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }]

    const pagos = XLSX.utils.json_to_sheet(
        st.pagos.map(p => ({ Fecha: p.fecha, Folio: p.folio, Concepto: p.concepto, 'Forma de pago': p.forma, Monto: p.monto })),
        { header: ['Fecha', 'Folio', 'Concepto', 'Forma de pago', 'Monto'] }
    )
    pagos['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 18 }, { wch: 12 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, resumen, 'Resumen')
    XLSX.utils.book_append_sheet(wb, cargos, 'Cargos')
    XLSX.utils.book_append_sheet(wb, pagos, 'Pagos')
    XLSX.writeFile(wb, `${st.fileBase}.xlsx`)
}

type AccountStatementModalProps = {
    open: boolean
    onClose: () => void
    residentName: string
    condoName: string
    unitNumber?: string
    invoices: StatementInvoice[]
    payments: StatementPayment[]
    saldoTotal: number
    saldoFavor: number
}

export function AccountStatementModal({ open, onClose, residentName, condoName, unitNumber, invoices, payments, saldoTotal, saldoFavor }: AccountStatementModalProps) {
    // Meses disponibles: del primer movimiento al mes en curso (máximo 2 años atrás)
    const statementMonths = useMemo(() => {
        const currentKey = statementMonthKey(new Date().toISOString())!
        const keys = [
            ...invoices.map(i => statementMonthKey(i.due_date || i.created_at)),
            ...payments.map(p => statementMonthKey(p.paid_at || p.created_at)),
        ].filter((k): k is string => !!k && k <= currentKey)
        let first = keys.length ? keys.reduce((a, b) => (a < b ? a : b)) : currentKey
        const [cy, cm] = currentKey.split('-').map(Number)
        const minKey = `${cy - 2}-${String(cm).padStart(2, '0')}`
        if (first < minKey) first = minKey
        const out: string[] = []
        let [y, m] = [cy, cm]
        while (true) {
            const k = `${y}-${String(m).padStart(2, '0')}`
            if (k < first) break
            out.push(k)
            m -= 1
            if (m === 0) { m = 12; y -= 1 }
        }
        return out
    }, [invoices, payments])

    const [pickedMonth, setStatementMonth] = useState<string>('')
    const statementMonth = statementMonths.includes(pickedMonth) ? pickedMonth : statementMonths[0]
    const [statementFormat, setStatementFormat] = useState<'pdf' | 'excel'>('pdf')

    const handleDownloadStatement = () => {
        const monthKey = statementMonth || statementMonths[0]
        const params = { residentName, condoName, unitNumber, monthKey, invoices, payments, saldoTotal, saldoFavor }
        try {
            if (statementFormat === 'excel') generateAccountStatementExcel(params)
            else generateAccountStatementPdf(params)
            toast.success(`Estado de cuenta de ${statementMonthLabel(monthKey)} descargado`)
            onClose()
        } catch (e) {
            console.error('[EstadoDeCuenta] Error al generar:', e)
            toast.error('No se pudo generar el estado de cuenta')
        }
    }

    return (
        <AnimatePresence>
            {open && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => onClose()}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
                >
                    <button
                        onClick={() => onClose()}
                        className="absolute top-6 right-6 p-2 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-center gap-3 mb-6 pr-10">
                        <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-indigo-300" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white">Estado de cuenta</h3>
                            <p className="text-xs text-zinc-500">Elige el mes y el formato</p>
                        </div>
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Mes</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1 mb-6">
                        {statementMonths.map(k => (
                            <button
                                key={k}
                                onClick={() => setStatementMonth(k)}
                                className={cn(
                                    'rounded-xl border px-3 py-2.5 text-sm font-bold transition-all text-left',
                                    statementMonth === k
                                        ? 'border-indigo-500 bg-indigo-500/15 text-white shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                        : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-white'
                                )}
                            >
                                {statementMonthLabel(k)}
                            </button>
                        ))}
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Formato</p>
                    <div className="grid grid-cols-2 gap-3 mb-7">
                        <button
                            onClick={() => setStatementFormat('pdf')}
                            className={cn(
                                'flex items-center gap-3 rounded-2xl border p-4 transition-all',
                                statementFormat === 'pdf'
                                    ? 'border-rose-500/60 bg-rose-500/10'
                                    : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                            )}
                        >
                            <FileText className={cn('h-6 w-6', statementFormat === 'pdf' ? 'text-rose-400' : 'text-zinc-500')} />
                            <div className="text-left">
                                <p className="text-sm font-black text-white">PDF</p>
                                <p className="text-[11px] text-zinc-500">Para imprimir o compartir</p>
                            </div>
                        </button>
                        <button
                            onClick={() => setStatementFormat('excel')}
                            className={cn(
                                'flex items-center gap-3 rounded-2xl border p-4 transition-all',
                                statementFormat === 'excel'
                                    ? 'border-emerald-500/60 bg-emerald-500/10'
                                    : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700'
                            )}
                        >
                            <FileSpreadsheet className={cn('h-6 w-6', statementFormat === 'excel' ? 'text-emerald-400' : 'text-zinc-500')} />
                            <div className="text-left">
                                <p className="text-sm font-black text-white">Excel</p>
                                <p className="text-[11px] text-zinc-500">Para revisar tus números</p>
                            </div>
                        </button>
                    </div>

                    <Button
                        onClick={handleDownloadStatement}
                        disabled={!statementMonth}
                        className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Generar {statementFormat === 'excel' ? 'Excel' : 'PDF'}{statementMonth ? ` · ${statementMonthLabel(statementMonth)}` : ''}
                    </Button>
                </motion.div>
            </div>
            )}
        </AnimatePresence>
    )
}
