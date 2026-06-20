'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Gift, 
    Users, 
    CheckCircle, 
    Clock, 
    XCircle, 
    Search, 
    DollarSign, 
    Check, 
    X, 
    Ban, 
    CreditCard, 
    AlertCircle, 
    Coins 
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { 
    ownerApproveRewardAction, 
    ownerMarkRewardPaidAction, 
    ownerCancelRewardAction 
} from '@/app/actions/benefit-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface ReferrerOrg {
    id: string
    name: string
}

interface ReferralInfo {
    id: string
    referred_name: string
    referred_email: string
    referred_phone?: string | null
    status: string
    referred_registered_at: string
    plan_activated_at?: string | null
}

interface RewardPayment {
    id: string
    organization_id: string
    referral_id: string
    referrer_organization_id: string
    amount: number
    status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'failed'
    payment_method?: string | null
    payment_reference?: string | null
    notes?: string | null
    created_at: string
    paid_at?: string | null
    referrer: ReferrerOrg
    referral: ReferralInfo
}

interface ReferidosClientProps {
    initialPayments: RewardPayment[]
}

export function ReferidosClient({ initialPayments }: ReferidosClientProps) {
    const [payments, setPayments] = useState<RewardPayment[]>(initialPayments)
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')

    // Modal states for marking as paid
    const [selectedPaymentForPay, setSelectedPaymentForPay] = useState<RewardPayment | null>(null)
    const [payMethod, setPayMethod] = useState('Transferencia')
    const [payReference, setPayReference] = useState('')
    const [payNotes, setPayNotes] = useState('')
    const [isPaying, setIsPaying] = useState(false)

    // Modal states for cancelling
    const [selectedPaymentForCancel, setSelectedPaymentForCancel] = useState<RewardPayment | null>(null)
    const [cancelNotes, setCancelNotes] = useState('')
    const [isCancelling, setIsCancelling] = useState(false)

    // Approval handler
    const handleApprove = async (paymentId: string) => {
        try {
            const res = await ownerApproveRewardAction(paymentId)
            if (!res.success) throw new Error(res.error)

            toast.success('¡Recompensa aprobada correctamente!')
            setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'approved' } : p))
        } catch (err: any) {
            toast.error('Error al aprobar: ' + err.message)
        }
    }

    // Pay handler
    const handleMarkPaid = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPaymentForPay) return

        try {
            setIsPaying(true)
            const res = await ownerMarkRewardPaidAction(
                selectedPaymentForPay.id,
                payMethod,
                payReference,
                payNotes
            )

            if (!res.success) throw new Error(res.error)

            toast.success('¡Recompensa marcada como pagada!')
            setPayments(prev => prev.map(p => p.id === selectedPaymentForPay.id ? { 
                ...p, 
                status: 'paid',
                paid_at: new Date().toISOString(),
                payment_method: payMethod,
                payment_reference: payReference,
                notes: payNotes
            } : p))

            // Reset modal states
            setSelectedPaymentForPay(null)
            setPayReference('')
            setPayNotes('')
        } catch (err: any) {
            toast.error('Error al guardar pago: ' + err.message)
        } finally {
            setIsPaying(false)
        }
    }

    // Cancel handler
    const handleCancel = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPaymentForCancel || !cancelNotes) {
            toast.error('Debes proporcionar un motivo de cancelación')
            return
        }

        try {
            setIsCancelling(true)
            const res = await ownerCancelRewardAction(selectedPaymentForCancel.id, cancelNotes)
            if (!res.success) throw new Error(res.error)

            toast.success('¡Recompensa cancelada correctamente!')
            setPayments(prev => prev.map(p => p.id === selectedPaymentForCancel.id ? { 
                ...p, 
                status: 'cancelled',
                notes: cancelNotes
            } : p))

            setSelectedPaymentForCancel(null)
            setCancelNotes('')
        } catch (err: any) {
            toast.error('Error al cancelar: ' + err.message)
        } finally {
            setIsCancelling(false)
        }
    }

    // Filtering logic
    const filteredPayments = payments.filter(p => {
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter
        
        const search = searchQuery.toLowerCase().trim()
        const matchesSearch = !search || 
            (p.referrer?.name || '').toLowerCase().includes(search) ||
            (p.referral?.referred_name || '').toLowerCase().includes(search) ||
            (p.referral?.referred_email || '').toLowerCase().includes(search)

        return matchesStatus && matchesSearch
    })

    // KPI computations
    const totalCount = payments.length
    const pendingCount = payments.filter(p => p.status === 'pending').length
    const approvedCount = payments.filter(p => p.status === 'approved').length
    const paidSum = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0)
    const cancelledCount = payments.filter(p => p.status === 'cancelled').length

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <Badge className="bg-amber-500/10 text-amber-405 border-amber-500/20">Pendiente Aprob.</Badge>
            case 'approved':
                return <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">Aprobado (Por Pagar)</Badge>
            case 'paid':
                return <Badge className="bg-emerald-500/10 text-emerald-450 border-emerald-500/20">Pagado</Badge>
            case 'cancelled':
                return <Badge className="bg-rose-500/10 text-rose-450 border-rose-500/20">Cancelado</Badge>
            default:
                return <Badge className="bg-zinc-800 text-zinc-500">Desconocido</Badge>
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-zinc-400 to-zinc-500 bg-clip-text text-transparent">
                    🎁 Platform Referrals & Rewards
                </h1>
                <p className="text-zinc-500 text-sm md:text-base font-medium">
                    Gestiona las invitaciones de administradores, valida la contratación de planes y realiza el pago de recompensas.
                </p>
            </div>

            {/* KPI counters */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-5 bg-zinc-900/35 border border-zinc-800 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-zinc-450 font-bold uppercase tracking-wider">Recompensas Totales</p>
                    <p className="text-3xl font-black text-white mt-2">{totalCount}</p>
                </div>
                <div className="p-5 bg-zinc-900/35 border border-zinc-850 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Pendientes de Aprob.</p>
                    <p className="text-3xl font-black text-white mt-2">{pendingCount}</p>
                </div>
                <div className="p-5 bg-zinc-900/35 border border-zinc-850 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Aprobadas por Pagar</p>
                    <p className="text-3xl font-black text-white mt-2">{approvedCount}</p>
                </div>
                <div className="p-5 bg-zinc-900/35 border border-zinc-850 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-emerald-450 font-bold uppercase tracking-wider">Monto Total Pagado</p>
                    <p className="text-3xl font-black text-emerald-450 mt-2">${paidSum.toLocaleString('es-MX')} MXN</p>
                </div>
                <div className="p-5 bg-zinc-900/35 border border-zinc-850 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-rose-450 font-bold uppercase tracking-wider">Cancelados / Rechazos</p>
                    <p className="text-3xl font-black text-rose-450 mt-2">{cancelledCount}</p>
                </div>
            </div>

            {/* Filters bar */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl backdrop-blur-md">
                {/* Search */}
                <div className="relative w-full md:w-96 group/input">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-550 group-focus-within/input:text-indigo-400 transition-colors" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por administrador o referido..."
                        className="w-full rounded-xl border border-zinc-800 bg-black/40 py-2 pl-9 pr-3 text-xs text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:bg-indigo-950/10 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                    {[
                        { id: 'all', label: 'Todos' },
                        { id: 'pending', label: 'Pendientes' },
                        { id: 'approved', label: 'Aprobados' },
                        { id: 'paid', label: 'Pagados' },
                        { id: 'cancelled', label: 'Cancelados' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                                statusFilter === tab.id
                                    ? 'bg-zinc-800 text-white border-zinc-700 shadow-md'
                                    : 'text-zinc-500 hover:text-zinc-350 border-transparent hover:bg-zinc-900/45'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rewards Table */}
            <div className="bg-zinc-900/20 border border-zinc-800 rounded-[2.2rem] overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                <th className="p-4">Administrador A (Referente)</th>
                                <th className="p-4">Administrador B (Referido)</th>
                                <th className="p-4">Estado</th>
                                <th className="p-4">Fecha Activación</th>
                                <th className="p-4">Recompensa</th>
                                <th className="p-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 text-xs">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-zinc-500 font-bold">
                                        No se encontraron comisiones o recompensas registradas.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((pmt) => {
                                    return (
                                        <tr key={pmt.id} className="hover:bg-zinc-900/10 transition-colors">
                                            {/* Referente details */}
                                            <td className="p-4">
                                                <p className="font-bold text-white">{pmt.referrer?.name || 'Administrador InmobiGo'}</p>
                                                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Org: {pmt.organization_id.substring(0, 8)}...</p>
                                            </td>

                                            {/* Referido details */}
                                            <td className="p-4">
                                                <p className="font-bold text-white">{pmt.referral?.referred_name || 'Desconocido'}</p>
                                                <p className="text-[10px] text-zinc-500">{pmt.referral?.referred_email}</p>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    {getStatusBadge(pmt.status)}
                                                    {pmt.status === 'paid' && pmt.payment_method && (
                                                        <span className="text-[9px] text-zinc-500">
                                                            {pmt.payment_method} • Ref: {pmt.payment_reference || 'S/R'}
                                                        </span>
                                                    )}
                                                    {pmt.status === 'cancelled' && pmt.notes && (
                                                        <span className="text-[9px] text-rose-450 leading-snug max-w-[200px] truncate" title={pmt.notes}>
                                                            Motivo: {pmt.notes}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="p-4 text-zinc-450 font-medium">
                                                {pmt.referral?.plan_activated_at ? (
                                                    format(new Date(pmt.referral.plan_activated_at), 'd MMM, yyyy HH:mm', { locale: es })
                                                ) : (
                                                    <span className="text-zinc-650">—</span>
                                                )}
                                            </td>

                                            {/* Reward Amount */}
                                            <td className="p-4 font-bold text-emerald-450">
                                                ${Number(pmt.amount).toLocaleString('es-MX')} MXN
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {pmt.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleApprove(pmt.id)}
                                                                className="h-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                                                            >
                                                                <Check size={12} /> Aprobar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setSelectedPaymentForCancel(pmt)}
                                                                className="h-8 bg-rose-500/10 hover:bg-rose-500/25 border-rose-500/20 text-rose-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                                                            >
                                                                <Ban size={12} /> Rechazar
                                                            </Button>
                                                        </>
                                                    )}

                                                    {pmt.status === 'approved' && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => setSelectedPaymentForPay(pmt)}
                                                                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                                                            >
                                                                <CreditCard size={12} /> Registrar Pago
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setSelectedPaymentForCancel(pmt)}
                                                                className="h-8 bg-rose-500/10 hover:bg-rose-500/25 border-rose-500/20 text-rose-400 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                                                            >
                                                                <Ban size={12} /> Cancelar
                                                            </Button>
                                                        </>
                                                    )}

                                                    {pmt.status === 'paid' && (
                                                        <span className="text-[10px] text-emerald-450 font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                                                            <CheckCircle size={12} /> Completado
                                                        </span>
                                                    )}

                                                    {pmt.status === 'cancelled' && (
                                                        <span className="text-[10px] text-rose-450 font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                                                            <XCircle size={12} /> Cancelado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL: Registrar Pago */}
            <AnimatePresence>
                {selectedPaymentForPay && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPaymentForPay(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="relative bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-md p-6 z-10 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <CreditCard size={18} className="text-emerald-400" /> Registrar Pago de Comisión
                                </h3>
                                <button 
                                    onClick={() => setSelectedPaymentForPay(null)}
                                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-zinc-750 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <form onSubmit={handleMarkPaid} className="space-y-4">
                                <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-2 text-xs">
                                    <p className="text-zinc-500 font-medium">Beneficiario:</p>
                                    <p className="text-sm font-bold text-white">{selectedPaymentForPay.referrer?.name || 'Administrador InmobiGo'}</p>
                                    <p className="text-zinc-500 font-medium mt-2">Monto de la Recompensa:</p>
                                    <p className="text-sm font-black text-emerald-450">${Number(selectedPaymentForPay.amount).toLocaleString('es-MX')} MXN</p>
                                </div>

                                {/* Método de Pago */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-400">Método de Pago</label>
                                    <select
                                        value={payMethod}
                                        onChange={(e) => setPayMethod(e.target.value)}
                                        className="w-full rounded-xl border border-zinc-800 bg-black/40 py-2.5 px-3 text-xs text-white focus:border-indigo-500/50 focus:outline-none transition-all"
                                    >
                                        <option value="Transferencia">Transferencia SPEI</option>
                                        <option value="MercadoPago">MercadoPago</option>
                                        <option value="PayPal">PayPal</option>
                                        <option value="Efectivo / Otro">Efectivo / Otro</option>
                                    </select>
                                </div>

                                {/* Referencia de Pago */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-400">Referencia / ID de Transacción</label>
                                    <input
                                        type="text"
                                        required
                                        value={payReference}
                                        onChange={(e) => setPayReference(e.target.value)}
                                        placeholder="Ej. SPEI108392182 o ID de MP"
                                        className="w-full rounded-xl border border-zinc-800 bg-black/40 py-2.5 px-3 text-xs text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none transition-all"
                                    />
                                </div>

                                {/* Notas adicionales */}
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-400">Notas Internas (Opcional)</label>
                                    <textarea
                                        value={payNotes}
                                        onChange={(e) => setPayNotes(e.target.value)}
                                        placeholder="Detalles adicionales del abono..."
                                        rows={3}
                                        className="w-full rounded-xl border border-zinc-800 bg-black/40 py-2.5 px-3 text-xs text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSelectedPaymentForPay(null)}
                                        className="flex-1 h-10 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isPaying}
                                        className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                                    >
                                        {isPaying ? 'Guardando...' : 'Confirmar Pago'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MODAL: Cancelar / Rechazar */}
            <AnimatePresence>
                {selectedPaymentForCancel && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedPaymentForCancel(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="relative bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-md p-6 z-10 shadow-2xl space-y-6"
                        >
                            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <AlertCircle size={18} className="text-rose-500" /> Cancelar / Rechazar Recompensa
                                </h3>
                                <button 
                                    onClick={() => setSelectedPaymentForCancel(null)}
                                    className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-zinc-750 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            <form onSubmit={handleCancel} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-400">Motivo del Rechazo / Cancelación (Obligatorio)</label>
                                    <textarea
                                        required
                                        value={cancelNotes}
                                        onChange={(e) => setCancelNotes(e.target.value)}
                                        placeholder="Ej. Registro duplicado, plan cancelado antes de tiempo o abuso del programa de referidos."
                                        rows={4}
                                        className="w-full rounded-xl border border-zinc-800 bg-black/40 py-2.5 px-3 text-xs text-white placeholder-zinc-600 focus:border-indigo-500/50 focus:outline-none transition-all resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSelectedPaymentForCancel(null)}
                                        className="flex-1 h-10 border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:text-white rounded-xl text-xs font-bold uppercase tracking-wider"
                                    >
                                        Volver
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isCancelling || !cancelNotes}
                                        className="flex-1 h-10 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                                    >
                                        {isCancelling ? 'Cancelando...' : 'Rechazar Bono'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
