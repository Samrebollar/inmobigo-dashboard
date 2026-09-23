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
    ArrowUpRight,
    History,
    Receipt,
    Loader2,
    Lock,
    Sparkles,
    AlertTriangle,
    Landmark,
    X,
    ArrowRightLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { calculateResidentMonthlyFinancials, calculateResidentDebtSummary, getLocalDateParts } from '@/utils/finance-utils'
import { createResidentPaymentCheckout } from '@/app/actions/mercadopago-payment-actions'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

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

async function generateReceiptForResident(payment: any, residentName: string, condoName: string) {
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
        doc.setDrawColor(220, 220, 220)
        doc.line(14, 76, 196, 76)
        // Payment details
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40, 40, 40)
        doc.text('DETALLES DEL PAGO', 14, 88)
        const tableRows = [[
            payment.concept || 'Cuota de Mantenimiento',
            `$${Number(payment.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
            'Transferencia / Depósito',
            payment.date
        ]]
        autoTable(doc, {
            head: [['Concepto', 'Monto Pagado', 'Forma de Pago', 'Fecha']],
            body: tableRows,
            startY: 94,
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

    return (
        <div className="mx-auto max-w-7xl space-y-12 p-6 md:p-10 animate-in fade-in duration-500 bg-[#09090b] min-h-screen font-sans">
            
            {/* 1. HERO PRINCIPAL: ESTADO FINANCIERO */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.005 }}
                className={cn(
                    // Contorno apagado en reposo — solo se ilumina al pasar el mouse, y con
                    // un tono más cálido/apagado que el neón saturado de antes.
                    "relative overflow-hidden bg-zinc-900/50 rounded-[3rem] p-8 md:p-12 group transition-all duration-500 border-2 shadow-none",
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
                                        "text-7xl font-black tracking-tighter italic",
                                        heroIsOverdue ? "text-rose-400" : heroIsPending ? "text-amber-400" : "text-white"
                                    )}
                                >
                                    ${heroDebt.toLocaleString('es-MX')}
                                </motion.h2>
                                <span className="text-zinc-500 font-bold text-xl uppercase tracking-tighter">MXN</span>
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
                                            "h-20 md:h-20 px-10 md:px-10 rounded-2xl text-base md:text-base font-black shadow-2xl transition-all flex items-center gap-3 group/btn disabled:opacity-70",
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
                                className="relative flex items-center gap-4 h-20 px-8 rounded-2xl bg-gradient-to-r from-[#00203d] via-[#003d7a] to-[#0a3d91] border border-blue-400/20 shadow-[0_8px_24px_-8px_rgba(0,158,247,0.35)] overflow-hidden group/mp"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
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
            <div className="space-y-8">
                <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-8 gap-4">
                    <h2 className="text-3xl font-black text-white italic tracking-tight flex items-center gap-4">
                        <History className="h-8 w-8 text-indigo-400" />
                        Actividad Financiera
                    </h2>
                    
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/10 group/select transition-all hover:border-white/20 shadow-xl">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Periodo:</span>
                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer appearance-none px-2 min-w-[100px]"
                            >
                                {availableMonths.map(m => (
                                    <option key={m} value={m} className="bg-[#09090b]">{m}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="text-zinc-500 group-hover/select:text-white transition-colors" />
                        </div>
                    </div>
                </div>

                <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Fecha de Movimiento</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Folio</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Concepto</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Estado</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Monto</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Vencimiento</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Método de Pago</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Días de atraso</th>
                                <th className="px-10 py-8 text-right text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
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

                                    return (
                                    <motion.tr
                                        key={inv.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-10 py-8">
                                            <span className="text-zinc-400 font-medium">{formatDate(inv.created_at)}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-white font-bold tracking-tight">{inv.folio}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    <Receipt size={16} />
                                                </div>
                                                <span className="text-zinc-400 font-medium">{inv.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <Badge className={cn(
                                                "px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest border",
                                                inv.status === 'paid'
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : inv.status === 'overdue'
                                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                            )}>
                                                {inv.status === 'paid' ? 'Pagado' : inv.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                            </Badge>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-2xl font-black text-white tracking-tighter italic">
                                                ${Number(inv.monto || 0).toLocaleString('es-MX')}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-zinc-400 font-medium">{dueDate ? formatDate(inv.due_date) : '—'}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-zinc-500 text-sm">{inv.payment_method || '—'}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            {atrasoDias > 0 ? (
                                                <span className={cn(
                                                    "text-xs font-bold tabular-nums",
                                                    atrasoDias > 15 ? "text-rose-400" : "text-amber-400"
                                                )}>
                                                    {atrasoDias} día{atrasoDias !== 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="text-zinc-600 text-xs font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex justify-end">
                                                {!isPaid ? (
                                                    <motion.button
                                                        title={`Pagar esta cuota ($${Number(inv.monto || 0).toLocaleString('es-MX')})`}
                                                        whileHover={{ scale: 1.2, rotate: -12 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handlePayInvoiceClick(inv)}
                                                        className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all shadow-[0_0_20px_rgba(99,102,241,0)] hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                                    >
                                                        <CreditCard size={20} />
                                                    </motion.button>
                                                ) : isRealPaidReceipt ? (
                                                    <motion.button
                                                        title={`Descargar recibo ${inv.folio}`}
                                                        whileHover={{ scale: 1.2, rotate: 12 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => generateReceiptForResident(
                                                            { folio: inv.folio, amount: inv.monto, date: formatDate(inv.paid_at || inv.due_date || inv.created_at) },
                                                            resident.first_name + (resident.last_name ? ' ' + resident.last_name : ''),
                                                            resident.condominiums?.name || ''
                                                        )}
                                                        className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all shadow-[0_0_20px_rgba(16,185,129,0)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                                    >
                                                        <Receipt size={20} />
                                                    </motion.button>
                                                ) : (
                                                    <div
                                                        title="Recibo disponible solo cuando el pago esté confirmado"
                                                        className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/30 text-zinc-600 cursor-default"
                                                    >
                                                        <Receipt size={20} />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </motion.tr>
                                    )
                                })}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 3.5. HISTORIAL DE PAGOS REALIZADOS (ABONOS INDIVIDUALES) */}
            <div className="space-y-6 pt-4">
                <div className="flex flex-col md:flex-row items-center justify-between border-b border-white/5 pb-6 gap-4">
                    <h2 className="text-2xl font-black text-white italic tracking-tight flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400 border border-emerald-500/20">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        Historial de Pagos Realizados (Transacciones)
                    </h2>
                    <span className="text-xs font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
                        Abonos individuales registrados
                    </span>
                </div>

                <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
                    {directPayments.length === 0 ? (
                        <div className="py-12 px-6 text-center">
                            <div className="flex flex-col items-center justify-center gap-3">
                                <div className="p-4 bg-zinc-900 rounded-full text-zinc-600 border border-zinc-800">
                                    <Receipt size={28} />
                                </div>
                                <p className="text-zinc-400 font-bold text-sm">No hay transacciones registradas en el historial directo.</p>
                                <p className="text-zinc-600 text-xs">Los pagos efectuados por Mercado Pago o Transferencia se registrarán aquí.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/[0.02]">
                                        <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Fecha</th>
                                        <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Concepto</th>
                                        <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Método de Pago</th>
                                        <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Folio / Transacción</th>
                                        <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em] text-right">Monto</th>
                                        <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em] text-center">Estado</th>
                                        <th className="px-8 py-6 text-zinc-500 font-black text-xs uppercase tracking-[0.2em] text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {directPayments.map((pay: any, idx: number) => (
                                        <tr key={pay.id || idx} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-6">
                                                <span className="text-zinc-300 font-bold text-xs">{formatDate(pay.paid_at || pay.created_at)}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-white font-medium text-xs">{pay.concept || 'Cuota de Mantenimiento'}</span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold text-[10px] uppercase tracking-wider">
                                                    {pay.payment_method || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-zinc-400 font-mono text-xs">{pay.folio}</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <span className="text-emerald-400 font-black text-lg tracking-tight">
                                                    ${Number(pay.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <Badge className="px-4 py-1 rounded-xl font-black text-[10px] uppercase tracking-widest border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                                                    Completado
                                                </Badge>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-end">
                                                    <motion.button
                                                        title={`Ver recibo ${pay.folio || ''}`}
                                                        whileHover={{ scale: 1.15, rotate: 8 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => generateReceiptForResident(
                                                            { folio: pay.folio, concept: pay.concept, amount: pay.amount, date: formatDate(pay.paid_at || pay.created_at) },
                                                            resident.first_name + (resident.last_name ? ' ' + resident.last_name : ''),
                                                            resident.condominiums?.name || ''
                                                        )}
                                                        className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
                                                    >
                                                        <Receipt size={16} />
                                                    </motion.button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* 4. BARRA INFERIOR: CUMPLIMIENTO FINANCIERO */}
            <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-indigo-600/5 border border-indigo-500/20 p-10 rounded-[3rem] space-y-8 relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-transparent" />
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2 text-center md:text-left">
                        <h4 className="text-sm font-black text-indigo-400 uppercase tracking-[0.4em]">Cumplimiento Financiero Anual</h4>
                        <p className="text-3xl font-black text-white italic tracking-tight">
                            {cuotasPagadas} de 12 cuotas liquidadas
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="text-5xl font-black text-indigo-400 tracking-tighter">{cumplimientoPorcentaje}%</span>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mt-1 text-center md:text-right">Progreso Fiscal 2026</p>
                    </div>
                </div>

                <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden p-1 border border-white/5 relative z-10">
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
                            className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-[2rem] p-8 shadow-2xl"
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
        indigo: {
            icon: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
            border: "border-indigo-500/30 hover:border-indigo-500/50",
            glow: "shadow-[0_0_20px_-12px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_-10px_rgba(99,102,241,0.6)]",
            accent: "bg-indigo-500"
        },
        emerald: {
            icon: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
            border: "border-emerald-500/30 hover:border-emerald-500/50",
            glow: "shadow-[0_0_20px_-12px_rgba(16,185,129,0.5)] hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.6)]",
            accent: "bg-emerald-500"
        },
        amber: {
            icon: "text-amber-400 bg-amber-500/10 border-amber-500/20",
            border: "border-amber-500/30 hover:border-amber-500/50",
            glow: "shadow-[0_0_20px_-12px_rgba(245,158,11,0.5)] hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.6)]",
            accent: "bg-amber-500"
        },
        rose: {
            icon: "text-rose-400 bg-rose-500/10 border-rose-500/20",
            border: "border-rose-500/30 hover:border-rose-500/50",
            glow: "shadow-[0_0_20px_-12px_rgba(244,63,94,0.5)] hover:shadow-[0_0_30px_-10px_rgba(244,63,94,0.6)]",
            accent: "bg-rose-500"
        },
        purple: {
            icon: "text-purple-400 bg-purple-500/10 border-purple-500/20",
            border: "border-purple-500/30 hover:border-purple-500/50",
            glow: "shadow-[0_0_20px_-12px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_-10px_rgba(168,85,247,0.6)]",
            accent: "bg-purple-500"
        }
    }

    const variants = colorVariants[color] || colorVariants.indigo

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
            whileHover={{ y: -5, scale: 1.01 }}
            className={cn(
                "relative bg-zinc-900/40 border p-8 rounded-[2.5rem] space-y-6 backdrop-blur-md group transition-all duration-500 overflow-hidden",
                variants.border,
                variants.glow
            )}
        >
            {/* SaaS Animated Background Glow */}
            <div className={cn(
                "absolute -top-24 -right-24 h-64 w-64 rounded-full blur-[100px] opacity-0 group-hover:opacity-20 transition-all duration-1000 scale-150",
                variants.accent
            )} />
            
            <div className="flex items-center justify-between relative z-10">
                <div className={cn("p-4 rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-6", variants.icon)}>
                    <Icon size={24} />
                </div>
                <div className="p-2 rounded-xl bg-white/[0.02] border border-white/5 text-zinc-600 group-hover:text-white group-hover:bg-white/5 transition-all">
                    <ArrowUpRight size={16} />
                </div>
            </div>

            <div className="space-y-3 relative z-10">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] group-hover:text-zinc-400 transition-colors">
                    {title}
                </p>
                <div className="flex items-baseline gap-1">
                    <h3 className="text-4xl font-black text-white tracking-tighter italic transition-all group-hover:scale-[1.02] origin-left">
                        {value}
                    </h3>
                </div>
                <p className="text-xs font-bold text-zinc-600 tracking-tight group-hover:text-zinc-500 transition-colors">
                    {subtitle}
                </p>
            </div>

            {/* Bottom Glow Line */}
            <div className={cn(
                "absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700 ease-in-out",
                variants.accent
            )} />
        </motion.div>
    )
}

