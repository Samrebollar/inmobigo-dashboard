'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import {
    CreditCard,
    Calendar,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    CheckCircle2,
    Clock,
    DollarSign,
    ShieldCheck,
    AlertCircle,
    History,
    Receipt,
    Loader2,
    Lock,
    Sparkles,
    AlertTriangle,
    Landmark,
    X,
    ArrowRightLeft,
    FileText,
    FileSpreadsheet,
    Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { calculateResidentMonthlyFinancials, calculateResidentDebtSummary, getLocalDateParts } from '@/utils/finance-utils'
import { createResidentPaymentCheckout } from '@/app/actions/mercadopago-payment-actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

interface ResidentPaymentsClientProps {
    resident: any
    invoices?: any[]
    unit?: {
        id?: string
        unit_number?: string
        monto_mensual?: number
        payment_deadline?: number
    } | null
    directPayments?: any[]
    mpConnected?: boolean
}

const MESES_ES: Record<number, string> = {
    0: 'Enero', 1: 'Febrero', 2: 'Marzo', 3: 'Abril',
    4: 'Mayo', 5: 'Junio', 6: 'Julio', 7: 'Agosto',
    8: 'Septiembre', 9: 'Octubre', 10: 'Noviembre', 11: 'Diciembre'
}

const MES_INDEX_BY_NAME: Record<string, number> = Object.fromEntries(
    Object.entries(MESES_ES).map(([idx, name]) => [name, Number(idx)])
)

// getLocalDateParts evita el bug de "new Date('2026-09-01')": al no traer hora,
// JS lo interpreta en UTC, y con un navegador en un huso horario negativo (México,
// UTC-6) .getDate()/.getMonth() locales lo corrían un día atrás (mostraba 31 Ago
// en vez de 01 Sep). getLocalDateParts ya resuelve esto (usado en toda la app vía
// finance-utils), extrayendo las partes en UTC cuando el string es solo fecha.
function formatDate(dateStr: string) {
    const parts = getLocalDateParts(dateStr)
    if (!parts) return ''
    const day = String(parts.day).padStart(2, '0')
    const month = MESES_ES[parts.month]?.slice(0, 3) || ''
    return `${day} ${month} ${parts.year}`
}

function mapStatus(status: string) {
    const map: Record<string, string> = {
        paid: 'Pagado',
        pending: 'Pendiente',
        overdue: 'Vencido',
        cancelled: 'Cancelado'
    }
    return map[status] || status
}

function formatReceiptPaymentMethod(method?: string | null): string {
    if (!method) return 'Transferencia / Depósito'
    const m = method.toLowerCase()
    if (m.includes('mercado')) return 'Mercado Pago'
    if (m.includes('efectivo')) return 'Efectivo'
    if (m.includes('transferencia') || m.includes('depósito') || m.includes('deposito')) return 'Transferencia / Depósito'
    return method
}

export async function generateReceiptForResident(payment: any, residentName: string, condoName: string, unitNumber?: string) {
    try {
        const folio = payment.folio
        if (!folio) return

        const doc = new jsPDF()
        // Header
        doc.setFillColor(79, 70, 229)
        doc.rect(0, 0, 210, 35, 'F')
        doc.setFontSize(22)
        doc.setTextColor(255, 255, 255)
        doc.setFont('helvetica', 'bold')
        doc.text('RECIBO DE PAGO', 14, 22)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`Folio: ${folio}`, 150, 16)
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 150, 23)
        // Resident info
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
        // Payment details
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40, 40, 40)
        doc.text('DETALLES DEL PAGO', 14, 94)
        const tableRows = [[
            payment.concept || 'Cuota de Mantenimiento',
            `$${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            formatReceiptPaymentMethod(payment.payment_method),
            payment.date
        ]]
        autoTable(doc, {
            head: [['Concepto', 'Monto Pagado', 'Forma de Pago', 'Fecha']],
            body: tableRows,
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
        // Footer
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.setFont('helvetica', 'normal')
        doc.text('Este documento es un comprobante de operación digital generado por InmobiGo SaaS.', 14, 275)
        doc.text('Conserve este recibo para cualquier aclaración futura.', 14, 281)
        doc.save(`Recibo_${folio}.pdf`)
    } catch (e) {
        console.error('[Residente] Error al generar recibo PDF:', e)
    }
}

const money = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

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
    invoices: any[]
    payments: any[]
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
                vencimiento: formatDate(i.due_date || i.created_at),
                folio: i.folio || '—',
                concepto: i.description || 'Cuota de mantenimiento',
                cargo,
                pagado: Math.max(0, cargo - saldo),
                saldo,
                estado: mapStatus(i.status),
            }
        })
    const pagos = payments
        .filter(p => statementMonthKey(p.paid_at || p.created_at) === monthKey)
        .sort((a, b) => String(a.paid_at || a.created_at).localeCompare(String(b.paid_at || b.created_at)))
        .map(p => ({
            fecha: formatDate(p.paid_at || p.created_at),
            folio: p.folio || '—',
            concepto: p.concept || 'Cuota de mantenimiento',
            forma: formatReceiptPaymentMethod(p.payment_method),
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
    let y = (doc as any).lastAutoTable.finalY + 12
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
    y = (doc as any).lastAutoTable.finalY + 12
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

export default function ResidentPaymentsClient({
    resident,
    invoices: dbInvoices = [],
    unit,
    directPayments = [],
    mpConnected = false
}: ResidentPaymentsClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isCheckingOut, setIsCheckingOut] = useState(false)
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false)
    // 'choose' = Mercado Pago vs. transferencia bancaria. 'mp-methods' = ya
    // eligió Mercado Pago y ahora ve las formas específicas (Saldo, OXXO,
    // Tarjeta, SPEI) — solo al elegir una de esas se manda a pagar.
    const [paymentModalStep, setPaymentModalStep] = useState<'choose' | 'mp-methods'>('choose')
    // null = pagar el saldo total (botón del hero). Con valor = pagar solo esa
    // cuota puntual (icono de pago de una fila específica de la tabla).
    const [paymentTarget, setPaymentTarget] = useState<{ amount: number; concept?: string } | null>(null)

    useEffect(() => {
        const status = searchParams.get('mp_status')
        if (!status) return

        if (status === 'success') {
            toast.success('¡Pago recibido! Tu saldo se actualizará en unos momentos.')
        } else if (status === 'pending') {
            toast.info('Tu pago está siendo procesado por Mercado Pago.')
        } else if (status === 'failure') {
            toast.error('No se pudo completar el pago. Intenta de nuevo.')
        }

        router.replace('/residente/payments')
    }, [searchParams, router])

    // Con Mercado Pago conectado, el residente puede pagar por dos vías: MP
    // (recibo automático al confirmarse el pago) o transferencia bancaria a la
    // cuenta del condominio (el pago queda "pendiente" hasta que el admin lo
    // valide en /seguridad/validacion-pagos, vía subir-comprobante). Si no hay
    // MP conectado no hay elección: se va directo a subir comprobante.
    const handleRegularizarClick = () => {
        setPaymentTarget(null)
        setPaymentModalStep('choose')
        if (!mpConnected) {
            router.push('/residente/subir-comprobante')
            return
        }
        setShowPaymentMethodModal(true)
    }

    // Icono de pago de una fila puntual en la tabla: a diferencia del botón del
    // hero (que cobra el saldo total), aquí solo se cobra el monto de esa cuota.
    const handlePayInvoiceClick = (inv: any) => {
        const amount = Number(inv.monto || inv.balance_due || inv.amount || 0)
        setPaymentTarget({ amount, concept: inv.description || undefined })
        setPaymentModalStep('choose')
        if (!mpConnected) {
            router.push('/residente/subir-comprobante')
            return
        }
        setShowPaymentMethodModal(true)
    }

    // Se llama solo hasta que el residente elige una forma concreta dentro de
    // Mercado Pago (Saldo, OXXO, Tarjeta, SPEI) — nunca al abrir el selector.
    const handlePayWithMercadoPago = async (defaultPaymentMethodId?: string) => {
        setShowPaymentMethodModal(false)
        setIsCheckingOut(true)
        try {
            const result = await createResidentPaymentCheckout({
                ...(paymentTarget ? { amount: paymentTarget.amount, concept: paymentTarget.concept } : {}),
                ...(defaultPaymentMethodId ? { defaultPaymentMethodId } : {}),
            })
            if (result.success && result.checkoutUrl) {
                window.location.href = result.checkoutUrl
            } else {
                toast.error(result.message || 'No se pudo iniciar el pago.')
                setIsCheckingOut(false)
            }
        } catch (error) {
            console.error('[Residente] Error al iniciar checkout:', error)
            toast.error('No se pudo iniciar el pago.')
            setIsCheckingOut(false)
        }
    }

    const handlePayWithBankTransfer = () => {
        setShowPaymentMethodModal(false)
        router.push('/residente/subir-comprobante')
    }

    const today = new Date()
    const dayOfMonth = today.getDate()

    // Fecha límite de pago desde la unidad (default 10)
    const paymentDeadline = unit?.payment_deadline || 10

    // ─── TIEMPO REAL: Cuota Mensual ───────────────────────────────────────────
    const [montoCuota, setMontoCuota] = useState<number>(unit?.monto_mensual || 2500)
    
    // ─── TIEMPO REAL: Facturas ────────────────────────────────────────────────
    const [liveInvoices, setLiveInvoices] = useState<any[]>(dbInvoices)

    // Sincronizar cuando cambien los props del servidor
    useEffect(() => { setLiveInvoices(dbInvoices) }, [dbInvoices])
    useEffect(() => { setMontoCuota(unit?.monto_mensual || 2500) }, [unit?.monto_mensual])

    // Suscripción a cambios de la unidad (monto_mensual)
    useEffect(() => {
        if (!unit?.id) return
        const supabase = createClient()
        const ch = supabase
            .channel(`unit-${unit.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'units',
                filter: `id=eq.${unit.id}`
            }, (payload: any) => {
                if (payload.new?.monto_mensual !== undefined) {
                    setMontoCuota(Number(payload.new.monto_mensual))
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(ch) }
    }, [unit?.id])

    // Suscripción a cambios de facturas del residente (usando resident_invoices)
    useEffect(() => {
        if (!resident?.id) return
        const supabase = createClient()
        const ch = supabase
            .channel(`resident-invoices-${resident.id}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'resident_invoices',
                filter: `resident_id=eq.${resident.id}`
            }, async () => {
                // Re-fetch al detectar cualquier cambio
                const now = new Date()
                const { data } = await supabase
                    .from('resident_invoices')
                    .select('*')
                    .eq('resident_id', resident.id)
                    .order('created_at', { ascending: false })
                if (data) {
                    // ── Cruzar folios reales desde payment_validations ──────────────
                    const validationIds = data
                        .map((i: any) => {
                            const m = (i.notes || '').match(/^validation:(.+)$/)
                            return m ? m[1] : null
                        })
                        .filter(Boolean) as string[]

                    const folioByValidationId: Record<string, string> = {}
                    if (validationIds.length > 0) {
                        const { data: pvRows } = await supabase
                            .from('payment_validations')
                            .select('id, folio')
                            .in('id', validationIds)
                        if (pvRows) {
                            for (const row of pvRows) {
                                if (row.folio) folioByValidationId[row.id] = row.folio
                            }
                        }
                    }

                    setLiveInvoices(data.map((inv: any) => {
                        const baseDate = new Date(inv.due_date || inv.created_at)
                        const limitDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), paymentDeadline, 23, 59, 59)
                        
                        let atraso = 0
                        if (inv.status !== 'paid' && now > limitDate) {
                            atraso = Math.floor((now.getTime() - limitDate.getTime()) / (1000 * 60 * 60 * 24))
                        }
                        // paid_amount = amount - balance_due (no paid_amount column in resident_invoices)
                        const paid_amount = Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0))

                        // Inyectar folio real desde payment_validations si existe
                        const validationMatch = (inv.notes || '').match(/^validation:(.+)$/)
                        const realFolio = validationMatch
                            ? (folioByValidationId[validationMatch[1]] || inv.folio || null)
                            : (inv.folio || null)

                        return { ...inv, folio: realFolio, atraso, paid_amount }
                    }))
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(ch) }
    }, [resident?.id])

    
    // Lógica de estado basada en deuda y fecha
    const isOverdue = dayOfMonth > paymentDeadline && resident.debt_amount > 0
    const isPendingWithinDeadline = dayOfMonth <= paymentDeadline && resident.debt_amount > 0
    const isUpToDate = resident.debt_amount <= 0

    const initialPaymentHistory = useMemo(() => {
        const source = liveInvoices.length > 0 ? liveInvoices : dbInvoices
        return source.map((inv: any) => ({
            folio: inv.folio || '—',
            date: formatDate(inv.status === 'paid' && inv.paid_at ? inv.paid_at : (inv.due_date || inv.created_at)),
            concept: inv.description || 'Cuota de mantenimiento',
            amount: inv.amount || 0,
            status: mapStatus(inv.status),
            month: MESES_ES[new Date(inv.due_date || inv.created_at).getMonth()] || 'Sin fecha',
            atraso: inv.atraso || 0,
            rawStatus: inv.status,
        }))
    }, [liveInvoices, dbInvoices])

    // Mismo mes por defecto que el detalle de residente en el panel del administrador
    // (mes en curso), para que las tarjetas coincidan exacto al abrir la pantalla.
    const [selectedMonth, setSelectedMonth] = useState(MESES_ES[today.getMonth()])
    
    const availableMonths = [
        'Todos', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 
        'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    const filteredHistory = useMemo(() => {
        if (selectedMonth === 'Todos') return initialPaymentHistory
        return initialPaymentHistory.filter(p => p.month === selectedMonth)
    }, [selectedMonth, initialPaymentHistory])

    // ─── MOTOR DE CÁLCULO ─────────────────────────────────────────────────────
    // Misma función (calculateResidentMonthlyFinancials) que usa el detalle del
    // residente en el panel del administrador, para que ambas pantallas
    // muestren exactamente el mismo número. Antes este archivo tenía su propio
    // motor de "déficit mes a mes" basado únicamente en facturas reales
    // (agrupadas por mes vía due_date): si el cron de facturación aún no había
    // generado el recibo del mes, ese motor devolvía $0 de morosidad/pendiente
    // aunque el admin sí proyectara la cuota vencida correspondiente.
    const rawSource = liveInvoices.length > 0 ? liveInvoices : dbInvoices

    const cuotasPagadas = filteredHistory.filter((p: any) => p.rawStatus === 'paid' || p.status === 'Pagado').length

    // Pendiente / Morosidad del periodo seleccionado en el filtro de la tabla
    const selectedMonthForCalc = selectedMonth === 'Todos' ? 'all' : String(MES_INDEX_BY_NAME[selectedMonth] ?? 'all')
    const periodFinancials = useMemo(() =>
        calculateResidentMonthlyFinancials({
            resident,
            invoices: rawSource,
            selectedMonth: selectedMonthForCalc,
            monthlyFee: montoCuota,
        })
    , [resident, rawSource, selectedMonthForCalc, montoCuota])

    const montoMorosidad = periodFinancials.overdueAmount

    const cumplimientoPorcentaje = Math.round((cuotasPagadas / 12) * 100)

    // ─── ESTADO FINANCIERO DEL HERO ─────────────────────────────────────────────
    // Siempre sobre el mes en curso, ignorando el filtro de la tabla — misma
    // fórmula que usa el detalle del residente en el panel del administrador,
    // para que el "Estado Financiero" que ve el residente coincida exacto con
    // lo que su administrador ve para él.
    const currentMonthFinancials = useMemo(() =>
        calculateResidentMonthlyFinancials({
            resident,
            invoices: rawSource,
            selectedMonth: String(today.getMonth()),
            monthlyFee: montoCuota,
        })
    , [resident, rawSource, montoCuota])

    const montoMorosidadTotal = currentMonthFinancials.overdueAmount
    const montoPendienteTotal = currentMonthFinancials.totalPending

    // debt_amount arrastrado (saldo inicial/ajustes manuales) — siempre es deuda YA
    // vencida (viene de antes), nunca "pendiente dentro del plazo". No depende del
    // filtro de mes de la tabla. calculateResidentDebtSummary es la misma fórmula
    // que usa el detalle de residente en el panel del administrador.
    const carriedOverDebt = useMemo(() =>
        calculateResidentDebtSummary({ resident, invoices: rawSource, unit }).carriedOverDebt
    , [resident, rawSource, unit])

    // Banderas del Hero (siempre sobre el estado global, ignorando el filtro)
    const heroIsOverdue = montoMorosidadTotal > 0 || carriedOverDebt > 0
    const heroIsPending = !heroIsOverdue && montoPendienteTotal > 0
    const heroIsUpToDate = !heroIsOverdue && !heroIsPending
    const heroDebt = heroIsUpToDate ? 0 : montoPendienteTotal + montoMorosidadTotal + carriedOverDebt

    // Meses disponibles para el estado de cuenta: del primer movimiento al mes en curso
    const statementMonths = useMemo(() => {
        const currentKey = statementMonthKey(new Date().toISOString())!
        const keys = [
            ...rawSource.map(i => statementMonthKey(i.due_date || i.created_at)),
            ...directPayments.map(p => statementMonthKey(p.paid_at || p.created_at)),
        ].filter((k): k is string => !!k && k <= currentKey)
        let first = keys.length ? keys.reduce((a, b) => (a < b ? a : b)) : currentKey
        const [cy, cm] = currentKey.split('-').map(Number)
        const minKey = `${cy - 2}-${String(cm).padStart(2, '0')}`
        if (first < minKey) first = minKey
        const out: string[] = []
        let [y, m] = currentKey.split('-').map(Number)
        while (true) {
            const k = `${y}-${String(m).padStart(2, '0')}`
            if (k < first) break
            out.push(k)
            m -= 1
            if (m === 0) { m = 12; y -= 1 }
        }
        return out
    }, [rawSource, directPayments])

    const [showStatementModal, setShowStatementModal] = useState(false)
    const [statementMonth, setStatementMonth] = useState<string>('')
    const [statementFormat, setStatementFormat] = useState<'pdf' | 'excel'>('pdf')

    const openStatementModal = () => {
        if (!statementMonth || !statementMonths.includes(statementMonth)) setStatementMonth(statementMonths[0])
        setShowStatementModal(true)
    }

    const handleDownloadStatement = () => {
        const monthKey = statementMonth || statementMonths[0]
        const params = {
            residentName: [resident.first_name, resident.last_name].filter(Boolean).join(' ') || 'Residente',
            condoName: resident.condominiums?.name || '',
            unitNumber: unit?.unit_number,
            monthKey,
            invoices: rawSource,
            payments: directPayments,
            saldoTotal: heroDebt,
            saldoFavor: currentMonthFinancials.creditBalance || 0,
        }
        try {
            if (statementFormat === 'excel') generateAccountStatementExcel(params)
            else generateAccountStatementPdf(params)
            toast.success(`Estado de cuenta de ${statementMonthLabel(monthKey)} descargado`)
            setShowStatementModal(false)
        } catch (e) {
            console.error('[Residente] Error al generar estado de cuenta:', e)
            toast.error('No se pudo generar el estado de cuenta')
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 md:space-y-10 p-4 sm:p-6 md:p-10 animate-in fade-in duration-500 bg-[#09090b] min-h-screen font-sans">
            
            {/* 1. HERO PRINCIPAL: ESTADO FINANCIERO */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.005 }}
                className={cn(
                    // Contorno apagado en reposo — solo se ilumina al pasar el mouse, y con
                    // un tono más cálido/apagado que el neón saturado de antes.
                    "relative overflow-hidden bg-zinc-900/50 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 md:p-12 group transition-all duration-500 border-2 shadow-none",
                    heroIsOverdue
                        ? "border-rose-500/20 hover:border-rose-400/50 hover:shadow-[0_0_40px_-12px_rgba(225,29,72,0.35)]"
                        : "border-blue-500/20 hover:border-blue-400/50 hover:shadow-[0_0_40px_-12px_rgba(37,99,235,0.35)]"
                )}
            >
                {/* Glow Effects Animados */}
                <motion.div 
                    animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.05, 0.15, 0.05],
                        x: [0, 30, 0],
                        y: [0, -20, 0]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className={cn(
                        "absolute top-0 right-0 -m-20 h-[30rem] w-[30rem] rounded-full blur-[120px] transition-colors duration-1000",
                        heroIsOverdue ? "bg-rose-500" : heroIsPending ? "bg-amber-500" : "bg-emerald-500"
                    )} 
                />

                {/* SaaS Shine Effect */}
                <motion.div 
                    animate={{ 
                        x: ['-100%', '200%'],
                        opacity: [0, 0.1, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 pointer-events-none z-0"
                />
                
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 relative z-10">
                    <div className="space-y-6 flex-1">
                        <div className="flex items-center gap-3">
                            <Badge className={cn(
                                "px-4 py-1 rounded-full text-[10px] font-black tracking-[0.2em] uppercase border transition-all duration-500",
                                heroIsOverdue
                                    ? "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
                                    : heroIsPending
                                        ? "bg-amber-500/20 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            )}>
                                {heroIsOverdue ? "CUENTA VENCIDA" : heroIsPending ? "PAGO PENDIENTE" : "AL CORRIENTE"}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-sm font-black text-zinc-500 uppercase tracking-[0.3em]">Estado Financiero</h1>
                            <div className="flex items-baseline gap-4">
                                <motion.h2 
                                    key={heroDebt}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className={cn(
                                        "text-4xl sm:text-5xl md:text-7xl font-black tracking-tighter italic break-all",
                                        heroIsOverdue ? "text-rose-400" : heroIsPending ? "text-amber-400" : "text-white"
                                    )}
                                >
                                    ${heroDebt.toLocaleString('es-MX')}
                                </motion.h2>
                                <span className="text-zinc-500 font-bold text-base sm:text-xl uppercase tracking-tighter">MXN</span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xl font-bold text-white/90">
                                {heroIsUpToDate
                                    ? "Tu cuenta se encuentra totalmente liquidada."
                                    : heroIsOverdue
                                        ? `Tienes $${heroDebt.toLocaleString('es-MX')} en morosidad acumulada.`
                                        : `Tienes $${heroDebt.toLocaleString('es-MX')} pendientes de pago.`}
                            </p>
                            <p className="text-zinc-500 font-medium">
                                {heroIsUpToDate
                                    ? "Gracias por tu cumplimiento puntual."
                                    : heroIsOverdue
                                        ? `Venció el día ${paymentDeadline}. Regulariza tu saldo para evitar restricciones.`
                                        : `Tu cuota vence el día ${paymentDeadline} de ${new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(today)}.`}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 pt-4">
                            {!heroIsUpToDate && (
                                <motion.div whileHover={{ scale: isCheckingOut ? 1 : 1.05 }} whileTap={{ scale: isCheckingOut ? 1 : 0.95 }}>
                                    <Button
                                        onClick={handleRegularizarClick}
                                        disabled={isCheckingOut}
                                        className={cn(
                                            // El componente Button trae por defecto "h-10 md:h-9 ... text-base md:text-sm"
                                            // (size='md') — sin repetir el mismo prefijo "md:" aquí, twMerge no las
                                            // considera del mismo grupo y las deja convivir, así que en desktop
                                            // (md+) terminaba ganando el tamaño chico del default.
                                            "h-14 sm:h-20 md:h-20 px-6 sm:px-10 md:px-10 rounded-2xl text-base md:text-base font-black shadow-2xl transition-all flex items-center gap-3 group/btn disabled:opacity-70",
                                            heroIsOverdue ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/40" : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/40"
                                        )}
                                    >
                                        {isCheckingOut ? (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        ) : (
                                            <>
                                                Pagar ahora
                                                <ChevronRight className="h-6 w-6 group-hover/btn:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </Button>
                                </motion.div>
                            )}

                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="relative flex items-center gap-4 h-14 sm:h-20 px-5 sm:px-8 rounded-2xl bg-gradient-to-r from-[#00203d] via-[#003d7a] to-[#0a3d91] border border-blue-400/20 shadow-[0_8px_24px_-8px_rgba(0,158,247,0.35)] overflow-hidden group/mp"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-150%] group-hover/mp:translate-x-[150%] transition-transform duration-1000 ease-out" />
                                <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center relative z-10 shrink-0">
                                    <Lock className="h-5 w-5 text-sky-300" />
                                </div>
                                <div className="relative z-10 leading-tight">
                                    <p className="text-white text-sm font-black uppercase tracking-widest">Pago 100% seguro</p>
                                    <p className="text-sky-300/80 text-xs font-bold uppercase tracking-wider">Procesado por Mercado Pago</p>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                                <Button
                                    onClick={openStatementModal}
                                    variant="outline"
                                    className="h-14 sm:h-20 md:h-20 px-5 sm:px-8 md:px-8 rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white font-black text-sm md:text-sm uppercase tracking-widest flex items-center gap-3"
                                >
                                    <FileText className="h-5 w-5 text-indigo-300" />
                                    Descargar estado de cuenta
                                </Button>
                            </motion.div>
                        </div>
                    </div>

                    <div className="hidden lg:block relative group">
                        <div className="absolute inset-0 bg-blue-600/20 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
                        <motion.div 
                            animate={{ 
                                y: [0, -15, 0],
                                rotate: [3, 5, 3]
                            }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="relative z-10 p-10 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-[3rem] border border-white/10 shadow-2xl group-hover:border-white/20 transition-colors"
                        >
                            <CreditCard className="h-32 w-32 text-white/10 absolute -top-10 -right-10 rotate-12" />
                            <div className="space-y-8 relative">
                                <div className="h-12 w-20 bg-indigo-500/20 rounded-xl" />
                                <div className="space-y-4">
                                    <div className="h-4 w-48 bg-white/5 rounded-full" />
                                    <div className="h-4 w-32 bg-white/5 rounded-full" />
                                </div>
                                <div className="flex justify-between items-end pt-8">
                                    <div className="space-y-2">
                                        <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Titular</p>
                                        <p className="text-xs font-bold text-white uppercase">{resident.first_name}</p>
                                    </div>
                                    <div className="h-10 w-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                                        <ShieldCheck className="h-6 w-6 text-amber-500" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* 2. TARJETAS FINANCIERAS — mismas 5 que el detalle de residente en el
                panel del administrador (Cuota Mensual, Total Pagado, Saldo Pendiente,
                Cuotas Vencidas, Saldo a Favor), con la misma fórmula, para que
                coincidan exacto. */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <MetricCard
                    title="Cuota Mensual"
                    value={`$${periodFinancials.cuotaMensual.toLocaleString('es-MX')}`}
                    subtitle={unit?.unit_number ? `Cuota fija asignada · Unidad ${unit.unit_number}` : 'Cuota fija asignada'}
                    icon={DollarSign}
                    color="indigo"
                    delay={0.1}
                />
                <MetricCard
                    title="Total Pagado"
                    value={`$${periodFinancials.totalPaid.toLocaleString('es-MX')}`}
                    subtitle="Al día"
                    icon={CheckCircle2}
                    color="emerald"
                    delay={0.2}
                />
                <MetricCard
                    title="Saldo Pendiente"
                    value={`$${periodFinancials.totalPending.toLocaleString('es-MX')}`}
                    subtitle="Pendiente de pago"
                    icon={AlertTriangle}
                    color="amber"
                    delay={0.3}
                />
                <MetricCard
                    title="Cuotas Vencidas"
                    value={`$${(periodFinancials.overdueAmount + carriedOverDebt).toLocaleString('es-MX')}`}
                    subtitle={
                        (periodFinancials.overdueAmount + carriedOverDebt) > 0
                            ? periodFinancials.maxDaysOverdue > 0
                                ? `${periodFinancials.maxDaysOverdue} días de atraso`
                                : 'Pago vencido'
                            : 'Sin vencimientos'
                    }
                    icon={Clock}
                    color="rose"
                    delay={0.4}
                />
                <MetricCard
                    title="Saldo a Favor"
                    value={`$${periodFinancials.creditBalance.toLocaleString('es-MX')}`}
                    subtitle={periodFinancials.creditBalance > 0 ? 'Excedente del periodo' : 'Sin saldo a favor'}
                    icon={Sparkles}
                    color="purple"
                    delay={0.5}
                />
            </div>

            {/* 3. ACTIVIDAD FINANCIERA */}
            <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                            <History className="h-5 w-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Actividad financiera</h2>
                            <p className="text-xs text-zinc-500">Tus cuotas y cargos del periodo seleccionado</p>
                        </div>
                    </div>

                    <label className="relative flex items-center gap-2 self-start sm:self-auto pl-4 pr-3 h-10 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                        <Calendar size={14} className="text-zinc-500" />
                        <span className="text-xs text-zinc-500">Periodo</span>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-transparent text-white text-sm font-semibold outline-none cursor-pointer appearance-none pr-5"
                        >
                            {availableMonths.map(m => (
                                <option key={m} value={m} className="bg-[#09090b]">{m}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="text-zinc-500 absolute right-3 pointer-events-none" />
                    </label>
                </div>

                <div className="rounded-2xl border border-indigo-500/30 bg-zinc-900/40 overflow-hidden shadow-[0_0_0_1px_rgba(99,102,241,0.05),0_16px_40px_-20px_rgba(99,102,241,0.35)] hover:border-indigo-500/50 transition-colors duration-300">
                    {periodFinancials.filteredInvoices.length === 0 ? (
                        <div className="py-14 px-6 flex flex-col items-center gap-2 text-center">
                            <Receipt size={26} className="text-zinc-700" />
                            <p className="text-sm font-semibold text-zinc-400">Sin movimientos en {selectedMonth === 'Todos' ? 'tu cuenta' : selectedMonth}</p>
                            <p className="text-xs text-zinc-600">Elige otro periodo para ver tus cuotas.</p>
                        </div>
                    ) : (
                        <>
                            {/* Encabezados (solo escritorio) */}
                            <div className="hidden md:grid grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 px-6 py-3 border-b border-indigo-500/20 bg-indigo-500/[0.04] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                                <span>Concepto</span>
                                <span>Vencimiento</span>
                                <span>Estado</span>
                                <span className="text-right">Monto</span>
                                <span className="w-[88px] text-right">Acción</span>
                            </div>

                            <div className="divide-y divide-white/[0.05]">
                                <AnimatePresence mode='popLayout'>
                                    {periodFinancials.filteredInvoices.map((inv: any, i: number) => {
                                        const isPaid = inv.status === 'paid'
                                        const dueDate = inv.due_date ? new Date(inv.due_date) : null
                                        let atrasoDias = 0
                                        if (isPaid && inv.paid_at && dueDate) {
                                            atrasoDias = Math.max(0, Math.floor((new Date(inv.paid_at).getTime() - dueDate.getTime()) / 86400000))
                                        } else if (!isPaid && dueDate && today > dueDate) {
                                            atrasoDias = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / 86400000))
                                        }
                                        const isRealPaidReceipt = isPaid && inv.folio && !String(inv.id).startsWith('virtual-')
                                        const statusLabel = isPaid ? 'Pagado' : inv.status === 'overdue' ? 'Vencida' : 'Pendiente'
                                        const statusClass = isPaid
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : inv.status === 'overdue'
                                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        const statusDot = isPaid ? 'bg-emerald-400' : inv.status === 'overdue' ? 'bg-rose-400' : 'bg-amber-400'

                                        const actions = (
                                            <div className="flex justify-end gap-2">
                                                {inv.evidence_url && (
                                                    <a
                                                        href={inv.evidence_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Ver evidencia (PDF)"
                                                        className="h-9 w-9 rounded-lg bg-white/[0.04] border border-white/10 text-zinc-300 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                                                    >
                                                        <FileText size={16} />
                                                    </a>
                                                )}
                                                {!isPaid ? (
                                                    <button
                                                        title={`Pagar esta cuota ($${Number(inv.monto || 0).toLocaleString('es-MX')})`}
                                                        onClick={() => handlePayInvoiceClick(inv)}
                                                        className="h-9 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <CreditCard size={14} /> Pagar
                                                    </button>
                                                ) : isRealPaidReceipt ? (
                                                    <button
                                                        title={`Descargar recibo ${inv.folio}`}
                                                        onClick={() => generateReceiptForResident(
                                                            { folio: inv.folio, amount: inv.monto, payment_method: inv.payment_method, date: formatDate(inv.paid_at || inv.due_date || inv.created_at) },
                                                            resident.first_name + (resident.last_name ? ' ' + resident.last_name : ''),
                                                            resident.condominiums?.name || '',
                                                            unit?.unit_number
                                                        )}
                                                        className="h-9 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <Receipt size={14} /> Recibo
                                                    </button>
                                                ) : (
                                                    <span
                                                        title="Recibo disponible solo cuando el pago esté confirmado"
                                                        className="h-9 px-3 rounded-lg bg-zinc-800/50 border border-zinc-700/30 text-zinc-600 text-xs font-semibold flex items-center gap-1.5 cursor-default"
                                                    >
                                                        <Receipt size={14} /> Recibo
                                                    </span>
                                                )}
                                            </div>
                                        )

                                        return (
                                            <motion.div
                                                key={inv.id}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                className="px-4 md:px-6 py-4 hover:bg-white/[0.02] transition-colors md:grid md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:gap-4 md:items-center"
                                            >
                                                {/* Concepto */}
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="h-9 w-9 shrink-0 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                                                        <Receipt size={16} />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <p className="text-sm font-semibold text-white leading-snug line-clamp-2" title={inv.description}>{inv.description}</p>
                                                            {/* Monto en móvil */}
                                                            <span className="md:hidden text-base font-bold text-white tabular-nums whitespace-nowrap">
                                                                ${Number(inv.monto || 0).toLocaleString('es-MX')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                                            <span className="font-mono">{inv.folio}</span>
                                                            <span className="mx-1.5 text-zinc-700">·</span>
                                                            {formatDate(inv.created_at)}
                                                            {inv.payment_method && (
                                                                <><span className="mx-1.5 text-zinc-700">·</span>{inv.payment_method}</>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Vencimiento */}
                                                <div className="mt-3 md:mt-0 flex md:block items-center gap-2 pl-12 md:pl-0">
                                                    <span className="text-xs text-zinc-500 md:hidden">Vence</span>
                                                    <p className="text-sm text-zinc-300">{dueDate ? formatDate(inv.due_date) : '—'}</p>
                                                    {atrasoDias > 0 && (
                                                        <p className={cn("text-xs font-semibold tabular-nums", atrasoDias > 15 ? "text-rose-400" : "text-amber-400")}>
                                                            {atrasoDias} día{atrasoDias !== 1 ? 's' : ''} de atraso
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Estado */}
                                                <div className="hidden md:block">
                                                    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", statusClass)}>
                                                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
                                                        {statusLabel}
                                                    </span>
                                                </div>

                                                {/* Monto (escritorio) */}
                                                <div className="hidden md:block text-right">
                                                    <span className="text-base font-bold text-white tabular-nums">${Number(inv.monto || 0).toLocaleString('es-MX')}</span>
                                                </div>

                                                {/* Estado + acciones en móvil / acciones en escritorio */}
                                                <div className="mt-3 md:mt-0 pl-12 md:pl-0 flex items-center justify-between md:justify-end gap-3 md:w-[88px]">
                                                    <span className={cn("md:hidden inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold", statusClass)}>
                                                        <span className={cn("h-1.5 w-1.5 rounded-full", statusDot)} />
                                                        {statusLabel}
                                                    </span>
                                                    {actions}
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </AnimatePresence>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* 3.5. HISTORIAL DE PAGOS REALIZADOS (ABONOS INDIVIDUALES) */}
            <div className="space-y-5">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Pagos realizados</h2>
                        <p className="text-xs text-zinc-500">Cada abono que registraste, con su recibo</p>
                    </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/30 bg-zinc-900/40 overflow-hidden shadow-[0_0_0_1px_rgba(16,185,129,0.05),0_16px_40px_-20px_rgba(16,185,129,0.35)] hover:border-emerald-500/50 transition-colors duration-300">
                    {directPayments.length === 0 ? (
                        <div className="py-14 px-6 flex flex-col items-center gap-2 text-center">
                            <Receipt size={26} className="text-zinc-700" />
                            <p className="text-sm font-semibold text-zinc-400">Aún no hay pagos registrados</p>
                            <p className="text-xs text-zinc-600">Los pagos por Mercado Pago o transferencia aparecerán aquí.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/[0.05]">
                            {directPayments.map((pay: any, idx: number) => (
                                <div key={pay.id || idx} className="px-4 md:px-6 py-4 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
                                    <div className="h-9 w-9 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                        <CheckCircle2 size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white truncate">{pay.concept || 'Cuota de Mantenimiento'}</p>
                                        <p className="text-xs text-zinc-500 truncate">
                                            {formatDate(pay.paid_at || pay.created_at)}
                                            <span className="mx-1.5 text-zinc-700">·</span>
                                            {pay.payment_method || 'N/A'}
                                            {pay.folio && (<><span className="mx-1.5 text-zinc-700">·</span><span className="font-mono">{pay.folio}</span></>)}
                                        </p>
                                    </div>
                                    <span className="text-base font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                                        ${Number(pay.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                    <button
                                        title={`Ver recibo ${pay.folio || ''}`}
                                        onClick={() => generateReceiptForResident(
                                            { folio: pay.folio, concept: pay.concept, amount: pay.amount, payment_method: pay.payment_method, date: formatDate(pay.paid_at || pay.created_at) },
                                            resident.first_name + (resident.last_name ? ' ' + resident.last_name : ''),
                                            resident.condominiums?.name || '',
                                            unit?.unit_number
                                        )}
                                        className="h-9 px-3 shrink-0 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    >
                                        <Receipt size={14} /> <span className="hidden sm:inline">Recibo</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 4. BARRA INFERIOR: CUMPLIMIENTO FINANCIERO */}
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-600/5 border border-indigo-500/20 p-5 sm:p-6 rounded-2xl space-y-5 relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent" />
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Cumplimiento anual</h4>
                        <p className="text-xl font-bold text-white tracking-tight">
                            {cuotasPagadas} de 12 cuotas liquidadas
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-3xl font-bold text-indigo-400 tracking-tight tabular-nums">{cumplimientoPorcentaje}%</span>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-1 text-center md:text-right">Progreso Fiscal 2026</p>
                    </div>
                </div>

                <div className="relative h-2.5 w-full bg-white/5 rounded-full overflow-hidden z-10">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${cumplimientoPorcentaje}%` }}
                        transition={{ duration: 2, ease: "circOut" }}
                        className="h-full bg-gradient-to-r from-indigo-600 via-blue-500 to-emerald-400 rounded-full shadow-[0_0_20px_rgba(79,70,229,0.5)]"
                    />
                </div>
                
                <div className="flex items-center relative z-10">
                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        <AlertCircle size={14} className="text-amber-500" />
                        Próximo corte: {new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long' }).format(new Date(today.getFullYear(), today.getMonth() + 1, 10))}
                    </div>
                </div>
            </motion.div>

            {/* Modal: elegir método de pago (Mercado Pago vs. transferencia bancaria) */}
            <AnimatePresence>
                {showStatementModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowStatementModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setShowStatementModal(false)}
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

                {showPaymentMethodModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPaymentMethodModal(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2rem] p-5 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <button
                                onClick={() => setShowPaymentMethodModal(false)}
                                className="absolute top-6 right-6 p-2 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            {paymentModalStep === 'mp-methods' && (
                                <button
                                    onClick={() => setPaymentModalStep('choose')}
                                    className="flex items-center gap-1.5 text-zinc-500 hover:text-white text-xs font-bold mb-4 transition-colors"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5" /> Volver
                                </button>
                            )}

                            <h3 className="text-2xl font-black text-white mb-1">
                                {paymentModalStep === 'choose' ? '¿Cómo quieres pagar?' : 'Elige tu forma de pago'}
                            </h3>
                            <p className="text-zinc-400 text-sm mb-8">
                                {paymentModalStep === 'choose' ? 'Elige' : 'Con Mercado Pago, elige'} la forma en la que quieres pagar {paymentTarget ? (paymentTarget.concept || 'esta cuota') : 'tu saldo'} de ${(paymentTarget ? paymentTarget.amount : heroDebt).toLocaleString('es-MX')} MXN.
                            </p>

                            <AnimatePresence mode="wait">
                                {paymentModalStep === 'choose' ? (
                                    <motion.div
                                        key="choose"
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -12 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <button
                                            onClick={() => setPaymentModalStep('mp-methods')}
                                            className="w-full text-left p-6 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-[#00203d] via-[#003d7a] to-[#0a3d91] hover:border-blue-400/40 transition-all group relative overflow-hidden"
                                        >
                                            {/* Shine sweep */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out pointer-events-none" />

                                            <div className="relative z-10 flex items-start gap-4 mb-5">
                                                <div className="h-12 w-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
                                                    <Lock className="h-5 w-5 text-sky-300" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="text-white font-black">Mercado Pago</p>
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-400/30">
                                                            Recomendado
                                                        </span>
                                                    </div>
                                                    <p className="text-sky-300/80 text-xs font-bold mt-0.5">Saldo, tarjeta, OXXO o transferencia. Tu recibo se genera automáticamente.</p>
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-sky-300 group-hover:translate-x-1 transition-transform shrink-0" />
                                            </div>

                                            {/* Beneficios */}
                                            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-1.5 pt-4 border-t border-white/10">
                                                {['Confirmación al instante', 'Recibo automático', 'Sin subir comprobante'].map(b => (
                                                    <div key={b} className="flex items-center gap-1.5 text-[10px] font-bold text-sky-100/80">
                                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                                        {b}
                                                    </div>
                                                ))}
                                            </div>
                                        </button>

                                        <button
                                            onClick={handlePayWithBankTransfer}
                                            className="w-full text-left p-5 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-indigo-500/40 transition-all flex items-center gap-4 group"
                                        >
                                            <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                                <Landmark className="h-5 w-5 text-indigo-400" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-black">Transferencia bancaria</p>
                                                <p className="text-zinc-500 text-xs font-bold">Deposita a la cuenta del condominio y sube tu comprobante. Queda pendiente hasta que el administrador lo valide.</p>
                                            </div>
                                            <ChevronRight className="h-5 w-5 text-zinc-500 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="methods"
                                        initial={{ opacity: 0, x: 12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                    >
                                        <button
                                            onClick={() => handlePayWithMercadoPago('account_money')}
                                            className="text-left p-5 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-blue-500/40 transition-all flex flex-col gap-3 group"
                                        >
                                            <div className="h-16 w-16 rounded-xl bg-white flex items-center justify-center p-2 shadow-lg shadow-blue-500/20">
                                                <img src="/logos/mercadopago-logo.png" alt="Mercado Pago" className="h-full w-full object-contain" />
                                            </div>
                                            <div className="flex items-end justify-between gap-2">
                                                <div>
                                                    <p className="text-white font-black text-sm">Saldo Mercado Pago</p>
                                                    <p className="text-zinc-500 text-[11px] font-bold">Paga al instante con tu cuenta</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all shrink-0" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handlePayWithMercadoPago('oxxo')}
                                            className="text-left p-5 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-rose-500/40 transition-all flex flex-col gap-3 group"
                                        >
                                            <div className="h-16 w-28 rounded-xl overflow-hidden shadow-lg shadow-rose-500/20">
                                                <img src="/logos/oxxo-logo.webp" alt="OXXO" className="h-full w-full object-contain" />
                                            </div>
                                            <div className="flex items-end justify-between gap-2">
                                                <div>
                                                    <p className="text-white font-black text-sm">OXXO</p>
                                                    <p className="text-zinc-500 text-[11px] font-bold">Paga en efectivo en tienda</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-rose-400 group-hover:translate-x-1 transition-all shrink-0" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handlePayWithMercadoPago()}
                                            className="text-left p-5 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-zinc-600 transition-all flex flex-col gap-3 group"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                <CreditCard className="h-5 w-5 text-zinc-300" />
                                            </div>
                                            <div className="flex items-end justify-between gap-2">
                                                <div>
                                                    <p className="text-white font-black text-sm">Tarjeta</p>
                                                    <p className="text-zinc-500 text-[11px] font-bold">Crédito, débito o prepagada</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => handlePayWithMercadoPago()}
                                            className="text-left p-5 rounded-2xl border border-zinc-800 bg-zinc-950 hover:border-zinc-600 transition-all flex flex-col gap-3 group"
                                        >
                                            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                <ArrowRightLeft className="h-5 w-5 text-zinc-300" />
                                            </div>
                                            <div className="flex items-end justify-between gap-2">
                                                <div>
                                                    <p className="text-white font-black text-sm">Transferencia SPEI</p>
                                                    <p className="text-zinc-500 text-[11px] font-bold">Desde tu banca en línea</p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" />
                                            </div>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

function MetricCard({ title, value, subtitle, icon: Icon, color, delay }: any) {
    const colorVariants: any = {
        indigo: { icon: "text-indigo-400 bg-indigo-500/10", bar: "bg-indigo-500", hover: "hover:border-indigo-500/40 hover:shadow-[0_12px_32px_-12px_rgba(99,102,241,0.45)]", glow: "bg-indigo-500" },
        emerald: { icon: "text-emerald-400 bg-emerald-500/10", bar: "bg-emerald-500", hover: "hover:border-emerald-500/40 hover:shadow-[0_12px_32px_-12px_rgba(16,185,129,0.45)]", glow: "bg-emerald-500" },
        amber: { icon: "text-amber-400 bg-amber-500/10", bar: "bg-amber-500", hover: "hover:border-amber-500/40 hover:shadow-[0_12px_32px_-12px_rgba(245,158,11,0.45)]", glow: "bg-amber-500" },
        rose: { icon: "text-rose-400 bg-rose-500/10", bar: "bg-rose-500", hover: "hover:border-rose-500/40 hover:shadow-[0_12px_32px_-12px_rgba(244,63,94,0.45)]", glow: "bg-rose-500" },
        purple: { icon: "text-purple-400 bg-purple-500/10", bar: "bg-purple-500", hover: "hover:border-purple-500/40 hover:shadow-[0_12px_32px_-12px_rgba(168,85,247,0.45)]", glow: "bg-purple-500" },
    }
    const variants = colorVariants[color] || colorVariants.indigo

    return (
        <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, duration: 0.45, ease: 'easeOut' }}
            whileHover={{ y: -4 }}
            className={cn(
                "group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-zinc-900/50 p-4 sm:p-5 transition-[border-color,box-shadow] duration-300 last:col-span-2 lg:last:col-span-1",
                variants.hover
            )}
        >
            {/* Barra lateral: crece de arriba hacia abajo al entrar */}
            <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: delay + 0.15, duration: 0.5, ease: 'easeOut' }}
                className={cn("absolute left-0 top-0 h-full w-1 origin-top", variants.bar)}
            />
            {/* Brillo de color al pasar el mouse */}
            <div className={cn("pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-3xl opacity-0 group-hover:opacity-25 transition-opacity duration-500", variants.glow)} />

            <div className="relative flex items-center gap-2.5">
                <div className={cn("h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6", variants.icon)}>
                    <Icon size={16} />
                </div>
                <p className="text-xs font-semibold text-zinc-400 leading-tight">{title}</p>
            </div>
            <motion.p
                key={String(value)}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: delay + 0.1, duration: 0.35 }}
                className="relative mt-3 text-2xl sm:text-[28px] font-bold text-white tracking-tight tabular-nums"
            >
                {value}
            </motion.p>
            <p className="relative mt-1 text-xs text-zinc-500 truncate" title={subtitle}>{subtitle}</p>
        </motion.div>
    )
}

