'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    CreditCard,
    AlertCircle,
    Info,
    Receipt,
    ClipboardList,
    Upload,
    Plus,
    Loader2,
    Check
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { 
    updateInstallmentStatusAction, 
    sendInstallmentReminderAction, 
    createResidentAgreementAction,
    getAgreementInstallmentsAction,
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

interface ResidentConveniosClientProps {
    resident: any
    agreements: PaymentAgreement[]
    initialInstallments: AgreementInstallment[]
}

export function ResidentConveniosClient({ 
    resident, 
    agreements: initialAgreements,
    initialInstallments 
}: ResidentConveniosClientProps) {
    const [agreements, setAgreements] = useState<PaymentAgreement[]>(initialAgreements)
    const [activeAgreement, setActiveAgreement] = useState<PaymentAgreement | null>(
        initialAgreements.find(ag => ag.status === 'approved' || ag.status === 'pending') || null
    )
    const [installments, setInstallments] = useState<AgreementInstallment[]>(initialInstallments)
    const [historyLogs, setHistoryLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    
    // Modal states
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
    const [paymentModalInstallment, setPaymentModalInstallment] = useState<AgreementInstallment | null>(null)
    const [uploadModalInstallment, setUploadModalInstallment] = useState<AgreementInstallment | null>(null)
    const [receiptModalInstallment, setReceiptModalInstallment] = useState<AgreementInstallment | null>(null)
    
    // Request form states
    const [reqTotalDebt, setReqTotalDebt] = useState('')
    const [reqInstallments, setReqInstallments] = useState('6')
    const [reqDetails, setReqDetails] = useState('')
    const [reqComments, setReqComments] = useState('')
    
    // Payout form states
    const [paymentMethod, setPaymentMethod] = useState('Transferencia')
    const [paymentReference, setPaymentReference] = useState('')
    const [paymentNotes, setPaymentNotes] = useState('')
    
    // File upload states
    const [fileBase64, setFileBase64] = useState('')
    const [fileName, setFileName] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

    // Load installments and logs for the active agreement
    const loadAgreementDetails = async (agreementId: string) => {
        try {
            setLoading(true)
            const [instRes, histRes] = await Promise.all([
                getAgreementInstallmentsAction(agreementId),
                getAgreementHistoryAction(resident.id)
            ])

            if (instRes.success) {
                setInstallments(instRes.data || [])
            }
            if (histRes.success) {
                setHistoryLogs(histRes.data || [])
            }
        } catch (error) {
            console.error('Error loading agreement details:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (activeAgreement) {
            loadAgreementDetails(activeAgreement.id)
        }
    }, [activeAgreement?.id])

    // Format currency helper
    const formatCurrency = (amount: number | null) => {
        if (amount === null) return '$0.00'
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    // Calculations for KPIs
    const totalDebt = activeAgreement?.total_debt || 0
    const totalPaid = installments
        .filter(inst => inst.status === 'paid')
        .reduce((sum, inst) => sum + inst.amount, 0)
    const remainingBalance = totalDebt - totalPaid
    
    const nextUnpaidInstallment = installments
        .filter(inst => inst.status !== 'paid')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]

    const paidCount = installments.filter(inst => inst.status === 'paid').length
    const progressPercentage = installments.length > 0 ? Math.round((paidCount / installments.length) * 100) : 0

    // Handle submitting a new payment agreement request
    const handleCreateRequest = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!reqTotalDebt || parseFloat(reqTotalDebt) <= 0) {
            toast.error('Por favor ingresa un monto de deuda válido.')
            return
        }

        setSubmitting(true)
        try {
            const fullName = `${resident.first_name || ''} ${resident.last_name || ''}`.trim() || 'Residente'
            const defaultDetails = `Plan propuesto de ${reqInstallments} cuotas para saldar deuda total de ${formatCurrency(parseFloat(reqTotalDebt))}.`
            const finalDetails = reqDetails.trim() || defaultDetails

            const res = await createResidentAgreementAction({
                resident_id: resident.id,
                resident_name: fullName,
                total_debt: parseFloat(reqTotalDebt),
                agreement_details: finalDetails,
                comments: reqComments,
                condominium_id: resident.condominium_id || resident.organization_id || ''
            })

            if (res.success && res.data) {
                toast.success('Solicitud de convenio enviada a la administración exitosamente.')
                setIsRequestModalOpen(false)
                
                // Reset form
                setReqTotalDebt('')
                setReqInstallments('6')
                setReqDetails('')
                setReqComments('')
                
                // Update active agreement
                const newAg = res.data as PaymentAgreement
                setActiveAgreement(newAg)
                setAgreements(prev => [newAg, ...prev])
            } else {
                toast.error(res.error || 'Error al enviar la solicitud.')
            }
        } catch (error: any) {
            console.error('Error creating request:', error)
            toast.error('Ocurrió un error inesperado al enviar la solicitud.')
        } finally {
            setSubmitting(false)
        }
    }

    // Handle file upload triggers
    const handleContainerClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            setFileName(file.name)
            const reader = new FileReader()
            reader.onloadend = () => {
                setFileBase64(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    // Handle marking an installment as paid
    const handleRegisterPayment = async (installment: AgreementInstallment, isUploadFlow = false) => {
        try {
            setActionLoadingId(installment.id)
            
            const finalNotes = isUploadFlow 
                ? `${paymentNotes}\n[Archivo comprobante: ${fileName || 'comprobante_cargado.bin'}]`
                : paymentNotes

            const result = await updateInstallmentStatusAction({
                id: installment.id,
                status: 'paid',
                paidAt: new Date().toISOString(),
                paymentMethod,
                paymentReference: paymentReference || `REF-${Date.now().toString().slice(-6)}`,
                notes: finalNotes || 'Pago registrado por el residente.'
            })

            if (result.success) {
                toast.success(`Cuota #${installment.installment_number} marcada como pagada correctamente.`)
                
                // Clear forms
                setPaymentModalInstallment(null)
                setUploadModalInstallment(null)
                setPaymentMethod('Transferencia')
                setPaymentReference('')
                setPaymentNotes('')
                setFileName('')
                setFileBase64('')

                // Refresh details
                if (activeAgreement) {
                    await loadAgreementDetails(activeAgreement.id)
                }
            } else {
                toast.error(result.error || 'Error al registrar el pago')
            }
        } catch (error) {
            console.error('Error registering payment:', error)
            toast.error('No se pudo registrar el pago.')
        } finally {
            setActionLoadingId(null)
        }
    }

    // Handle sending a reminder (Self-reminder via WhatsApp webhook)
    const handleSendReminder = async (installment: AgreementInstallment) => {
        try {
            setActionLoadingId(installment.id)
            const result = await sendInstallmentReminderAction({
                installmentId: installment.id,
                agreementId: activeAgreement!.id,
                residentId: resident.id,
                installmentNumber: installment.installment_number,
                amount: installment.amount,
                dueDate: installment.due_date,
                organizationId: resident.condominium_id || resident.organization_id || '',
                adminUserId: resident.user_id || resident.id
            })

            if (result.success) {
                if (result.webhook_sent) {
                    toast.success(`Recordatorio de cuota #${installment.installment_number} enviado a tu WhatsApp.`)
                } else {
                    toast.warning(`Recordatorio registrado, pero la notificación por WhatsApp no se pudo despachar (Webhook n8n inactivo).`)
                }
                
                // Refresh data to show in timeline
                if (activeAgreement) {
                    await loadAgreementDetails(activeAgreement.id)
                }
            } else {
                toast.error(result.error || 'Error al enviar el recordatorio.')
            }
        } catch (error) {
            console.error('Error sending reminder:', error)
            toast.error('No se pudo enviar el recordatorio.')
        } finally {
            setActionLoadingId(null)
        }
    }

    // Timeline event generator
    const buildTimeline = (): TimelineEvent[] => {
        if (!activeAgreement) return []
        const events: TimelineEvent[] = []

        // 1. Creation event
        events.push({
            id: 'creation',
            type: 'creation',
            date: activeAgreement.created_at,
            title: 'Convenio solicitado',
            description: 'Propuesta de financiamiento enviada a administración.',
            icon: Clock,
            color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        })

        // 2. Status change event
        if (activeAgreement.status === 'approved' && activeAgreement.approved_at) {
            events.push({
                id: 'approval',
                type: 'status_change',
                date: activeAgreement.approved_at,
                title: 'Convenio aprobado',
                description: 'La administración revisó y aprobó la propuesta de financiamiento.',
                icon: CheckCircle2,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
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
                    title: `Pago realizado - Cuota #${inst.installment_number}`,
                    description: `Monto: ${formatCurrency(inst.amount)} | Método: ${inst.payment_method || 'N/A'}${inst.payment_reference ? ` | Ref: ${inst.payment_reference}` : ''}`,
                    icon: Receipt,
                    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20'
                })
            })

        // 4. Overdue installments events
        installments
            .filter(inst => inst.status === 'overdue')
            .forEach(inst => {
                events.push({
                    id: `overdue-${inst.id}`,
                    type: 'status_change',
                    date: inst.due_date,
                    title: `Cuota #${inst.installment_number} vencida`,
                    description: `La fecha límite de pago (${format(new Date(inst.due_date), 'd MMM, yyyy', { locale: es })}) ha expirado.`,
                    icon: XCircle,
                    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                })
            })

        // 5. Reminders sent
        historyLogs.forEach(log => {
            events.push({
                id: `rem-${log.id}`,
                type: 'reminder',
                date: log.created_at,
                title: 'Recordatorio solicitado',
                description: `${log.message_type || 'Recordatorio de pago'} solicitado por WhatsApp.`,
                icon: Send,
                color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
            })
        })

        // 6. Finished Agreement
        if (installments.length > 0 && installments.every(inst => inst.status === 'paid')) {
            const lastPaymentDate = installments
                .map(inst => inst.paid_at ? new Date(inst.paid_at).getTime() : 0)
                .sort((a, b) => b - a)[0]

            events.push({
                id: 'finished',
                type: 'status_change',
                date: lastPaymentDate ? new Date(lastPaymentDate).toISOString() : new Date().toISOString(),
                title: 'Convenio finalizado 🎉',
                description: '¡Felicidades! Todas las cuotas del plan han sido saldadas.',
                icon: CheckCircle2,
                color: 'text-violet-400 bg-violet-500/10 border-violet-500/20'
            })
        }

        return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    }

    const timelineEvents = buildTimeline()

    const getInstallmentStatusStyles = (status: string) => {
        switch (status) {
            case 'paid':
                return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: 'Pagado' }
            case 'overdue':
                return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', label: 'Vencido' }
            case 'pending':
            default:
                return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: 'Pendiente' }
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10 min-h-screen">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tight italic flex items-center gap-4">
                        <ClipboardList className="h-8 w-8 text-indigo-500" /> Convenios
                    </h1>
                    <p className="text-zinc-500 font-medium">
                        Administra y consulta las cuotas de tu convenio de pago financiado.
                    </p>
                </div>

                {activeAgreement && (
                    <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900/50 px-4 py-2.5 rounded-2xl border border-zinc-800 flex items-center gap-2.5 backdrop-blur-md">
                        <span className={`h-2.5 w-2.5 rounded-full ${activeAgreement.status === 'approved' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-pulse'}`} />
                        Convenio {activeAgreement.status === 'approved' ? 'Activo' : 'Pendiente'}
                    </div>
                )}
            </div>

            {/* Content Switcher */}
            {!activeAgreement ? (
                /* Elegant Empty State Card */
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-[3rem] p-12 shadow-2xl text-center overflow-hidden max-w-2xl mx-auto ring-1 ring-white/5 shadow-[0_0_50px_rgba(99,102,241,0.02)]"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none animate-pulse-soft" />
                    
                    <div className="h-20 w-20 bg-zinc-950 border border-white/5 rounded-[2rem] flex items-center justify-center text-zinc-400 mx-auto mb-6 shadow-inner ring-1 ring-white/5">
                        <ClipboardList size={36} className="text-indigo-400" />
                    </div>

                    <h2 className="text-2xl font-black text-white tracking-tight">No tienes convenios activos actualmente</h2>
                    <p className="text-zinc-400 font-medium text-sm mt-2 max-w-md mx-auto leading-relaxed">
                        Si tienes adeudos o cuotas de mantenimiento acumuladas, puedes proponer un plan de financiamiento flexible para regularizar tu situación.
                    </p>

                    <button 
                        onClick={() => setIsRequestModalOpen(true)}
                        className="mt-8 px-8 h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.35)] transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                    >
                        <Plus size={16} /> Solicitar convenio
                    </button>
                </motion.div>
            ) : (
                /* Main Dashboard View */
                <div className="space-y-8">
                    
                    {/* 1. KPIs Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* KPI 1: Deuda Total */}
                        <div className="relative group bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-[2.2rem] p-6 overflow-hidden transition-all duration-500 hover:border-violet-500/40 hover:ring-1 hover:ring-violet-500/30 hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.15)] ring-1 ring-white/5 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-violet-400 group-hover:opacity-20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <DollarSign size={48} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.5)]" /> Deuda Total
                            </p>
                            <p className="text-3xl font-black text-white tracking-tight group-hover:text-violet-300 transition-colors duration-300">{formatCurrency(totalDebt)}</p>
                            <p className="text-[10px] text-zinc-550 mt-1.5 font-semibold transition-colors duration-300 group-hover:text-zinc-400">Total a financiar solicitado</p>
                        </div>

                        {/* KPI 2: Saldo Restante */}
                        <div className="relative group bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-[2.2rem] p-6 overflow-hidden transition-all duration-500 hover:border-amber-500/40 hover:ring-1 hover:ring-amber-500/30 hover:shadow-[0_20px_40px_-15px_rgba(245,158,11,0.15)] ring-1 ring-white/5 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-amber-500 group-hover:opacity-20 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                                <TrendingDown size={48} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-550 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> Saldo Restante
                            </p>
                            <p className="text-3xl font-black text-amber-500 tracking-tight group-hover:text-amber-400 transition-colors duration-300">{formatCurrency(remainingBalance)}</p>
                            <p className="text-[10px] text-zinc-550 mt-1.5 font-semibold transition-colors duration-300 group-hover:text-zinc-400">Monto restante por pagar</p>
                        </div>

                        {/* KPI 3: Total Pagado */}
                        <div className="relative group bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-[2.2rem] p-6 overflow-hidden transition-all duration-500 hover:border-emerald-500/40 hover:ring-1 hover:ring-emerald-500/30 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.15)] ring-1 ring-white/5 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-emerald-500 group-hover:opacity-20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <CheckCircle2 size={48} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" /> Total Pagado
                            </p>
                            <p className="text-3xl font-black text-emerald-400 tracking-tight group-hover:text-emerald-300 transition-colors duration-300">{formatCurrency(totalPaid)}</p>
                            <p className="text-[10px] text-zinc-550 mt-1.5 font-semibold transition-colors duration-300 group-hover:text-zinc-400">
                                {installments.length > 0 
                                    ? `${paidCount} de ${installments.length} cuotas cubiertas`
                                    : 'Aún sin cuotas pagadas'}
                            </p>
                        </div>

                        {/* KPI 4: Próximo Vencimiento */}
                        <div className="relative group bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-[2.2rem] p-6 overflow-hidden transition-all duration-500 hover:border-indigo-500/40 hover:ring-1 hover:ring-indigo-500/30 hover:shadow-[0_20px_40px_-15px_rgba(99,102,241,0.15)] ring-1 ring-white/5 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 p-4 opacity-[0.03] text-indigo-400 group-hover:opacity-20 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                                <Calendar size={48} />
                            </div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-450 animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.5)]" /> Próximo Vencimiento
                            </p>
                            <p className="text-lg font-black text-white tracking-tight truncate pt-1 group-hover:text-indigo-300 transition-colors duration-300">
                                {nextUnpaidInstallment 
                                    ? format(new Date(nextUnpaidInstallment.due_date), 'd MMM, yyyy', { locale: es }) 
                                    : activeAgreement.status === 'pending' ? 'Pendiente aprobación' : 'Sin pendientes 🎉'}
                            </p>
                            <p className="text-[10px] text-zinc-550 mt-2 font-semibold transition-colors duration-300 group-hover:text-zinc-400">
                                {nextUnpaidInstallment 
                                    ? `Cuota #${nextUnpaidInstallment.installment_number} por ${formatCurrency(nextUnpaidInstallment.amount)}` 
                                    : 'Todo al corriente'}
                            </p>
                        </div>
                    </div>

                    {/* Progress Indicator Card */}
                    <div className="relative group/progress bg-gradient-to-r from-zinc-900/40 to-black/20 border border-white/5 rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 backdrop-blur-xl shadow-2xl ring-1 ring-white/5 transition-all duration-500 hover:border-purple-500/40 hover:ring-1 hover:ring-purple-500/30 hover:shadow-[0_20px_50px_-15px_rgba(168,85,247,0.15)] hover:-translate-y-0.5">
                        <div className="space-y-2 flex-1">
                            <div className="flex justify-between items-center text-xs font-bold mb-1">
                                <span className="text-zinc-400 uppercase tracking-[0.1em] group-hover/progress:text-zinc-300 transition-colors">Progreso del Convenio</span>
                                <span className="text-indigo-400 font-black group-hover/progress:text-purple-400 transition-colors">{progressPercentage}% cubierto</span>
                            </div>
                            <div className="w-full bg-zinc-950/40 rounded-full h-3.5 border border-white/5 overflow-hidden relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercentage}%` }}
                                    transition={{ duration: 1.2, ease: 'easeInOut' }}
                                    className="bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 h-full rounded-full relative"
                                >
                                    <div className="absolute inset-0 bg-white/20 animate-shimmer bg-[length:200%_auto]" />
                                    {progressPercentage > 0 && (
                                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white shadow-[0_0_10px_#fff] animate-pulse" />
                                    )}
                                </motion.div>
                            </div>
                        </div>
                        <div className="text-left md:text-right shrink-0 bg-zinc-950/60 px-6 py-4 rounded-2xl border border-white/5 transition-all hover:border-purple-500/30 hover:bg-zinc-900/60 group/box">
                            <span className="text-[9px] text-zinc-550 font-extrabold uppercase tracking-widest block mb-0.5 group-hover/box:text-purple-400 transition-colors">Cuotas Cubiertas</span>
                            <span className="text-lg font-black text-white">{paidCount} <span className="text-zinc-500 font-medium text-sm">de</span> {installments.length} <span className="text-zinc-500 font-medium text-xs">cubiertas</span></span>
                        </div>
                    </div>

                    {/* Calendario de Pagos Table */}
                    <div className="space-y-5 w-full">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                                    <CreditCard size={18} className="text-indigo-450" />
                                    Calendario de Pagos
                                </h2>
                                <span className="text-xs text-zinc-400 font-bold bg-zinc-900/50 px-3.5 py-1 rounded-xl border border-white/5 shadow-md">
                                    {installments.length} cuotas
                                </span>
                            </div>

                            {loading ? (
                                <div className="py-20 flex flex-col items-center justify-center border border-white/5 rounded-[2rem] bg-zinc-900/10 space-y-3">
                                    <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                                    <p className="text-xs text-zinc-500">Cargando calendario de cuotas...</p>
                                </div>
                            ) : installments.length === 0 ? (
                                <div className="py-16 px-6 text-center border border-dashed border-white/10 rounded-[2rem] bg-zinc-900/10">
                                    <div className="h-12 w-12 bg-zinc-950 border border-white/5 rounded-xl flex items-center justify-center text-zinc-500 mx-auto mb-4">
                                        <Info size={22} className="text-indigo-400" />
                                    </div>
                                    <h3 className="text-zinc-400 font-bold text-sm">No hay cuotas generadas</h3>
                                    <p className="text-zinc-650 text-xs mt-1.5 max-w-sm mx-auto leading-relaxed">
                                        {activeAgreement.status === 'pending'
                                            ? 'Este convenio está pendiente de aprobación por parte de la administración. El calendario oficial de cuotas se generará automáticamente en cuanto la propuesta sea aprobada.'
                                            : 'No se encontraron cuotas para este convenio.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-zinc-900/10 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl ring-1 ring-white/5">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-white/5 bg-white/[0.02]">
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Cuota</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Vencimiento</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Monto</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Estado</th>
                                                    <th className="px-6 py-4 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-center">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-900/60">
                                                {installments.map((inst) => {
                                                    const statusStyle = getInstallmentStatusStyles(inst.status)
                                                    const isProcessing = actionLoadingId === inst.id

                                                    return (
                                                        <tr key={inst.id} className="hover:bg-zinc-900/35 transition-colors group/row">
                                                            <td className="px-6 py-4 font-bold text-xs text-white">
                                                                Cuota {inst.installment_number}
                                                            </td>
                                                            <td className="px-6 py-4 text-xs text-zinc-400 font-medium">
                                                                {format(new Date(inst.due_date), "d 'de' MMMM, yyyy", { locale: es })}
                                                            </td>
                                                            <td className="px-6 py-4 font-bold text-xs text-white">
                                                                {formatCurrency(inst.amount)}
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${statusStyle.bg}`}>
                                                                    {statusStyle.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {inst.status !== 'paid' ? (
                                                                        <>
                                                                            {/* Pagar button */}
                                                                            <button
                                                                                disabled={isProcessing}
                                                                                onClick={() => setPaymentModalInstallment(inst)}
                                                                                className="h-8 px-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                                                title="Registrar pago"
                                                                            >
                                                                                <FileCheck size={12} />
                                                                                <span>Pagar</span>
                                                                            </button>

                                                                            {/* Subir comprobante button */}
                                                                            <button
                                                                                disabled={isProcessing}
                                                                                onClick={() => setUploadModalInstallment(inst)}
                                                                                className="h-8 px-2.5 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                                                title="Subir comprobante de pago"
                                                                            >
                                                                                <Upload size={12} />
                                                                                <span>Subir comprobante</span>
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        /* View payment details */
                                                                        <button
                                                                            onClick={() => setReceiptModalInstallment(inst)}
                                                                            className="h-8 px-2.5 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer"
                                                                            title="Ver datos del pago registrado"
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

                    {/* History / Timeline Log - Moved to Bottom */}
                    <div className="space-y-5 w-full">
                        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
                            <History size={18} className="text-indigo-400" />
                            Historial del Convenio
                        </h2>

                        <div className="bg-zinc-900/10 border border-white/5 rounded-[2rem] p-5 relative overflow-hidden backdrop-blur-xl max-h-[500px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-zinc-950/20 [&::-webkit-scrollbar-thumb]:bg-zinc-800 [&::-webkit-scrollbar-thumb]:rounded-full shadow-inner ring-1 ring-white/5 shadow-[0_0_50px_rgba(99,102,241,0.01)]">
                            {timelineEvents.length === 0 ? (
                                <p className="text-xs text-zinc-500 text-center py-8">Sin eventos registrados aún.</p>
                            ) : (
                                <motion.div 
                                    variants={{
                                        hidden: { opacity: 0 },
                                        show: {
                                            opacity: 1,
                                            transition: {
                                                staggerChildren: 0.08
                                            }
                                        }
                                    }}
                                    initial="hidden"
                                    animate="show"
                                    className="relative pl-4 border-l border-white/5 space-y-6"
                                >
                                    {timelineEvents.map((evt, idx) => {
                                        const IconComponent = evt.icon
                                        return (
                                            <motion.div 
                                                key={evt.id || idx}
                                                variants={{
                                                    hidden: { opacity: 0, x: -10 },
                                                    show: { opacity: 1, x: 0 }
                                                }}
                                                className="relative group/item"
                                            >
                                                {/* Icon Dot */}
                                                <div className={`absolute -left-[25px] top-0 h-[18px] w-[18px] rounded-full border flex items-center justify-center shadow-md ${evt.color} transition-all duration-300 group-hover/item:scale-110`}>
                                                    <IconComponent size={10} />
                                                </div>

                                                {/* Details */}
                                                <div className="space-y-1 pl-1">
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block leading-none">
                                                        {format(new Date(evt.date), "d MMM, yyyy - h:mm a", { locale: es })}
                                                    </span>
                                                    <h4 className="text-xs font-black text-white leading-tight transition-colors group-hover/item:text-indigo-400">
                                                        {evt.title}
                                                    </h4>
                                                    <p className="text-[11px] text-zinc-400 leading-normal font-medium">
                                                        {evt.description}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Solicitar Convenio (para Empty State) */}
            <AnimatePresence>
                {isRequestModalOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 15 }}
                            className="bg-zinc-900 border border-zinc-800/80 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl p-6 md:p-8 space-y-6 relative"
                        >
                            <button 
                                onClick={() => setIsRequestModalOpen(false)}
                                className="absolute top-6 right-6 p-2 bg-zinc-950/40 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full border border-white/5 transition-colors cursor-pointer"
                            >
                                <X size={16} />
                            </button>

                            <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/50">
                                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/15 shadow-inner">
                                    <ClipboardList size={20} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-white uppercase tracking-wider">Solicitar Convenio de Pago</h3>
                                    <p className="text-[10px] text-zinc-500 font-semibold">Envía una propuesta de financiamiento a administración.</p>
                                </div>
                            </div>

                            <form onSubmit={handleCreateRequest} className="space-y-4 text-xs font-sans">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Deuda Total a Financiar (MXN)</label>
                                        <input
                                            type="number"
                                            required
                                            value={reqTotalDebt}
                                            onChange={(e) => setReqTotalDebt(e.target.value)}
                                            placeholder="$0.00"
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl px-3 py-3 text-xs text-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Cuotas Propuestas</label>
                                        <select
                                            value={reqInstallments}
                                            onChange={(e) => setReqInstallments(e.target.value)}
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-3 text-xs text-white outline-none transition-all cursor-pointer"
                                        >
                                            <option value="3">3 Meses (3 Cuotas)</option>
                                            <option value="6">6 Meses (6 Cuotas)</option>
                                            <option value="9">9 Meses (9 Cuotas)</option>
                                            <option value="12">12 Meses (12 Cuotas)</option>
                                            <option value="18">18 Meses (18 Cuotas)</option>
                                            <option value="24">24 Meses (24 Cuotas)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Detalles del Plan de Pagos (Opcional)</label>
                                    <textarea
                                        value={reqDetails}
                                        onChange={(e) => setReqDetails(e.target.value)}
                                        placeholder="Ej: Solicito realizar pagos mensuales de igual cantidad cada día 10 del mes a partir del siguiente periodo..."
                                        rows={3}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white resize-none outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Comentarios Adicionales (Opcional)</label>
                                    <textarea
                                        value={reqComments}
                                        onChange={(e) => setReqComments(e.target.value)}
                                        placeholder="Cualquier información adicional para la administración..."
                                        rows={2}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white resize-none outline-none transition-all"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsRequestModalOpen(false)}
                                        className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-450 hover:text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_15px_-2px_rgba(99,102,241,0.3)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                    >
                                        {submitting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <>
                                                <Send size={14} /> Enviar Propuesta
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Pagar Cuota (Registro Rápido) */}
            <AnimatePresence>
                {paymentModalInstallment && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-zinc-900 border border-zinc-800/80 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl p-6 space-y-5"
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

                            <div className="space-y-4 text-xs font-sans">
                                <div className="p-4 bg-zinc-950/60 border border-white/5 rounded-2xl flex justify-between items-center shadow-inner">
                                    <div>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Cuota a pagar</p>
                                        <p className="text-sm font-black text-white">Cuota #{paymentModalInstallment.installment_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Monto a pagar</p>
                                        <p className="text-lg font-black text-emerald-400">{formatCurrency(paymentModalInstallment.amount)}</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Método de Pago</label>
                                    <select
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all cursor-pointer"
                                    >
                                        <option value="Transferencia">Transferencia Bancaria</option>
                                        <option value="Efectivo">Efectivo</option>
                                        <option value="Tarjeta">Tarjeta de Crédito/Débito</option>
                                        <option value="Depósito">Depósito en Ventanilla</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Referencia de Pago</label>
                                    <input
                                        type="text"
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Ej: TXN-548903"
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Notas o comentarios</label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        placeholder="Cualquier aclaración sobre tu pago..."
                                        rows={2}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white resize-none outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setPaymentModalInstallment(null)}
                                    className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-450 hover:text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={actionLoadingId === paymentModalInstallment.id}
                                    onClick={() => handleRegisterPayment(paymentModalInstallment, false)}
                                    className="flex-1 h-10 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-[0_4px_15px_-2px_rgba(16,185,129,0.25)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {actionLoadingId === paymentModalInstallment.id ? (
                                        <Loader2 size={14} className="animate-spin" />
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

            {/* Modal: Subir Comprobante */}
            <AnimatePresence>
                {uploadModalInstallment && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-zinc-900 border border-zinc-800/80 w-full max-w-md rounded-[2.2rem] overflow-hidden shadow-2xl p-6 space-y-5"
                        >
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/40">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                    <Upload size={16} className="text-indigo-400" />
                                    Subir Comprobante
                                </h3>
                                <button 
                                    onClick={() => setUploadModalInstallment(null)}
                                    className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs font-sans">
                                <div className="p-3.5 bg-zinc-950/60 border border-white/5 rounded-2xl flex justify-between items-center shadow-inner">
                                    <div>
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Cuota a validar</p>
                                        <p className="text-xs font-black text-white">Cuota #{uploadModalInstallment.installment_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Monto</p>
                                        <p className="text-sm font-black text-indigo-400">{formatCurrency(uploadModalInstallment.amount)}</p>
                                    </div>
                                </div>

                                {/* Drag and drop upload */}
                                <div className="space-y-1">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Archivo de Comprobante</label>
                                    <div 
                                        onClick={handleContainerClick}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault()
                                            const file = e.dataTransfer.files?.[0]
                                            if (file) {
                                                setFileName(file.name)
                                                const reader = new FileReader()
                                                reader.onloadend = () => {
                                                    setFileBase64(reader.result as string)
                                                }
                                                reader.readAsDataURL(file)
                                            }
                                        }}
                                        className="mt-1 flex flex-col justify-center px-4 py-5 border-2 border-zinc-800 border-dashed rounded-2xl hover:border-indigo-500/50 transition-colors cursor-pointer relative bg-zinc-950/40 text-center"
                                    >
                                        <Upload className="mx-auto h-8 w-8 text-zinc-500 mb-2" />
                                        <div className="flex text-[11px] text-zinc-400 justify-center">
                                            <span className="font-semibold text-indigo-450 hover:text-indigo-450/90">Selecciona un archivo</span>
                                            <input 
                                                ref={fileInputRef}
                                                type="file" 
                                                className="sr-only" 
                                                accept="image/*,application/pdf" 
                                                onChange={handleFileChange} 
                                            />
                                            <p className="pl-1 text-zinc-500">o arrástralo aquí</p>
                                        </div>
                                        <p className="text-[9px] text-zinc-500 mt-1">PNG, JPG, PDF hasta 10MB</p>
                                        
                                        {fileName && (
                                            <p className="text-[10px] text-emerald-450 font-bold mt-3 flex items-center justify-center gap-1.5 bg-emerald-500/5 px-2 py-1.5 rounded-lg border border-emerald-500/15">
                                                <Check size={11} /> {fileName.slice(0, 30)}{fileName.length > 30 ? '...' : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Referencia / Folio</label>
                                    <input
                                        type="text"
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Ej: TXN-342019"
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl px-3 py-2.5 text-xs text-white outline-none transition-all"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Observaciones</label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                        placeholder="Detalles adicionales..."
                                        rows={2}
                                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white resize-none outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setUploadModalInstallment(null)}
                                    className="flex-1 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-450 hover:text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    disabled={actionLoadingId === uploadModalInstallment.id || !fileName}
                                    onClick={() => handleRegisterPayment(uploadModalInstallment, true)}
                                    className="flex-1 h-10 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all shadow-[0_4px_15px_-2px_rgba(99,102,241,0.25)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    {actionLoadingId === uploadModalInstallment.id ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} /> Enviar Comprobante
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal: Ver Datos del Pago Registrado */}
            <AnimatePresence>
                {receiptModalInstallment && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-zinc-900 border border-zinc-800/80 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl p-6 space-y-5"
                        >
                            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/40">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                                    <Receipt size={16} className="text-indigo-400" />
                                    Detalle del Pago
                                </h3>
                                <button 
                                    onClick={() => setReceiptModalInstallment(null)}
                                    className="p-1 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                                >
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4 text-xs font-sans">
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex justify-between items-center shadow-inner">
                                    <div>
                                        <p className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider">Cuota liquidada</p>
                                        <p className="text-sm font-black text-white">Cuota #{receiptModalInstallment.installment_number}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-emerald-500/70 font-bold uppercase tracking-wider">Monto pagado</p>
                                        <p className="text-lg font-black text-emerald-400">{formatCurrency(receiptModalInstallment.amount)}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Método de Pago</p>
                                        <p className="text-xs font-bold text-white">{receiptModalInstallment.payment_method || 'No especificado'}</p>
                                    </div>
                                    <div className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Fecha de Registro</p>
                                        <p className="text-xs font-bold text-white">
                                            {receiptModalInstallment.paid_at 
                                                ? format(new Date(receiptModalInstallment.paid_at), 'd MMM, yyyy', { locale: es })
                                                : 'No especificada'}
                                        </p>
                                    </div>
                                </div>

                                {receiptModalInstallment.payment_reference && (
                                    <div className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Referencia / Folio</p>
                                        <p className="text-xs font-mono font-bold text-white select-all">{receiptModalInstallment.payment_reference}</p>
                                    </div>
                                )}

                                {receiptModalInstallment.notes && (
                                    <div className="p-3 bg-zinc-950/50 border border-white/5 rounded-xl">
                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Notas / Observaciones</p>
                                        <p className="text-xs text-zinc-300 font-medium whitespace-pre-wrap leading-relaxed">{receiptModalInstallment.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={() => setReceiptModalInstallment(null)}
                                    className="w-full h-11 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
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
