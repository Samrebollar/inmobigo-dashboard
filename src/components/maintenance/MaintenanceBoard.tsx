import { motion, AnimatePresence } from 'framer-motion'
import { Ticket } from '@/types/tickets'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MoreHorizontal, MessageSquare, Clock, AlertCircle, Wrench, Plus } from 'lucide-react'

interface MaintenanceBoardProps {
    tickets: Ticket[]
    onUpdateTicket: (ticket: Ticket) => void
}

export function MaintenanceBoard({ tickets, onUpdateTicket }: MaintenanceBoardProps) {
    const columns = [
        { 
            id: 'open', 
            label: 'Pendientes', 
            color: 'border-l-rose-500', 
            headerColor: 'text-rose-400',
            bgGlow: 'group-hover/column:bg-rose-500/[0.03]',
            cardGlow: 'bg-rose-500/10',
            hoverGlow: 'group-hover:bg-rose-500/20',
            border: 'hover:border-rose-500/40'
        },
        { 
            id: 'in_progress', 
            label: 'En Progreso', 
            color: 'border-l-indigo-500', 
            headerColor: 'text-indigo-400',
            bgGlow: 'group-hover/column:bg-indigo-500/[0.03]',
            cardGlow: 'bg-indigo-500/10',
            hoverGlow: 'group-hover:bg-indigo-500/20',
            border: 'hover:border-indigo-500/40'
        },
        { 
            id: 'resolved', 
            label: 'Resueltos', 
            color: 'border-l-emerald-500', 
            headerColor: 'text-emerald-400',
            bgGlow: 'group-hover/column:bg-emerald-500/[0.03]',
            cardGlow: 'bg-emerald-500/10',
            hoverGlow: 'group-hover:bg-emerald-500/20',
            border: 'hover:border-emerald-500/40'
        }
    ]

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0.1 }
        }
    }

    const itemVariants = {
        hidden: { y: 15, opacity: 0, scale: 0.98 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: { type: 'spring', stiffness: 400, damping: 25 }
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full overflow-hidden pb-6">
            {columns.map(col => {
                const colTickets = tickets.filter(t => t.status === col.id)

                return (
                    <motion.div 
                        key={col.id} 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4 }}
                        className="flex flex-col h-full bg-zinc-950/20 rounded-[2.5rem] border border-zinc-900/50 shadow-2xl backdrop-blur-sm relative overflow-hidden group/column"
                    >
                        {/* Dynamic Column Background Glow */}
                        <div className={`absolute inset-0 transition-all duration-700 opacity-0 group-hover/column:opacity-100 ${col.bgGlow}`} />
                        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
                        
                        <div className={`p-8 border-b border-zinc-900/40 ${col.color} border-l-[6px] rounded-tl-[2.5rem] bg-zinc-900/10 flex items-center justify-between relative z-20`}>
                            <div className="space-y-1">
                                <h3 className={`font-black uppercase tracking-[0.2em] text-xs ${col.headerColor}`}>
                                    {col.label}
                                </h3>
                                <div className="h-0.5 w-8 bg-zinc-800 rounded-full group-hover/column:w-16 transition-all duration-500" />
                            </div>
                            <motion.span 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="text-[11px] font-black bg-zinc-900 text-zinc-400 px-4 py-2 rounded-2xl border border-zinc-800 shadow-xl"
                            >
                                {colTickets.length}
                            </motion.span>
                        </div>

                        <motion.div 
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar relative z-10"
                        >
                            <AnimatePresence mode='popLayout'>
                                {colTickets.length === 0 ? (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center justify-center py-32 text-zinc-800"
                                    >
                                        <motion.div 
                                            animate={{ 
                                                scale: [1, 1.05, 1],
                                                opacity: [0.1, 0.2, 0.1]
                                            }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                            className="h-24 w-24 rounded-full bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-800/30 shadow-inner"
                                        >
                                            <Wrench className="h-10 w-10" />
                                        </motion.div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Sección vacía</p>
                                    </motion.div>
                                ) : (
                                    colTickets.map(ticket => (
                                        <motion.div
                                            key={ticket.id}
                                            variants={itemVariants}
                                            layout
                                            whileHover={{ 
                                                y: -8, 
                                                scale: 1.03,
                                                rotateZ: 0.5 
                                            }}
                                            whileTap={{ scale: 0.98 }}
                                            className="group/card cursor-grab active:cursor-grabbing"
                                        >
                                            <Card className={`bg-zinc-900/30 border-zinc-800/80 hover:bg-zinc-900/50 transition-all duration-500 ${col.border} shadow-2xl backdrop-blur-2xl overflow-hidden relative rounded-[2rem]`}>
                                                {/* Card Interior Glows */}
                                                <div className={`absolute -top-10 -right-10 h-32 w-32 ${col.cardGlow} rounded-full blur-[40px] opacity-20 group-hover/card:opacity-100 transition-opacity duration-700`} />
                                                <div className={`absolute -bottom-10 -left-10 h-24 w-24 ${col.cardGlow} rounded-full blur-[30px] opacity-0 group-hover/card:opacity-60 transition-opacity duration-700`} />
                                                
                                                <CardContent className="p-7 space-y-5 relative z-10">
                                                    <div className="flex justify-between items-center">
                                                        <Badge variant={
                                                            ticket.priority === 'critical' ? 'destructive' :
                                                                ticket.priority === 'high' ? 'warning' : 'default'
                                                        } className="text-[9px] h-6 font-black uppercase tracking-[0.15em] px-3.5 rounded-xl shadow-2xl border-white/5 ring-1 ring-white/10">
                                                            {ticket.priority === 'low' ? 'Baja' : 
                                                             ticket.priority === 'medium' ? 'Media' :
                                                             ticket.priority === 'high' ? 'Alta' : 'Crítica'}
                                                        </Badge>
                                                        <motion.button 
                                                            whileHover={{ rotate: 90, scale: 1.1 }}
                                                            className="h-10 w-10 rounded-2xl bg-zinc-950/40 flex items-center justify-center text-zinc-500 hover:text-white hover:bg-indigo-600 transition-all border border-zinc-800/50 shadow-lg"
                                                        >
                                                            <Plus className="h-5 w-5" />
                                                        </motion.button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <h4 className="text-lg font-black text-white tracking-tight group-hover/card:text-indigo-400 transition-colors">
                                                            {ticket.title}
                                                        </h4>
                                                        <p className="text-sm text-zinc-500 line-clamp-2 leading-relaxed font-medium group-hover/card:text-zinc-400 transition-colors">
                                                            {ticket.description}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-6 border-t border-zinc-800/40">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="h-2 w-2 rounded-full bg-zinc-800 group-hover/card:bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)] transition-all duration-500" />
                                                            <span className="text-[10px] font-black text-zinc-600 group-hover/card:text-zinc-400 transition-colors uppercase tracking-wider">
                                                                {new Date(ticket.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <div className="px-3 py-1.5 rounded-xl bg-zinc-950/50 border border-zinc-800/40 shadow-inner">
                                                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest group-hover/card:text-indigo-400 transition-colors">
                                                                {ticket.unit_number || 'Global'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </motion.div>
                                    ))
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </motion.div>
                )
            })}
        </div>
    )
}

