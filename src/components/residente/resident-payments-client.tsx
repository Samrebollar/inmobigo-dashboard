'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { 
    CreditCard, 
    Calendar, 
    Download, 
    ExternalLink, 
    ChevronRight,
    ChevronDown,
    Bell,
    CheckCircle2,
    Clock,
    DollarSign,
    ShieldCheck,
    TrendingUp,
    AlertCircle,
    ArrowUpRight,
    Wallet,
    History,
    Receipt,
    ShieldAlert
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ResidentPaymentsClientProps {
    resident: any
    invoices?: any[]
    unit?: {
        id?: string
        unit_number?: string
        monto_mensual?: number
        payment_deadline?: number
    } | null
}

const CUOTA_FIJA = 2500

const MESES_ES: Record<number, string> = {
    0: 'Enero', 1: 'Febrero', 2: 'Marzo', 3: 'Abril',
    4: 'Mayo', 5: 'Junio', 6: 'Julio', 7: 'Agosto',
    8: 'Septiembre', 9: 'Octubre', 10: 'Noviembre', 11: 'Diciembre'
}

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    const day = String(d.getDate()).padStart(2, '0')
    const month = MESES_ES[d.getMonth()]?.slice(0, 3) || ''
    const year = d.getFullYear()
    return `${day} ${month} ${year}`
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

export default function ResidentPaymentsClient({ resident, invoices: dbInvoices = [], unit }: ResidentPaymentsClientProps) {
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
                    setLiveInvoices(data.map((inv: any) => {
                        const baseDate = new Date(inv.due_date || inv.created_at)
                        const limitDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), paymentDeadline, 23, 59, 59)
                        
                        let atraso = 0
                        if (inv.status !== 'paid' && now > limitDate) {
                            atraso = Math.floor((now.getTime() - limitDate.getTime()) / (1000 * 60 * 60 * 24))
                        }
                        // paid_amount = amount - balance_due (no paid_amount column in resident_invoices)
                        const paid_amount = Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0))
                        return { ...inv, atraso, paid_amount }
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

    // Usar facturas reales si existen, sino mock
    const mockHistory = [
        { folio: 'FAC-26001', date: '03 Mar 2026', concept: 'Cuota de mantenimiento', amount: 2500, status: 'Pagado', month: 'Marzo', atraso: 0 },
        { folio: 'FAC-26002', date: '05 Feb 2026', concept: 'Cuota de mantenimiento', amount: 2500, status: 'Pagado', month: 'Febrero', atraso: 2 },
        { folio: 'FAC-26003', date: '05 Ene 2026', concept: 'Cuota de mantenimiento', amount: 2500, status: 'Pagado', month: 'Enero', atraso: 0 }
    ]

    const initialPaymentHistory = useMemo(() => {
        const source = liveInvoices.length > 0 ? liveInvoices : dbInvoices
        if (source.length > 0) {
            return source.map((inv: any) => ({
                folio: inv.folio || '—',
                date: formatDate(inv.due_date || inv.created_at),
                concept: inv.description || 'Cuota de mantenimiento',
                amount: inv.amount || 0,
                status: mapStatus(inv.status),
                month: MESES_ES[new Date(inv.due_date || inv.created_at).getMonth()] || 'Sin fecha',
                atraso: inv.atraso || 0,
                rawStatus: inv.status,
            }))
        }
        return mockHistory
    }, [liveInvoices, dbInvoices])

    const [selectedMonth, setSelectedMonth] = useState('Todos')
    
    const availableMonths = [
        'Todos', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 
        'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]

    const filteredHistory = useMemo(() => {
        if (selectedMonth === 'Todos') return initialPaymentHistory
        return initialPaymentHistory.filter(p => p.month === selectedMonth)
    }, [selectedMonth, initialPaymentHistory])

    // ─── MOTOR DE CÁLCULO INTELIGENTE ────────────────────────────────────────
    const currentMonthStr = MESES_ES[today.getMonth()]
    const currentYear = today.getFullYear()
    const rawSource = liveInvoices.length > 0 ? liveInvoices : dbInvoices

    // Agrupa cuánto se pagó (paid) por año-mes real usando due_date
    const monthlyPaid = useMemo(() => {
        const map: Record<string, { paid: number; year: number; monthIndex: number; monthStr: string }> = {}
        rawSource.forEach((inv: any) => {
            const d = new Date(inv.due_date || inv.created_at)
            const monthIndex = d.getMonth()
            const year = d.getFullYear()
            const monthStr = MESES_ES[monthIndex]
            const key = `${year}-${monthStr}`
            if (!map[key]) map[key] = { paid: 0, year, monthIndex, monthStr }
            if (inv.status === 'paid') map[key].paid += inv.amount || 0
        })
        return map
    }, [rawSource])

    // ¿Ya pasó el día límite de pago de ese mes?
    const isMonthPastDeadline = (year: number, monthIndex: number): boolean =>
        today > new Date(year, monthIndex, paymentDeadline, 23, 59, 59)

    // Déficit de un mes = cuota - pagado (solo si ya venció el plazo)
    const getMonthDeficit = (year: number, monthIndex: number, monthStr: string): number => {
        if (!isMonthPastDeadline(year, monthIndex)) return 0
        const paid = monthlyPaid[`${year}-${monthStr}`]?.paid || 0
        return Math.max(0, montoCuota - paid)
    }

    // 2. Total Pagado → responde al filtro de la tabla
    const totalPagado = useMemo(() =>
        filteredHistory
            .filter((p: any) => p.rawStatus === 'paid' || p.status === 'Pagado')
            .reduce((acc: number, curr: any) => acc + curr.amount, 0)
    , [filteredHistory])
    const cuotasPagadas = filteredHistory.filter((p: any) => p.rawStatus === 'paid' || p.status === 'Pagado').length

    // 3. Pendiente → sólo aplica al mes actual dentro del plazo
    const montoPendiente = useMemo(() => {
        const targetMonth = selectedMonth === 'Todos' ? currentMonthStr : selectedMonth
        if (targetMonth !== currentMonthStr) return 0
        if (dayOfMonth > paymentDeadline) return 0
        const paid = monthlyPaid[`${currentYear}-${currentMonthStr}`]?.paid || 0
        return Math.max(0, montoCuota - paid)
    }, [monthlyPaid, selectedMonth, currentMonthStr, currentYear, dayOfMonth, paymentDeadline, montoCuota])

    // 4. Morosidad inteligente: déficit acumulado por mes
    //    → Filtro mes específico: déficit de ESE mes (cuota - pagado ese mes)
    //    → Filtro 'Todos': suma déficit de todos los meses vencidos
    //    → Persiste mes a mes hasta que el residente liquide
    const montoMorosidad = useMemo(() => {
        if (selectedMonth === 'Todos') {
            return Object.values(monthlyPaid).reduce((acc, { year, monthIndex, monthStr }) => {
                return acc + getMonthDeficit(year, monthIndex, monthStr)
            }, 0)
        } else {
            const entry = Object.values(monthlyPaid).find(e => e.monthStr === selectedMonth)
            if (!entry) return 0
            return getMonthDeficit(entry.year, entry.monthIndex, entry.monthStr)
        }
    }, [monthlyPaid, selectedMonth, montoCuota, paymentDeadline])

    const cuotasTotalesGeneradas = cuotasPagadas + (montoMorosidad > 0 ? 1 : 0)
    const cumplimientoPorcentaje = Math.round((cuotasPagadas / 12) * 100)

    // ─── ESTADO FINANCIERO DEL HERO (basado en cálculos reales, no en DB) ──────
    // Monto total que debe el residente en este momento (acumulado de todos los meses)
    const montoMorosidadTotal = useMemo(() =>
        Object.values(monthlyPaid).reduce((acc, { year, monthIndex, monthStr }) =>
            acc + getMonthDeficit(year, monthIndex, monthStr)
        , 0)
    , [monthlyPaid, montoCuota, paymentDeadline])

    const montoPendienteTotal = useMemo(() => {
        if (dayOfMonth > paymentDeadline) return 0
        const paid = monthlyPaid[`${currentYear}-${currentMonthStr}`]?.paid || 0
        return Math.max(0, montoCuota - paid)
    }, [monthlyPaid, currentYear, currentMonthStr, dayOfMonth, paymentDeadline, montoCuota])

    // Banderas del Hero (siempre sobre el estado global, ignorando el filtro)
    const heroIsOverdue = montoMorosidadTotal > 0
    const heroIsPending = !heroIsOverdue && montoPendienteTotal > 0
    const heroIsUpToDate = !heroIsOverdue && !heroIsPending
    const heroDebt = heroIsOverdue ? montoMorosidadTotal : heroIsPending ? montoPendienteTotal : 0

    return (
        <div className="mx-auto max-w-7xl space-y-12 p-6 md:p-10 animate-in fade-in duration-500 bg-[#09090b] min-h-screen font-sans">
            
            {/* 1. HERO PRINCIPAL: ESTADO FINANCIERO */}
            <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.005 }}
                className="relative overflow-hidden bg-zinc-900/50 border border-white/[0.05] rounded-[3rem] p-8 md:p-12 shadow-[0_0_50px_rgba(0,0,0,0.5)] group transition-all duration-700 hover:border-white/10"
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
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button className={cn(
                                        "h-16 px-10 rounded-2xl text-lg font-black shadow-2xl transition-all flex items-center gap-4 group/btn",
                                        heroIsOverdue ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/40" : "bg-blue-600 hover:bg-blue-500 shadow-blue-600/40"
                                    )}>
                                        {heroIsOverdue ? "Regularizar saldo" : "Pagar ahora"}
                                        <ChevronRight className="h-5 w-5 group-hover/btn:translate-x-1 transition-transform" />
                                    </Button>
                                </motion.div>
                            )}
                            
                            <motion.div 
                                whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] text-zinc-500 text-xs font-bold uppercase tracking-widest transition-colors"
                            >
                                <ShieldCheck className="h-4 w-4 text-blue-400" />
                                Pago seguro con MercadoPago
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

            {/* 2. CUATRO TARJETAS FINANCIERAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard 
                    title="Cuota Mensual" 
                    value={`$${montoCuota.toLocaleString('es-MX')}`} 
                    subtitle="Cuota fija del condominio" 
                    icon={DollarSign}
                    color="indigo"
                    delay={0.1}
                />
                <MetricCard 
                    title="Total Pagado" 
                    value={`$${totalPagado.toLocaleString('es-MX')}`} 
                    subtitle={cuotasPagadas > 0 ? `${cuotasPagadas} cuota${cuotasPagadas > 1 ? 's' : ''} liquidada${cuotasPagadas > 1 ? 's' : ''}` : 'Sin pagos registrados'} 
                    icon={TrendingUp}
                    color="emerald"
                    delay={0.2}
                />
                <MetricCard 
                    title="Pendiente" 
                    value={`$${montoPendiente.toLocaleString('es-MX')}`} 
                    subtitle={
                        montoPendiente > 0 
                            ? `Vence el día ${paymentDeadline} del mes`
                            : dayOfMonth <= paymentDeadline 
                                ? 'Sin cargos pendientes'
                                : 'Periodo de pago cerrado'
                    }
                    icon={Clock}
                    color="amber"
                    delay={0.3}
                />
                <MetricCard 
                    title="Morosidad" 
                    value={`$${montoMorosidad.toLocaleString('es-MX')}`} 
                    subtitle={montoMorosidad > 0 ? `Después del día ${paymentDeadline}` : 'Sin pagos vencidos'} 
                    icon={ShieldAlert}
                    color="rose"
                    delay={0.4}
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

                <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Folio</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Fecha</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Concepto</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Monto</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Atraso</th>
                                <th className="px-10 py-8 text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Estado</th>
                                <th className="px-10 py-8 text-right text-zinc-500 font-black text-xs uppercase tracking-[0.2em]">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            <AnimatePresence mode='popLayout'>
                                {filteredHistory.map((payment, i) => (
                                    <motion.tr 
                                        key={payment.folio} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="group hover:bg-white/[0.02] transition-colors"
                                    >
                                        <td className="px-10 py-8">
                                            <span className="text-white font-bold tracking-tight">{payment.folio}</span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="text-zinc-400 font-medium">{payment.date}</span>
                                                <span className="text-[10px] text-zinc-600 font-black uppercase">Confirmado</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                    <Receipt size={16} />
                                                </div>
                                                <span className="text-zinc-400 font-medium">{payment.concept}</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="text-2xl font-black text-white tracking-tighter italic">
                                                ${payment.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            {payment.atraso > 0 ? (
                                                <span className={cn(
                                                    "text-xs font-bold tabular-nums",
                                                    payment.atraso > 15 ? "text-rose-400" : "text-amber-400"
                                                )}>
                                                    {payment.atraso} día{payment.atraso !== 1 ? 's' : ''}
                                                </span>
                                            ) : (
                                                <span className="text-zinc-600 text-xs font-bold">—</span>
                                            )}
                                        </td>
                                        <td className="px-10 py-8">
                                            <Badge className={cn(
                                                "px-4 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-widest border",
                                                ((payment as any).rawStatus === 'paid' || payment.status === 'Pagado')
                                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                    : ((payment as any).rawStatus === 'overdue' || payment.status === 'Vencido')
                                                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                                        : ((payment as any).rawStatus === 'pending' || payment.status === 'Pendiente')
                                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                            )}>
                                                {payment.status}
                                            </Badge>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex justify-end">
                                                <motion.button 
                                                    whileHover={{ scale: 1.2, rotate: 12 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all shadow-[0_0_20px_rgba(16,185,129,0)] hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                                                >
                                                    <Receipt size={20} />
                                                </motion.button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
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
                
                <div className="flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-black uppercase tracking-widest">
                        <AlertCircle size={14} className="text-amber-500" />
                        Próximo corte: {new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long' }).format(new Date(today.getFullYear(), today.getMonth() + 1, 10))}
                    </div>
                    <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors">
                        <Bell size={14} />
                        Configurar Alertas
                    </button>
                </div>
            </motion.div>
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

