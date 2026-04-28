'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Wrench, 
    Plus, 
    CheckCircle2, 
    Clock, 
    Download, 
    Bell,
    ChevronRight,
    MessageSquare,
    AlertCircle,
    Loader2,
    Eye,
    Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Ticket } from '@/types/tickets'
import { maintenanceService } from '@/services/maintenance-service'
import { CreateTicketModal } from '@/components/maintenance/CreateTicketModal'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/utils/supabase/client'

interface ResidentMaintenanceClientProps {
    resident: any
}

import { getTicketsByResidentServer, deleteMaintenanceTicketServer } from '@/app/actions/maintenance-actions'

export default function ResidentMaintenanceClient({ resident }: ResidentMaintenanceClientProps) {
    const [loading, setLoading] = useState(true)
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    
    const [ticketToDelete, setTicketToDelete] = useState<string | null>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    useEffect(() => {
        if (resident?.id) {
            fetchTickets()

            // Setup Realtime Subscription
            const supabase = createClient()
            const channel = supabase
                .channel(`realtime_inquilino_tickets_${resident.id}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'tickets',
                        filter: `resident_id=eq.${resident.id}`
                    },
                    (payload) => {
                        console.log('[Realtime] postgres change detected:', payload)
                        if (payload.eventType === 'UPDATE') {
                            setTickets((prev) =>
                                prev.map((t) => (t.id === payload.new.id ? { ...t, ...payload.new } : t))
                            )
                        } else if (payload.eventType === 'DELETE') {
                            setTickets((prev) => prev.filter((t) => t.id === payload.old.id))
                        } else if (payload.eventType === 'INSERT') {
                            fetchTickets()
                        }
                    }
                )
                .subscribe()

            // Setup Polling Fallback (every 10 seconds)
            const pollInterval = setInterval(() => {
                console.log('[ResidentMaintenanceClient] Polling for updates...')
                fetchTicketsSilently()
            }, 10000)

            return () => {
                supabase.removeChannel(channel)
                clearInterval(pollInterval)
            }
        }
    }, [resident?.id])

    const fetchTicketsSilently = async () => {
        try {
            const response = await getTicketsByResidentServer(resident.id)
            if (response.success && response.tickets) {
                setTickets(response.tickets)
            }
        } catch (error) {
            console.error('Error silent polling:', error)
        }
    }

    const fetchTickets = async () => {
        try {
            setLoading(true)
            console.log('[ResidentMaintenanceClient] Fetching tickets for resident:', resident.id)
            const response = await getTicketsByResidentServer(resident.id)
            if (response.success && response.tickets) {
                setTickets(response.tickets)
            } else {
                console.error('Error fetching tickets from server:', response.error)
            }
        } catch (error) {
            console.error('Error fetching tickets:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        try {
            setDeletingId(id)
            const res = await deleteMaintenanceTicketServer(id)
            if (res.success) {
                setTickets(prev => prev.filter(t => t.id !== id))
                setTicketToDelete(null)
            } else {
                alert('No se pudo eliminar el reporte.')
            }
        } catch (err) {
            console.error(err)
        } finally {
            setDeletingId(null)
        }
    }

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'open': return { label: 'Pendiente', color: 'rose' }
            case 'in_progress': return { label: 'En proceso', color: 'amber' }
            case 'resolved': return { label: 'Resuelto', color: 'emerald' }
            default: return { label: status, color: 'zinc' }
        }
    }

    const getPriorityInfo = (priority: string) => {
        switch (priority) {
            case 'critical': return { label: 'Crítica', color: 'rose' }
            case 'high': return { label: 'Alta', color: 'amber' }
            case 'medium': return { label: 'Media', color: 'indigo' }
            default: return { label: 'Baja', color: 'zinc' }
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="space-y-2">
                <h1 className="text-4xl font-black text-white tracking-tight">Mantenimiento</h1>
                <p className="text-zinc-400 text-lg">Reporta problemas y da seguimiento a tus solicitudes.</p>
            </div>

            {/* Hero Card: New Report */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-[#1a1c2e] to-indigo-950/40 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl group"
            >
                <div className="absolute top-0 right-0 -m-20 h-80 w-80 bg-indigo-600/10 rounded-full blur-[100px] group-hover:bg-indigo-600/20 transition-colors duration-700" />
                
                <div className="flex flex-col lg:flex-row items-center gap-12 relative z-10">
                    <div className="flex-1 space-y-8 w-full">
                        <div className="space-y-4">
                            <h2 className="text-3xl font-black text-white tracking-tight">Mis reportes</h2>
                        </div>

                        <div className="space-y-6">
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button 
                                    onClick={() => setIsCreateOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-500 text-white h-24 px-16 rounded-[2.5rem] text-3xl font-black shadow-2xl shadow-blue-600/30 transition-all flex items-center gap-6 w-full sm:w-auto relative overflow-hidden group/btn"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] transition-transform" />
                                    <Plus className="h-10 w-10" />
                                    Reportar problema
                                </Button>
                            </motion.div>
                            
                            <div className="flex items-center gap-2 text-zinc-500 text-sm font-medium">
                                <div className="h-5 w-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <MessageSquare className="h-3 w-3 text-blue-400" />
                                </div>
                                Seguimiento continuo a tus reportes
                            </div>
                        </div>
                    </div>

                    {/* Illustration Representation */}
                    <div className="relative flex-1 hidden lg:flex justify-center items-center">
                        <div className="relative z-10 scale-110">
                            <div className="relative h-64 w-80">
                                <motion.div 
                                    animate={{ rotate: [12, 15, 12] }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute top-0 right-0 h-48 w-36 bg-zinc-800 rounded-3xl border border-zinc-700 shadow-2xl p-4 transform rotate-12"
                                >
                                    <div className="h-full w-full bg-zinc-900 rounded-2xl p-4 flex flex-col gap-3">
                                        <div className="h-2 w-full bg-zinc-800 rounded-full" />
                                        <div className="h-2 w-3/4 bg-zinc-800 rounded-full" />
                                        <div className="flex-1 flex items-center justify-center">
                                            <CheckCircle2 className="h-12 w-12 text-emerald-400/50" />
                                        </div>
                                    </div>
                                </motion.div>
                                <motion.div 
                                    animate={{ y: [0, -10, 0], rotate: [-6, -4, -6] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute bottom-4 left-0 h-24 w-24 bg-indigo-600/20 backdrop-blur-xl rounded-2xl border border-indigo-500/30 flex items-center justify-center shadow-2xl transform -rotate-6"
                                >
                                    <Wrench className="h-10 w-10 text-indigo-400" />
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Reports History */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Clock className="h-6 w-6 text-indigo-400" />
                        Historial de reportes
                    </h2>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-[2.5rem] overflow-hidden shadow-2xl min-h-[400px]"
                >
                    {loading ? (
                        <div className="flex h-[400px] items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-indigo-500" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-[400px] text-zinc-500 space-y-4">
                            <AlertCircle className="h-16 w-16 opacity-20" />
                            <p className="text-xl font-medium">No tienes reportes activos.</p>
                            <Button variant="ghost" className="text-indigo-400" onClick={() => setIsCreateOpen(true)}>
                                Crear tu primer reporte
                            </Button>
                        </div>
                    ) : (
                        <div className="w-full">
                            <div className="grid grid-cols-6 border-b border-zinc-800/50 bg-zinc-900/50 px-8 py-6">
                                <div className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center text-center">Categoría</div>
                                <div className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center text-center">Reporte</div>
                                <div className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center text-center">Prioridad</div>
                                <div className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center text-center">Fecha</div>
                                <div className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center text-center">Estatus</div>
                                <div className="text-zinc-500 font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center text-center">Acciones</div>
                            </div>
                            
                            <div className="divide-y divide-zinc-800/30">
                                {tickets.map((ticket, i) => {
                                    const statusInfo = getStatusInfo(ticket.status)
                                    const priorityInfo = getPriorityInfo(ticket.priority)
                                    const categoryLabel = ticket.description?.match(/\[Categoría: (.*?)\]/)?.[1] || 'Mantenimiento'
                                    
                                    return (
                                        <motion.div 
                                            key={ticket.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.1 * i }}
                                            className="grid grid-cols-6 px-8 py-8 group hover:bg-indigo-500/[0.03] transition-all items-center cursor-default"
                                        >
                                            <div className="flex items-center justify-center text-center">
                                                <Badge className="bg-zinc-800/50 border-zinc-700/50 text-zinc-300 font-bold px-3 py-1 rounded-lg">
                                                    {categoryLabel}
                                                </Badge>
                                            </div>
                                            <div className="text-base font-black text-white group-hover:text-indigo-400 transition-colors flex items-center justify-center text-center truncate px-2">
                                                {ticket.title}
                                            </div>
                                            <div className="flex items-center justify-center text-center">
                                                <Badge className={cn(
                                                    "px-3 py-1 rounded-xl font-bold text-xs border shadow-sm",
                                                    priorityInfo.color === 'rose' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                                    priorityInfo.color === 'amber' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                                    priorityInfo.color === 'indigo' ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" :
                                                    "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                                )}>
                                                    {priorityInfo.label}
                                                </Badge>
                                            </div>
                                            <div className="text-zinc-400 font-medium text-sm flex items-center justify-center text-center">
                                                {format(parseISO(ticket.created_at), 'd MMM yyyy', { locale: es })}
                                            </div>
                                            <div className="flex items-center justify-center text-center">
                                                <Badge className={cn(
                                                    "px-3 py-1 rounded-xl font-bold text-xs border shadow-sm",
                                                    statusInfo.color === 'rose' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                                    statusInfo.color === 'amber' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : 
                                                    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                )}>
                                                    {statusInfo.label}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-center gap-3">
                                                {ticket.images && ticket.images.length > 0 && (
                                                    <motion.a 
                                                        href={ticket.images[0]} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        whileHover={{ scale: 1.12, backgroundColor: 'rgba(99, 102, 241, 0.2)' }}
                                                        whileTap={{ scale: 0.95 }}
                                                        className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 hover:text-indigo-300 hover:shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all duration-300"
                                                        title="Ver imagen"
                                                    >
                                                        <Eye className="h-4.5 w-4.5" />
                                                    </motion.a>
                                                )}
                                                <motion.button
                                                    onClick={() => setTicketToDelete(ticket.id)}
                                                    whileHover={{ scale: 1.12, backgroundColor: 'rgba(244, 63, 94, 0.2)' }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className="h-9 w-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 hover:text-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.2)] transition-all duration-300"
                                                    title="Eliminar reporte"
                                                >
                                                    <Trash2 className="h-4.5 w-4.5" />
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* SaaS Delete Modal */}
            <AnimatePresence>
                {ticketToDelete && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6"
                        >
                            <div className="flex items-center gap-4 text-rose-500">
                                <div className="h-12 w-12 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">¿Eliminar reporte?</h3>
                                    <p className="text-sm text-zinc-400">Esta acción no se puede deshacer.</p>
                                </div>
                            </div>
                            <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-xl p-4 text-xs text-zinc-400">
                                Estás a punto de borrar el reporte de mantenimiento. El administrador ya no podrá verlo.
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button 
                                    variant="ghost" 
                                    className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                                    onClick={() => setTicketToDelete(null)}
                                    disabled={!!deletingId}
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold"
                                    onClick={() => handleDelete(ticketToDelete)}
                                    disabled={!!deletingId}
                                >
                                    {deletingId ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
                                </Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Bottom Tracker Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileHover={{ y: -5, borderColor: 'rgba(79, 70, 229, 0.3)' }}
                className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl transition-all duration-300 group"
            >
                <div className="flex-1 w-full space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-zinc-400 text-base">Atención personalizada</span>
                        <span className="text-indigo-400">Canal directo con el administrador</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden shadow-inner p-1">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
                            className="h-full bg-gradient-to-r from-emerald-600 via-indigo-500 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                        />
                    </div>
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="border-indigo-500/30 bg-indigo-500/5 text-indigo-300 font-black h-14 rounded-2xl flex items-center gap-3 px-8 hover:bg-indigo-600 hover:text-white transition-all shadow-lg group-hover:shadow-indigo-600/20">
                        <Bell className="h-5 w-5" />
                        Configurar alertas
                    </Button>
                </motion.div>
            </motion.div>

            <CreateTicketModal 
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={fetchTickets}
                residentId={resident?.id}
                defaultCondominiumId={resident?.condominium_id}
                defaultOrganizationId={resident?.organization_id}
            />
        </div>
    )
}
