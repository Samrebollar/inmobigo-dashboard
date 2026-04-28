'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Ticket } from '@/types/tickets'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { maintenanceService } from '@/services/maintenance-service'
import { 
    MoreHorizontal, 
    MessageSquare, 
    Clock, 
    AlertCircle, 
    Wrench, 
    Filter,
    CheckCircle2,
    User,
    Home,
    Search,
    Download,
    Building2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MaintenanceBoardProps {
    tickets: Ticket[]
    onUpdateTicket: (ticket: Ticket) => void
}

type FilterType = 'all' | 'open' | 'in_progress' | 'resolved'

export function MaintenanceBoard({ tickets, onUpdateTicket }: MaintenanceBoardProps) {
    const [activeFilter, setActiveFilter] = useState<FilterType>('all')
    const [localTickets, setLocalTickets] = useState<Ticket[]>(tickets)

    useEffect(() => {
        setLocalTickets(tickets)
    }, [tickets])

    const handleStartProgress = async (ticketId: string) => {
        try {
            await maintenanceService.update(ticketId, { status: 'in_progress' })
            setLocalTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'in_progress' } : t))
            setActiveFilter('in_progress')
        } catch (error) {
            console.error('Error updating status to in_progress:', error)
        }
    }

    const filters = [
        { id: 'all', label: 'Todos', icon: Filter },
        { id: 'open', label: 'Pendientes', icon: AlertCircle, color: 'text-rose-400', glow: 'bg-rose-500/20' },
        { id: 'in_progress', label: 'En Progreso', icon: Clock, color: 'text-indigo-400', glow: 'bg-indigo-500/20' },
        { id: 'resolved', label: 'Resueltos', icon: CheckCircle2, color: 'text-emerald-400', glow: 'bg-emerald-500/20' }
    ]

    const filteredTickets = activeFilter === 'all' 
        ? localTickets 
        : localTickets.filter(t => t.status === activeFilter)

    const getPriorityConfig = (priority: string) => {
        switch (priority) {
            case 'critical': return { label: 'Crítica', color: 'rose' }
            case 'high': return { label: 'Alta', color: 'amber' }
            case 'medium': return { label: 'Media', color: 'indigo' }
            default: return { label: 'Baja', color: 'zinc' }
        }
    }

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'open': return { label: 'Pendiente', color: 'rose' }
            case 'in_progress': return { label: 'En proceso', color: 'indigo' }
            case 'resolved': return { label: 'Resuelto', color: 'emerald' }
            default: return { label: status, color: 'zinc' }
        }
    }

    return (
        <div className="space-y-8 pb-10">
            {/* Unified Status Tabs */}
            <div className="flex flex-wrap items-center gap-3 bg-zinc-950/40 p-2 rounded-[2rem] border border-zinc-900/50 backdrop-blur-md w-fit">
                {filters.map(f => {
                    const isActive = activeFilter === f.id
                    const Icon = f.icon
                    const count = f.id === 'all' ? localTickets.length : localTickets.filter(t => t.status === f.id).length

                    return (
                        <button
                            key={f.id}
                            onClick={() => setActiveFilter(f.id as FilterType)}
                            className={cn(
                                "relative px-6 py-3 rounded-[1.5rem] flex items-center gap-3 transition-all duration-500 group overflow-hidden",
                                isActive ? "bg-indigo-600 shadow-2xl shadow-indigo-600/20" : "hover:bg-zinc-900/50"
                            )}
                        >
                            {isActive && (
                                <motion.div 
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-indigo-600"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            <div className="relative z-10 flex items-center gap-3">
                                <Icon className={cn("h-4 w-4", isActive ? "text-white" : (f.color || "text-zinc-500"))} />
                                <span className={cn("text-sm font-black tracking-tight", isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-200")}>
                                    {f.label}
                                </span>
                                <span className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-lg border",
                                    isActive ? "bg-white/20 border-white/10 text-white" : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                )}>
                                    {count}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                <AnimatePresence mode='popLayout'>
                    {filteredTickets.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="col-span-full py-32 flex flex-col items-center justify-center text-zinc-700 bg-zinc-950/20 rounded-[3rem] border border-zinc-900/50 border-dashed"
                        >
                            <div className="h-24 w-24 rounded-full bg-zinc-900/50 flex items-center justify-center mb-6 border border-zinc-800/30">
                                <Search className="h-10 w-10 opacity-20" />
                            </div>
                            <h3 className="text-xl font-black text-zinc-600 tracking-tight mb-2">No se encontraron reportes</h3>
                            <p className="text-sm font-medium text-zinc-700 uppercase tracking-widest">Intenta cambiar el filtro o crear un reporte nuevo</p>
                        </motion.div>
                    ) : (
                        filteredTickets.map((ticket, i) => {
                            const priority = getPriorityConfig(ticket.priority)
                            const status = getStatusConfig(ticket.status)
                            const cleanDescription = ticket.description?.replace(/\[Categoría: .*?\]\s*/g, '') || ''

                            return (
                                <motion.div
                                    key={ticket.id}
                                    layout
                                    initial={{ opacity: 0, y: 30, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    transition={{ duration: 0.5, delay: i * 0.05 }}
                                    whileHover={{ y: -4 }}
                                    className="group"
                                >
                                    <Card className="bg-zinc-900/40 border-zinc-900 hover:border-indigo-500/40 cursor-pointer transition-all duration-500 shadow-2xl backdrop-blur-2xl rounded-[2.5rem] overflow-hidden h-full relative">
                                        <div className={cn(
                                            "absolute top-0 right-0 h-40 w-40 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700 -mr-20 -mt-20",
                                            status.color === 'rose' ? "bg-rose-600/10" : status.color === 'indigo' ? "bg-indigo-600/10" : "bg-emerald-600/10"
                                        )} />

                                        <CardContent className="p-8 space-y-6 relative z-10 flex flex-col h-full pt-10">
                                            {/* Top Metadata moved slightly down */}
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "h-3 w-3 rounded-full animate-pulse",
                                                        status.color === 'rose' ? "bg-rose-500" : status.color === 'indigo' ? "bg-indigo-500" : "bg-emerald-500"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[10px] font-black uppercase tracking-[0.2em]",
                                                        status.color === 'rose' ? "text-rose-400" : status.color === 'indigo' ? "text-indigo-400" : "text-emerald-400"
                                                    )}>
                                                        {status.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn(
                                                        "px-3 py-1 rounded-xl font-black text-[10px] uppercase tracking-wider border group-hover:border-white/10 transition-colors",
                                                        priority.color === 'rose' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                                                        priority.color === 'amber' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
                                                        priority.color === 'indigo' ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" :
                                                        "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                                                    )}>
                                                        {priority.label}
                                                    </Badge>
                                                </div>
                                            </div>

                                             {/* Body Content */}
                                             <div className="flex-1 space-y-4">
                                                 <div className="space-y-1">
                                                     <div className="flex justify-between items-center">
                                                         <h4 className="text-2xl font-black text-white tracking-tight leading-none group-hover:text-indigo-400 transition-colors">
                                                             {ticket.title}
                                                         </h4>
                                                         <div className="flex items-center gap-2 bg-zinc-950/40 px-3 py-1.5 rounded-xl border border-zinc-900/50">
                                                             <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                                                             <span className="text-[10px] font-black text-zinc-400 tracking-wider uppercase">{ticket.condominium_name || 'Zacil'}</span>
                                                         </div>
                                                     </div>
                                                     <p className="text-zinc-400 text-sm leading-relaxed pt-2">
                                                         {cleanDescription}
                                                     </p>
                                                 </div>
                                             </div>

                                            {/* Media Proof Section */}
                                            {ticket.images && ticket.images.length > 0 && (
                                                <div className="relative group/img rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 mt-2">
                                                    <img src={ticket.images[0]} alt="Evidencia" className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    <a 
                                                        href={ticket.images[0]} 
                                                        download
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="absolute bottom-4 right-4 h-10 px-4 rounded-xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-xs font-black text-indigo-400 hover:text-white hover:bg-indigo-600 transition-all flex items-center gap-2"
                                                    >
                                                        <Download size={14} /> Descargar
                                                    </a>
                                                </div>
                                            )}
                                             {/* Contextual Details (Resident, Unit) */}
                                             <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-900/50 mt-auto">
                                                 <div className="flex items-center gap-3">
                                                     <div className="h-10 w-10 rounded-2xl bg-zinc-950/40 border border-zinc-900/50 flex items-center justify-center shrink-0">
                                                         <User className="h-4 w-4 text-zinc-600" />
                                                     </div>
                                                     <div className="flex flex-col">
                                                         <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Residente</span>
                                                         <span className="text-xs font-bold text-white line-clamp-1">{ticket.resident_name || 'Clara Licona'}</span>
                                                     </div>
                                                 </div>
                                                 <div className="flex items-center gap-3">
                                                     <div className="h-10 w-10 rounded-2xl bg-zinc-950/40 border border-zinc-900/50 flex items-center justify-center shrink-0">
                                                         <Home className="h-4 w-4 text-zinc-600" />
                                                     </div>
                                                     <div className="flex flex-col">
                                                         <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Unidad</span>
                                                         <span className="text-xs font-bold text-white line-clamp-1">{ticket.unit_number || '1'}</span>
                                                     </div>
                                                 </div>
                                             </div>

                                            {/* Footer Action */}
                                            <div className="flex items-center justify-between pt-4 border-t border-zinc-900/50">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="h-3.5 w-3.5 text-zinc-700" />
                                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                                        {new Date(ticket.created_at).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                
                                                {ticket.status === 'open' && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleStartProgress(ticket.id)
                                                        }}
                                                        className="h-10 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black tracking-widest uppercase shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
                                                    >
                                                        En Proceso
                                                    </button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            )
                        })
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}


