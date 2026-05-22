'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { 
    Clock, 
    CheckCircle2, 
    XCircle,
    User,
    Calendar,
    DollarSign,
    FileText,
    MessageSquare,
    X,
    TrendingDown,
    Send,
    FileCheck,
    History,
    Activity,
    CreditCard,
    AlertCircle,
    Info,
    Receipt,
    ClipboardList,
    TrendingUp,
    ExternalLink
} from 'lucide-react'
import { 
    getAgreementInstallmentsAction, 
    updateInstallmentStatusAction, 
    sendInstallmentReminderAction, 
    getAgreementHistoryAction 
} from '@/app/actions/payment-agreement-actions'

interface PaymentAgreement {
    id: string
    resident_id: string
    resident_name: string
    total_debt: number | null
    agreement_details: string
    comments: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    approved_by?: string | null
    approved_at?: string | null
    condominium_id?: string
    rejection_reason?: string | null
}

interface AgreementInstallment {
    id: string
    agreement_id: string
    resident_id: string
    installment_number: number
    amount: number
    due_date: string
    status: 'pending' | 'paid' | 'overdue'
    paid_at?: string | null
    payment_method?: string | null
    payment_reference?: string | null
    notes?: string | null
    created_at: string
}

interface TimelineEvent {
    id: string
    type: 'creation' | 'status_change' | 'payment' | 'reminder'
    date: string
    title: string
    description: string
    icon: any
    color: string
}

interface AgreementDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    agreement: PaymentAgreement
    admin: any
    onApprove: (id: string) => Promise<void>
    onReject: (id: string, reason: string) => Promise<void>
    actionLoadingId: string | null
    initialIsRejecting?: boolean
}

export function AgreementDetailsModal({
    isOpen,
    onClose,
    agreement: initialAgreement,
    admin,
    onApprove,
    onReject,
    actionLoadingId,
    initialIsRejecting = false
}: AgreementDetailsModalProps) {
    const [agreement, setAgreement] = useState<PaymentAgreement>(initialAgreement)
    const [installments, setInstallments] = useState<AgreementInstallment[]>([])
    const [historyLogs, setHistoryLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [isRejecting, setIsRejecting] = useState(initialIsRejecting)
    const [rejectionReason, setRejectionReason] = useState('')
    
    // Sub-modal states
    const [paymentModalInstallment, setPaymentModalInstallment] = useState<AgreementInstallment | null>(null)
    const [receiptModalInstallment, setReceiptModalInstallment] = useState<AgreementInstallment | null>(null)
    
    // Payment form states
    const [paymentMethod, setPaymentMethod] = useState('Transferencia')
    const [paymentReference, setPaymentReference] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')

    // Fetch installments and history logs
    const fetchInstallmentsAndLogs = async () => {
        try {
            setLoading(true)
            const [instRes, histRes] = await Promise.all([
                getAgreementInstallmentsAction(agreement.id),
                getAgreementHistoryAction(agreement.resident_id)
            ])

            if (instRes.success) {
                setInstallments(instRes.data || [])
            } else {
                toast.error(instRes.error || 'Error al cargar cuotas')
            }

            if (histRes.success) {
                setHistoryLogs(histRes.data || [])
            }
        } catch (error: any) {
            console.error('Error fetching details:', error)
            toast.error('No se pudieron cargar los detalles del convenio')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isOpen) {
            setAgreement(initialAgreement)
            setIsRejecting(initialIsRejecting)
            setRejectionReason('')
            fetchInstallmentsAndLogs()
        }
    }, [isOpen, initialAgreement.id, initialIsRejecting])

    if (!isOpen) return null

    // Format currency helper
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'No especificado'
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    // Calculations for KPI Summary
    const totalDebt = agreement.total_debt || 0
    const totalPaid = installments
        .filter(inst => inst.status === 'paid')
        .reduce((sum, inst) => sum + inst.amount, 0)
    const remainingBalance = totalDebt - totalPaid
    
    // Get next unpaid installment due date
    const nextUnpaidInstallment = installments
        .filter(inst => inst.status !== 'paid')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

    // Handle internal approval/rejection action
    const handleApprove = async () => {
        await onApprove(agreement.id)
        setAgreement(prev => ({ ...prev, status: 'approved', approved_at: new Date().toISOString() }))
        fetchInstallmentsAndLogs() // Refresh to load newly created installments
    }

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Por favor ingresa un motivo para el rechazo')
            return
        }
        await onReject(agreement.id, rejectionReason)
        setAgreement(prev => ({ 
            ...prev, 
            status: 'rejected', 
            approved_at: new Date().toISOString(), 
            rejection_reason: rejectionReason 
        }))
        setIsRejecting(false)
    }

    // Installment actions
    const handleMarkAsPaid = async () => {
        if (!paymentModalInstallment) return
        try {
            setProcessingId(paymentModalInstallment.id)
            const result = await updateInstallmentStatusAction({
                id: paymentModalInstallment.id,
                status: 'paid',
                paidAt: new Date().toISOString(),
                paymentMethod,
                paymentReference: paymentReference || null,
                notes: paymentNotes || null
            })

            if (result.success) {
                toast.success(`Cuota #${paymentModalInstallment.installment_number} marcada como pagada`)
                setPaymentModalInstallment(null)
                // Clear payment form
                setPaymentMethod('Transferencia')
                setPaymentReference('')
                setPaymentNotes('')
                
                // Refresh data
                await fetchInstallmentsAndLogs()
            } else {
                toast.error(result.error || 'Error al actualizar cuota')
            }
        } catch (error) {
            console.error('Error marking as paid:', error)
            toast.error('Error al actualizar el estado de la cuota')
        } finally {
            setProcessingId(null)
        }
    }

    const handleSendReminder = async (inst: AgreementInstallment) => {
        try {
            setProcessingId(inst.id)
            const result = await sendInstallmentReminderAction({
                installmentId: inst.id,
                agreementId: agreement.id,
                residentId: agreement.resident_id,
                installmentNumber: inst.installment_number,
                amount: inst.amount,
                dueDate: inst.due_date,
                organizationId: agreement.condominium_id || admin.organization_id || '',
                adminUserId: admin.user_id || admin.id || ''
            })

            if (result.success) {
                if (result.webhook_sent) {
                    toast.success(`Recordatorio de cuota #${inst.installment_number} enviado correctamente.`)
                } else {
                    toast.warning(`Recordatorio registrado, pero la notificación por WhatsApp no se pudo despachar (Webhook n8n inactivo).`)
                }
                // Refresh history timeline
                await fetchInstallmentsAndLogs()
            } else {
                toast.error(result.error || 'Error al enviar recordatorio')
            }
        } catch (error) {
            console.error('Error sending reminder:', error)
            toast.error('Error al enviar el recordatorio')
        } finally {
            setProcessingId(null)
        }
    }

    // Build timeline events chronologically
    const buildTimeline = (): TimelineEvent[] => {
        const events: TimelineEvent[] = []

        // 1. Creation event
        events.push({
            id: 'creation',
            type: 'creation',
            date: agreement.created_at,
            title: 'Convenio creado',
            description: 'El residente solicitó o propuso el plan de financiamiento.',
            icon: Clock,
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        })

        // 2. Status change event
        if (agreement.status === 'approved' && agreement.approved_at) {
            events.push({
                id: 'approval',
                type: 'status_change',
                date: agreement.approved_at,
                title: 'Convenio aprobado',
                description: `El convenio fue aprobado por la administración.`,
                icon: CheckCircle2,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            })
        } else if (agreement.status === 'rejected' && agreement.approved_at) {
            events.push({
                id: 'rejection',
                type: 'status_change',
                date: agreement.approved_at,
                title: 'Convenio rechazado',
                description: agreement.rejection_reason 
                    ? `Motivo: "${agreement.rejection_reason}"` 
                    : 'El convenio fue rechazado por la administración.',
                icon: XCircle,
                color: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
            })
        }

        // 3. Paid installments events
        installments
            .filter(inst => inst.status === 'paid' && inst.paid_at)
            .forEach(inst => {
                events.push({
                    id: `pay-${inst.id}`,
                    type: 'payment',
                    date: inst.paid_at!,
                    title: `Pago registrado - Cuota #${inst.installment_number}`,
                    description: `Monto: ${formatCurrency(inst.amount)} | Método: ${inst.payment_method || 'N/A'}${inst.payment_reference ? ` | Ref: ${inst.payment_reference}` : ''}`,
                    icon: Receipt,
                    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20'
                })
            })

        // 4. Reminders sent events (from communication logs)
        historyLogs.forEach(log => {
            events.push({
                id: `rem-${log.id}`,
                type: 'reminder',
                date: log.created_at,
                title: 'Recordatorio enviado',
                description: `${log.message_type || 'Recordatorio de pago'} por WhatsApp.`,
                icon: Send,
                color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
            })
        })

        // Sort events descending by date
        return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    const timelineEvents = buildTimeline()

    // Status styling helpers
    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'pending':
                return { bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400', label: 'Pendiente', dot: 'bg-amber-500' }
            case 'approved':
                return { bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400', label: 'Aprobado', dot: 'bg-emerald-500' }
            case 'rejected':
                return { bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400', label: 'Rechazado', dot: 'bg-rose-500' }
            default:
                return { bg: 'bg-zinc-800 border-zinc-700 text-zinc-500', label: 'Desconocido', dot: 'bg-zinc-500' }
        }
    }

    const getInstallmentStatusStyles = (status: string) => {
        switch (status) {
            case 'paid':
                return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: 'Pagada' }
            case 'overdue':
                return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', label: 'Vencida' }
            case 'pending':
            default:
                return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: 'Pendiente' }
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-zinc-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 15 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="bg-zinc-900 border border-zinc-800/80 w-full max-w-6xl rounded-[2.5rem] shadow-2xl relative overflow-hidden my-8"
            >
                {/* Background ambient glows */}
                <div className="absolute top-0 left-1/4 w-[500px] h-[200px] rounded-full pointer-events-none blur-[120px] opacity-10 bg-gradient-to-r from-violet-600 to-indigo-600" />
                <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full pointer-events-none blur-[120px] opacity-15 ${
                    agreement.status === 'approved' ? 'bg-emerald-500' : agreement.status === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'
                }`} />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 bg-zinc-950/40 hover:bg-zinc-800/80 text-zinc-400 hover:text-white rounded-full border border-zinc-850 hover:border-zinc-700 transition-all z-20 cursor-pointer"
                >
                    <X size={18} />
                </button>

                <div className="p-6 md:p-8 space-y-8">
                    {/* 1. Header Section */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800/50">
                        <div className="flex items-start gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center flex-shrink-0 shadow-lg">
                                <User size={24} />
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-none">
                                        {agreement.resident_name}
                                    </h1>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${getStatusStyles(agreement.status).bg}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${getStatusStyles(agreement.status).dot}`} />
                                        {getStatusStyles(agreement.status).label}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center text-xs text-zinc-500 gap-x-4 gap-y-1.5 font-medium">
                                    <span className="flex items-center gap-1">
                                        <span className="text-[10px] text-zinc-600 font-bold uppercase">Convenio ID:</span>
                                        <code className="text-zinc-400 bg-zinc-950/40 px-1.5 py-0.5 rounded border border-zinc-850/60 text-[10px]">{agreement.id.slice(0, 8)}</code>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar size={13} className="text-zinc-600" />
                                        <span>Solicitado el {format(new Date(agreement.created_at), 'd MMM, yyyy', { locale: es })}</span>
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Approval / Rejection Actions (when status is pending) */}
                        {agreement.status === 'pending' && (
                            <div className="flex flex-wrap items-center gap-3">
                                {isRejecting ? (
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <input
                                            type="text"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Motivo del rechazo..."
                                            className="bg-zinc-950/60 border border-rose-500/25 focus:border-rose-500/50 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none w-full sm:w-48 placeholder-zinc-600 focus:ring-1 focus:ring-rose-500/20"
                                        />
                                        <button
                                            disabled={actionLoadingId === agreement.id}
                                            onClick={handleReject}
                                            className="h-9 px-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1 flex-shrink-0 cursor-pointer"
                                        >
                                            Confirmar
                                        </button>
                                        <button
                                            onClick={() => { setIsRejecting(false); setRejectionReason('') }}
                                            className="h-9 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all flex-shrink-0 cursor-pointer"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            disabled={actionLoadingId === agreement.id}
                                            onClick={handleApprove}
                                            className="h-10 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-[0_4px_20px_-2px_rgba(16,185,129,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            {actionLoadingId === agreement.id ? (
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    <CheckCircle2 size={14} /> Aprobar Plan
                                                </>
                                            )}
                                        </button>
                                        <button
                                            disabled={actionLoadingId === agreement.id}
                                            onClick={() => setIsRejecting(true)}
                                            className="h-10 px-5 bg-zinc-950/60 hover:bg-rose-500/10 hover:text-rose-400 text-zinc-400 rounded-xl text-xs font-extrabold uppercase tracking-wider border border-zinc-800 hover:border-rose-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <XCircle size={14} /> Rechazar Plan
                                        </button>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 2. KPI Summary Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Card 1: Deuda Total */}
                        <div className="relative group bg-zinc-950/40 border border-zinc-800/40 rounded-3xl p-5 overflow-hidden transition-all duration-300 hover:border-zinc-700/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-15 transition-opacity text-violet-400">
                                <DollarSign size={40} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Deuda Total
                            </p>
                            <p className="text-2xl font-black text-white tracking-tight">{formatCurrency(totalDebt)}</p>
                            <p className="text-[9px] text-zinc-600 mt-1 font-medium">Financiamiento acordado inicial</p>
                        </div>

                        {/* Card 2: Saldo Restante */}
                        <div className="relative group bg-zinc-950/40 border border-zinc-800/40 rounded-3xl p-5 overflow-hidden transition-all duration-300 hover:border-zinc-700/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-15 transition-opacity text-amber-500">
                                <TrendingDown size={40} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Saldo Restante
                            </p>
                            <p className="text-2xl font-black text-amber-500 tracking-tight">{formatCurrency(remainingBalance)}</p>
                            <p className="text-[9px] text-zinc-600 mt-1 font-medium">Monto total por amortizar</p>
                        </div>

                        {/* Card 3: Total Pagado */}
                        <div className="relative group bg-zinc-950/40 border border-zinc-800/40 rounded-3xl p-5 overflow-hidden transition-all duration-300 hover:border-zinc-700/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-15 transition-opacity text-emerald-500">
                                <CheckCircle2 size={40} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Total Pagado
                            </p>
                            <p className="text-2xl font-black text-emerald-400 tracking-tight">{formatCurrency(totalPaid)}</p>
                            <p className="text-[9px] text-zinc-600 mt-1 font-medium">
                                {installments.length > 0 
                                    ? `${installments.filter(i => i.status === 'paid').length} de ${installments.length} cuotas cubiertas`
                                    : 'Aún sin cuotas pagadas'}
                            </p>
                        </div>

                        {/* Card 4: Próximo Vencimiento */}
                        <div className="relative group bg-zinc-950/40 border border-zinc-800/40 rounded-3xl p-5 overflow-hidden transition-all duration-300 hover:border-zinc-700/50">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-15 transition-opacity text-indigo-400">
                                <Calendar size={40} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" /> Próximo Vencimiento
                            </p>
                            <p className="text-lg font-black text-white tracking-tight truncate pt-0.5">
                                {nextUnpaidInstallment 
                                    ? format(new Date(nextUnpaidInstallment.due_date), 'd MMM, yyyy', { locale: es }) 
                                    : agreement.status === 'pending' ? 'Pendiente aprobación' : 'Sin pendientes 🎉'}
                            </p>
                            <p className="text-[9px] text-zinc-600 mt-1.5 font-medium">
                                {nextUnpaidInstallment 
                                    ? `Cuota #${nextUnpaidInstallment.installment_number} por ${formatCurrency(nextUnpaidInstallment.amount)}` 
                                    : 'Todo al corriente'}
                            </p>
                        </div>
                    </div>

                    {/* Proposal Details Info Card */}
                    <div className="bg-zinc-950/20 border border-zinc-800/40 rounded-3xl p-6 space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/35">
                            <FileText size={16} className="text-violet-400" />
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Detalles de la propuesta y comentarios</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                            <div className="space-y-1.5">
                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Plan Propuesto</p>
                                <p className="text-zinc-300 font-medium whitespace-pre-wrap leading-relaxed">
                                    {agreement.agreement_details || 'Sin detalles propuestos.'}
                                </p>
                            </div>
                            {agreement.comments && (
                                <div className="space-y-1.5">
                                    <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Comentarios del Residente</p>
                                    <p className="text-zinc-400 font-medium italic leading-relaxed">
                                        "{agreement.comments}"
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Main Content Split Panel */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        {/* Left column (7 cols) - Calendario de pagos */}
                        <div className="lg:col-span-8 space-y-5">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                    <ClipboardList size={18} className="text-violet-400" />
                                    Calendario de Pagos
                                </h2>
                                <span className="text-xs text-zinc-500 font-bold">
                                    {installments.length} cuotas
                                </span>
                            </div>

                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center border border-zinc-800/40 rounded-3xl bg-zinc-950/20 space-y-3">
                                    <div className="h-8 w-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                                    <p className="text-xs text-zinc-500">Cargando calendario de cuotas...</p>
                                </div>
                            ) : installments.length === 0 ? (
                                <div className="py-16 px-6 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/20">
                                    <div className="h-12 w-12 bg-zinc-900 border border-zinc-800/80 rounded-xl flex items-center justify-center text-zinc-500 mx-auto mb-4">
                                        <Info size={22} />
                                    </div>
                                    <h3 className="text-zinc-400 font-bold text-sm">No hay cuotas registradas</h3>
                                    <p className="text-zinc-600 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                                        {agreement.status === 'pending'
                                            ? 'Este convenio aún no ha sido aprobado. El calendario de pagos se generará automáticamente en cuanto la propuesta sea aprobada.'
                                            : 'No se encontraron cuotas para este convenio. Verifica si ocurrió un problema al activar el webhook de n8n.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-zinc-950/20 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-inner">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-zinc-850 bg-zinc-900/60">
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Cuota</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Vencimiento</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Monto</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Estado</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-900/60">
                                                {installments.map((inst, index) => {
                                                    const statusStyle = getInstallmentStatusStyles(inst.status)
                                                    const isProcessing = processingId === inst.id

                                                    return (
                                                        <tr 
                                                            key={inst.id}
                                                            className="hover:bg-zinc-900/35 transition-colors group/row"
                                                        >
                                                            {/* Number */}
                                                            <td className="px-6 py-4 font-bold text-xs text-white">
                                                                Cuota {inst.installment_number}
                                                            </td>
                                                            
                                                            {/* Due Date */}
                                                            <td className="px-6 py-4 text-xs text-zinc-400 font-medium">
                                                                {format(new Date(inst.due_date), "d 'de' MMMM, yyyy", { locale: es })}
                                                            </td>

                                                            {/* Amount */}
                                                            <td className="px-6 py-4 font-bold text-xs text-white">
                                                                {formatCurrency(inst.amount)}
                                                            </td>

                                                            {/* Status */}
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${statusStyle.bg}`}>
                                                                    {statusStyle.label}
                                                                </span>
                                                            </td>

                                                            {/* Actions */}
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {inst.status !== 'paid' ? (
                                                                        <>
                                                                            {/* Mark Paid */}
                                                                            <button
                                                                                disabled={isProcessing}
                                                                                onClick={() => setPaymentModalInstallment(inst)}
                                                                                className="h-8 px-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                                                title="Marcar como pagada"
                                                                            >
                                                                                <FileCheck size={12} />
                                                                                <span>Pagar</span>
                                                                            </button>

                                                                            {/* Send Reminder */}
                                                                            <button
                                                                                disabled={isProcessing}
                                                                                onClick={() => handleSendReminder(inst)}
                                                                                className="h-8 px-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                                                title="Enviar recordatorio de WhatsApp"
                                                                            >
                                                                                {isProcessing ? (
                                                                                    <div className="h-3 w-3 border border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                                                ) : (
                                                                                    <Send size={12} />
                                                                                )}
                                                                                <span>Recordatorio</span>
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        /* View Receipt */
                                                                        <button
                                                                            onClick={() => setReceiptModalInstallment(inst)}
                                                                            className="h-8 px-2.5 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                                            title="Ver comprobante de pago"
                                                                        >
                                                                            <Receipt size={12} />
                                                                            <span>Comprobante</span>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right column (4 cols) - Historial de actividad */}
                        <div className="lg:col-span-4 space-y-5">
                            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                <History size={18} className="text-violet-400" />
                                Historial de Convenio
                            </h2>

                            {loading ? (
                                <div className="py-12 flex flex-col items-center justify-center border border-zinc-800/40 rounded-3xl bg-zinc-950/20 space-y-3">
                                    <div className="h-6 w-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                                    <p className="text-[10px] text-zinc-500">Cargando historial...</p>
                                </div>
                            ) : (
                                <div className="bg-zinc-950/25 border border-zinc-800/40 rounded-3xl p-5 relative overflow-hidden max-h-[500px] overflow-y-auto custom-scrollbar">
                                    {timelineEvents.length === 0 ? (
                                        <p className="text-xs text-zinc-500 text-center py-8">Sin eventos registrados aún.</p>
                                    ) : (
                                        <div className="relative pl-4 border-l border-zinc-850 space-y-6">
                                            {timelineEvents.map((evt, idx) => {
                                                const IconComponent = evt.icon
                                                return (
                                                    <div key={evt.id || idx} className="relative group/item">
                                                        {/* Icon Dot */}
                                                        <div className={`absolute -left-[25px] top-0 h-[18px] w-[18px] rounded-full border flex items-center justify-center shadow ${evt.color}`}>
                                                            <IconComponent size={10} />
                                                        </div>

                                                        {/* Details */}
                                                        <div className="space-y-1">
                                                            <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block leading-none">
                                                                {format(new Date(evt.date), "d MMM, yyyy - h:mm a", { locale: es })}
                                                            </span>
                                                            <h4 className="text-xs font-black text-white leading-tight">
                                                                {evt.title}
                                                            </h4>
                                                            <p className="text-[11px] text-zinc-400 leading-normal font-medium">
                                                                {evt.description}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Sub-modal: Recordar Pago / Marcar Pagada */}
            <AnimatePresence>
                {paymentModalInstallment && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-zinc-900 border border-zinc-800/80 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5"
                        >
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/40">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                    <FileCheck size={16} className="text-emerald-400" />
                                    Registrar Pago de Cuota
                                </h3>
                                <button 
                                    onClick={() => setPaymentModalInstallment(null)}
                                    className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div className="p-4 bg-zinc-950/60 border border-zinc-850 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Cuota a procesar</p>
                                        <p className="text-sm font-black text-white">Cuota #{paymentModalInstallment.installment_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Monto a pagar</p>
                                        <p className="text-lg font-black text-emerald-400">{formatCurrency(paymentModalInstallment.amount)}</p>
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Método de Pago</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition-colors cursor-pointer"
                                    >
                                        <option value="Transferencia">Transferencia Bancaria</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                                        <option value="Depósito">Depósito en Ventanilla</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>

                                {/* Reference */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Referencia / Folio de Operación</label>
                                    <input
                                        type="text"
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Ej: TXN-9482012"
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition-colors"
                                    />
                                </div>

                                {/* Notes */}
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Notas / Comentarios</label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        placeholder="Detalles adicionales del pago..."
                                        rows={2}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-violet-500 rounded-xl p-3 text-xs text-white resize-none outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setPaymentModalInstallment(null)}
                                    className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={processingId === paymentModalInstallment.id}
                                    onClick={handleMarkAsPaid}
                                    className="flex-1 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-[0_4px_15px_-2px_rgba(16,185,129,0.25)] flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                    {processingId === paymentModalInstallment.id ? (
                                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} /> Confirmar Pago
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Sub-modal: Ver Comprobante */}
            <AnimatePresence>
                {receiptModalInstallment && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-zinc-900 border border-zinc-800/80 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl p-6 space-y-5"
                        >
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/40">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                    <Receipt size={16} className="text-violet-400" />
                                    Detalle del Pago Registrado
                                </h3>
                                <button 
                                    onClick={() => setReceiptModalInstallment(null)}
                                    className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs">
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <p className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider">Cuota cobrada</p>
                                        <p className="text-sm font-black text-white">Cuota #{receiptModalInstallment.installment_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider">Monto recibido</p>
                                        <p className="text-lg font-black text-emerald-400">{formatCurrency(receiptModalInstallment.amount)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Método de Pago</p>
                                        <p className="text-xs font-bold text-white">{receiptModalInstallment.payment_method || 'No especificado'}</p>
                                    </div>
                                    <div className="p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Fecha de Registro</p>
                                        <p className="text-xs font-bold text-white">
                                            {receiptModalInstallment.paid_at 
                                                ? format(new Date(receiptModalInstallment.paid_at), 'd MMM, yyyy', { locale: es })
                                                : 'No especificada'}
                                        </p>
                                    </div>
                                </div>

                                {receiptModalInstallment.payment_reference && (
                                    <div className="p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Referencia / Folio</p>
                                        <p className="text-xs font-mono font-bold text-white select-all">{receiptModalInstallment.payment_reference}</p>
                                    </div>
                                )}

                                {receiptModalInstallment.notes && (
                                    <div className="p-3 bg-zinc-950/50 border border-zinc-850 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Notas / Observaciones</p>
                                        <p className="text-xs text-zinc-300 font-medium">{receiptModalInstallment.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setReceiptModalInstallment(null)}
                                    className="w-full h-10 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
