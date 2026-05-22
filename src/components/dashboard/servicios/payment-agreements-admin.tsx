'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { 
    Clock, 
    CheckCircle2, 
    XCircle,
    User,
    Calendar,
    DollarSign,
    FileText,
    MessageSquare,
    Eye,
    X,
    ClipboardList,
    AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { getPaymentAgreementsAction, updatePaymentAgreementStatusAction } from '@/app/actions/payment-agreement-actions'
import { AgreementDetailsModal } from './agreement-details-modal'

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
}

export function PaymentAgreementsAdmin({ 
    admin,
    selectedCondoId,
    availableCondos = []
}: { 
    admin: any
    selectedCondoId?: string
    availableCondos?: any[]
}) {
    const supabase = createClient()
    const [agreements, setAgreements] = useState<PaymentAgreement[]>([])
    const [residentsMap, setResidentsMap] = useState<Record<string, string>>({}) // resident_id -> condominium_id
    const [loading, setLoading] = useState(true)
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
    const [selectedAgreement, setSelectedAgreement] = useState<PaymentAgreement | null>(null)
    const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
    const [isRejecting, setIsRejecting] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')

    const fetchAgreementsAndResidents = async () => {
        try {
            setLoading(true)
            
            // 1. Fetch all residents to map resident_id to condominium_id
            const { data: residentsData, error: residentsError } = await supabase
                .from('residents')
                .select('id, condominium_id')
            
            if (residentsError) {
                console.error('Error fetching residents for mapping:', residentsError)
            } else if (residentsData) {
                const map: Record<string, string> = {}
                residentsData.forEach(r => {
                    if (r.id && r.condominium_id) {
                        map[r.id] = r.condominium_id
                    }
                })
                setResidentsMap(map)
            }

            // 2. Fetch payment agreements via Server Action to bypass RLS
            const result = await getPaymentAgreementsAction()
            if (!result.success) {
                throw new Error(result.error)
            }
            
            setAgreements(result.data || [])
        } catch (error: any) {
            console.error('Error loading payment agreements:', error)
            toast.error(error.message || 'Error al cargar los convenios de pago')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAgreementsAndResidents()
    }, [admin?.organization_id])

    const handleUpdateStatus = async (id: string, newStatus: 'approved' | 'rejected') => {
        try {
            setActionLoadingId(id)
            const adminUserId = admin.user_id || admin.id
            
            const result = await updatePaymentAgreementStatusAction({
                id,
                status: newStatus,
                adminUserId
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success(`Convenio ${newStatus === 'approved' ? 'aprobado' : 'rechazado'} correctamente`)
            
            // Update local state
            setAgreements(prev => prev.map(ag => 
                ag.id === id 
                    ? { ...ag, status: newStatus, approved_by: adminUserId, approved_at: new Date().toISOString() } 
                    : ag
            ))

            // Update modal if it's open
            if (selectedAgreement && selectedAgreement.id === id) {
                setSelectedAgreement(prev => prev ? { ...prev, status: newStatus } : null)
            }
        } catch (error: any) {
            console.error('Error updating agreement status:', error)
            toast.error(error.message || 'No se pudo actualizar el estado del convenio')
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleApproveAgreement = async (id: string) => {
        try {
            setActionLoadingId(id)
            
            // 1. Send to n8n webhook via our API
            const res = await fetch('/api/payment-agreements/approved', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreement_id: id }),
            })
            const data = await res.json()
            if (!data.success) {
                throw new Error(data.error || 'Error al aprobar el convenio')
            }

            // 2. Update Supabase via server action
            await handleUpdateStatus(id, 'approved')

            // 3. Show warning toast if webhook failed
            if (data.webhook_sent === false) {
                toast.warning('Convenio aprobado en base de datos, pero la notificación por WhatsApp no se pudo enviar (Webhook n8n inactivo o fallido).')
            }
        } catch (error: any) {
            console.error('Error approving agreement:', error)
            toast.error(error.message || 'No se pudo aprobar el convenio')
        } finally {
            setActionLoadingId(null)
        }
    }

    const handleRejectAgreement = async (id: string, reason: string) => {
        try {
            setActionLoadingId(id)
            
            // 1. Send to n8n webhook via our API
            const res = await fetch('/api/payment-agreements/rejected', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agreement_id: id, reason }),
            })
            const data = await res.json()
            if (!data.success) {
                throw new Error(data.error || 'Error al rechazar el convenio')
            }

            // 2. Update Supabase via server action
            await handleUpdateStatus(id, 'rejected')

            // 3. Show warning toast if webhook failed
            if (data.webhook_sent === false) {
                toast.warning('Convenio rechazado en base de datos, pero la notificación por WhatsApp no se pudo enviar (Webhook n8n inactivo o fallido).')
            }

            // 4. Reset rejection UI state
            setIsRejecting(false)
            setRejectionReason('')
        } catch (error: any) {
            console.error('Error rejecting agreement:', error)
            toast.error(error.message || 'No se pudo rechazar el convenio')
        } finally {
            setActionLoadingId(null)
        }
    }

    // Filter by condo name/id
    const condoFilteredAgreements = agreements.filter(ag => {
        // Find resident's condo ID
        const residentCondoId = residentsMap[ag.resident_id]
        
        // If selectedCondoId is provided, filter by it
        if (selectedCondoId) {
            return residentCondoId === selectedCondoId
        }
        
        // Otherwise, make sure the resident belongs to one of the admin's organization's condos
        const allowedCondoIds = availableCondos.map(c => c.id)
        return allowedCondoIds.includes(residentCondoId)
    })

    // Filter by status tab
    const filteredAgreements = condoFilteredAgreements.filter(ag => {
        if (filterStatus === 'all') return true
        return ag.status === filterStatus
    })

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'pending':
                return {
                    bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
                    cardBg: 'bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-amber-950/15',
                    glowBg: 'from-amber-600/20 via-orange-500/10 to-amber-600/20',
                    border: 'border-zinc-800/40 group-hover:border-amber-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.2)]',
                    label: 'Pendiente',
                    icon: Clock
                }
            case 'approved':
                return {
                    bg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400',
                    cardBg: 'bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-emerald-950/15',
                    glowBg: 'from-emerald-600/25 via-teal-500/15 to-emerald-600/25',
                    border: 'border-emerald-500/20 group-hover:border-emerald-500/40 shadow-[0_4px_30px_rgba(16,185,129,0.02)]',
                    label: 'Aprobado',
                    icon: CheckCircle2
                }
            case 'rejected':
                return {
                    bg: 'bg-rose-500/15 border-rose-500/30 text-rose-400',
                    cardBg: 'bg-gradient-to-br from-zinc-950 via-zinc-900/90 to-rose-950/15',
                    glowBg: 'from-rose-600/20 via-pink-500/10 to-rose-600/20',
                    border: 'border-zinc-800/40 group-hover:border-rose-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.2)]',
                    label: 'Rechazado',
                    icon: XCircle
                }
            default:
                return {
                    bg: 'bg-zinc-800 border-zinc-700 text-zinc-500',
                    cardBg: 'bg-zinc-950',
                    glowBg: 'bg-zinc-800',
                    border: 'border-zinc-800',
                    label: 'Desconocido',
                    icon: AlertCircle
                }
        }
    }

    const formatCurrency = (amount: number | null) => {
        if (amount === null) return 'No especificado'
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount)
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-zinc-900/40 border border-zinc-800 rounded-3xl animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header & Status Counter */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-400">
                        <ClipboardList size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Convenios de Pago</h2>
                        <p className="text-xs text-zinc-500 font-medium">Solicitudes y propuestas de planes de pago de los residentes.</p>
                    </div>
                </div>

                {/* KPI Pill */}
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-widest bg-zinc-900/50 px-4 py-2 rounded-xl border border-zinc-800 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                    {condoFilteredAgreements.length} Convenios totales
                </div>
            </div>

            {/* Premium Inner Filter Bar */}
            <div className="flex justify-between items-center gap-4 bg-zinc-900/40 p-1 border border-zinc-800/50 rounded-2xl w-full sm:w-fit backdrop-blur-md">
                <div className="flex flex-wrap gap-1">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => {
                        const count = condoFilteredAgreements.filter(ag => status === 'all' || ag.status === status).length
                        let label = 'Todos'
                        let activeStyles = 'bg-zinc-800/80 text-white border border-zinc-700/50 shadow-lg'
                        let idleStyles = 'text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent'
                        
                        if (status === 'pending') label = 'Pendientes'
                        if (status === 'approved') label = 'Aprobados'
                        if (status === 'rejected') label = 'Rechazados'

                        return (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                                    filterStatus === status ? activeStyles : idleStyles
                                }`}
                            >
                                <span>{label}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                                    filterStatus === status 
                                        ? 'bg-zinc-950/60 text-violet-400' 
                                        : 'bg-zinc-900/40 text-zinc-500'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Main Content Grid */}
            {filteredAgreements.length === 0 ? (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-24 px-4 border-2 border-dashed border-zinc-800 rounded-[2.5rem] bg-zinc-900/10 text-center"
                >
                    <div className="h-16 w-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600 mb-5">
                        <ClipboardList size={32} />
                    </div>
                    <h3 className="text-zinc-400 font-bold text-lg">No hay convenios en esta sección</h3>
                    <p className="text-zinc-600 text-sm mt-1 max-w-sm">
                        {filterStatus === 'all' 
                            ? 'No se encontraron solicitudes de convenio registradas en esta propiedad.' 
                            : `No hay convenios en estado "${filterStatus === 'pending' ? 'Pendiente' : filterStatus === 'approved' ? 'Aprobado' : 'Rechazado'}" en este momento.`}
                    </p>
                </motion.div>            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredAgreements.map((agreement, idx) => {
                            const styles = getStatusStyles(agreement.status)
                            const StatusIcon = styles.icon
                            
                            return (
                                <motion.div
                                    layout
                                    key={agreement.id}
                                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.92, y: 15 }}
                                    transition={{ delay: idx * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                    whileHover={{ y: -6, transition: { duration: 0.25 } }}
                                    className="relative group h-full"
                                >
                                    {/* Glowing Hover Accent */}
                                    <div className={`absolute -inset-[2px] rounded-[2.4rem] opacity-0 group-hover:opacity-[0.35] blur-2xl transition duration-700 ${styles.glowBg}`} />
                                    
                                    <div className={`relative h-full flex flex-col rounded-[2.2rem] border backdrop-blur-3xl transition-all duration-350 overflow-hidden z-[1] ${styles.cardBg} ${styles.border}`}>
                                        
                                        {/* Dynamic glassmorphism highlight */}
                                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        
                                        <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                                            {/* Header */}
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-xl bg-zinc-900/60 border ${
                                                        agreement.status === 'approved' 
                                                            ? 'border-emerald-500/35 text-emerald-450' 
                                                            : agreement.status === 'rejected' 
                                                            ? 'border-rose-500/35 text-rose-455' 
                                                            : 'border-amber-500/35 text-amber-455'
                                                    } flex items-center justify-center shadow-inner`}>
                                                        <User size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Residente</p>
                                                        <h4 className="text-sm font-bold text-white truncate">{agreement.resident_name}</h4>
                                                    </div>
                                                </div>
 
                                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider border ${styles.bg}`}>
                                                    {styles.label}
                                                </span>
                                            </div>
 
                                            {/* Total Debt Box */}
                                            <div className="p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl relative overflow-hidden group/debt">
                                                {/* Subtle highlight */}
                                                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover/debt:opacity-100 transition-opacity duration-500" />
                                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1">
                                                    <DollarSign size={11} className="text-violet-400" /> Deuda a Financiar
                                                </p>
                                                <p className={`text-2xl font-black tracking-tight bg-gradient-to-r from-white ${
                                                    agreement.status === 'approved' 
                                                        ? 'to-emerald-300' 
                                                        : agreement.status === 'rejected' 
                                                        ? 'to-rose-300' 
                                                        : 'to-amber-300'
                                                } bg-clip-text text-transparent`}>
                                                    {formatCurrency(agreement.total_debt)}
                                                </p>
                                            </div>
 
                                            {/* Details Snip */}
                                            <div className="space-y-2">
                                                <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                    <FileText size={11} className="text-violet-400" /> Plan Propuesto
                                                </p>
                                                <div className="relative pl-3.5 py-3 pr-3 bg-zinc-900/30 rounded-xl border border-zinc-800/40">
                                                    <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r ${
                                                        agreement.status === 'approved' 
                                                            ? 'bg-emerald-500' 
                                                            : agreement.status === 'rejected' 
                                                            ? 'bg-rose-500' 
                                                            : 'bg-amber-500'
                                                    }`} />
                                                    <p className="text-xs text-zinc-400 leading-relaxed font-medium line-clamp-3">
                                                        {agreement.agreement_details || 'Sin detalles propuestos.'}
                                                    </p>
                                                </div>
                                            </div>
 
                                            {/* Date */}
                                            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-widest pt-2 border-t border-zinc-900">
                                                <span className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-zinc-500" />
                                                    {format(new Date(agreement.created_at), 'd MMM, yyyy', { locale: es })}
                                                </span>
                                            </div>
                                        </div>
 
                                        {/* Card Footer Actions */}
                                        <div className="px-6 pb-6 pt-2 flex gap-3 relative z-10">
                                            {agreement.status === 'pending' ? (
                                                <>
                                                    <button
                                                        disabled={actionLoadingId === agreement.id}
                                                        onClick={() => handleApproveAgreement(agreement.id)}
                                                        className="flex-1 h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all shadow-[0_4px_20px_-2px_rgba(16,185,129,0.25)] active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                                    >
                                                        <CheckCircle2 size={14} /> Aprobar
                                                    </button>
                                                    <button
                                                        disabled={actionLoadingId === agreement.id}
                                                        onClick={() => { setSelectedAgreement(agreement); setIsRejecting(true) }}
                                                        className="flex-1 h-11 bg-zinc-900/80 hover:bg-rose-500/10 hover:text-rose-450 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-wider border border-zinc-800 hover:border-rose-500/35 transition-all active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                                    >
                                                        <XCircle size={14} /> Rechazar
                                                    </button>
                                                </>
                                            ) : (
                                                <div className={`flex-1 p-3 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider ${
                                                    agreement.status === 'approved' 
                                                        ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' 
                                                        : 'bg-rose-500/5 border-rose-500/15 text-rose-400'
                                                }`}>
                                                    <StatusIcon size={14} className={agreement.status === 'approved' ? 'text-emerald-400' : 'text-rose-400'} />
                                                    Convenio {agreement.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                                                </div>
                                            )}
 
                                            <button
                                                onClick={() => setSelectedAgreement(agreement)}
                                                className="w-11 h-11 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all active:scale-95 flex items-center justify-center shadow-md cursor-pointer"
                                                title="Ver detalles completos"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}            {/* Premium Details Modal */}
            <AnimatePresence>
                {selectedAgreement && (
                    <AgreementDetailsModal
                        isOpen={!!selectedAgreement}
                        onClose={() => { setSelectedAgreement(null); setIsRejecting(false); setRejectionReason('') }}
                        agreement={selectedAgreement}
                        admin={admin}
                        onApprove={handleApproveAgreement}
                        onReject={handleRejectAgreement}
                        actionLoadingId={actionLoadingId}
                        initialIsRejecting={isRejecting}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
