'use client'

import { motion } from 'framer-motion'
import { 
    DollarSign, 
    CheckCircle2, 
    Wrench, 
    Receipt, 
    ChevronRight,
    Bell,
    MessageSquare,
    Calendar,
    ArrowRight,
    CreditCard
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ResidentDashboardClientProps {
    resident: any
    userName: string
}

export default function ResidentDashboardClient({ resident, userName }: ResidentDashboardClientProps) {
    const stats = [
        {
            label: 'Saldo Pendiente',
            value: `$${(resident?.debt_amount || 2500).toLocaleString()}`,
            subtext: 'Vence el 5 Abr',
            icon: CreditCard,
            color: 'rose',
            gradient: 'from-rose-500/20 to-rose-600/5',
            border: 'hover:border-rose-500/50',
            iconColor: 'text-rose-400'
        },
        {
            label: 'Último Pago',
            value: `$${(resident?.last_payment_amount || 2500).toLocaleString()}`,
            subtext: 'Pagado el 3 Mar',
            icon: CheckCircle2,
            color: 'emerald',
            gradient: 'from-emerald-500/20 to-emerald-600/5',
            border: 'hover:border-emerald-500/50',
            iconColor: 'text-emerald-400'
        },
        {
            label: 'Tickets Activos',
            value: resident?.active_tickets_count || '1',
            subtext: 'En proceso',
            icon: Wrench,
            color: 'amber',
            gradient: 'from-amber-500/20 to-amber-600/5',
            border: 'hover:border-amber-500/50',
            iconColor: 'text-amber-400'
        },
        {
            label: 'Cuotas Pagadas',
            value: resident?.paid_installments_count || '10',
            subtext: 'Este año',
            icon: Receipt,
            color: 'indigo',
            gradient: 'from-indigo-500/20 to-indigo-600/5',
            border: 'hover:border-indigo-500/50',
            iconColor: 'text-indigo-400'
        }
    ]

    const activity = [
        {
            type: 'pago',
            title: 'Pago realizado',
            description: 'Cuota de Marzo',
            date: '3 Mar',
            icon: CheckCircle2,
            color: 'emerald'
        },
        {
            type: 'reporte',
            title: 'Reporte enviado',
            description: 'Fuga en baño principal',
            date: '15 Feb',
            icon: MessageSquare,
            color: 'amber'
        },
        {
            type: 'aviso',
            title: 'Aviso publicado',
            description: 'Corte de agua programado',
            date: '12 Feb',
            icon: Bell,
            color: 'indigo'
        }
    ]

    const announcements = [
        {
            id: 1,
            title: 'Corte de agua',
            time: '15 Mar • 9:00 AM',
            color: 'bg-amber-500'
        },
        {
            id: 2,
            title: 'Mantenimiento elevador',
            time: '20 Mar • 08:00 AM',
            color: 'bg-emerald-400'
        }
    ]

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
                        Hola, {userName} 👋
                    </h1>
                    <p className="text-zinc-400 mt-2 text-lg font-medium flex items-center gap-2">
                        {resident?.units?.unit_number || 'Apartamento A-101'} • {resident?.condominiums?.name || 'Torre Reforma'}
                    </p>
                </div>

                {/* Next Payment Circle Widget */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.05 }}
                    className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl shadow-black/20 group hover:border-indigo-500/30 transition-all duration-300 cursor-default"
                >
                    <div className="text-right">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Próximo pago vence en</p>
                    </div>
                    <div className="relative h-14 w-14 flex items-center justify-center">
                        <svg className="h-full w-full rotate-[-90deg]">
                            <circle
                                cx="28"
                                cy="28"
                                r="24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                className="text-zinc-800"
                            />
                            <circle
                                cx="28"
                                cy="28"
                                r="24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="4"
                                strokeDasharray="150"
                                strokeDashoffset="45"
                                className="text-emerald-400 transition-all duration-1000"
                            />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">5</span>
                    </div>
                </motion.div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        transition={{ 
                            type: 'spring',
                            stiffness: 300,
                            damping: 15,
                            delay: i * 0.05 
                        }}
                        className={cn(
                            "relative overflow-hidden bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 p-6 rounded-3xl transition-all group",
                            stat.border
                        )}
                    >
                        {/* Decorative Gradient Background */}
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10",
                            stat.gradient
                        )} />
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className={cn(
                                "p-2.5 rounded-2xl transition-all duration-300 group-hover:scale-110",
                                stat.color === 'rose' ? "bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-white" :
                                stat.color === 'emerald' ? "bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white" :
                                stat.color === 'amber' ? "bg-amber-500/10 text-amber-400 group-hover:bg-amber-500 group-hover:text-white" :
                                "bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white"
                            )}>
                                <stat.icon size={22} className="drop-shadow-sm" />
                            </div>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{stat.label}</span>
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black text-white tracking-tight group-hover:translate-x-1 transition-transform duration-300">{stat.value}</h3>
                            <p className={cn("text-xs font-bold transition-all duration-300 group-hover:opacity-80", 
                                stat.color === 'rose' ? 'text-rose-500' : 
                                stat.color === 'emerald' ? 'text-emerald-500' : 
                                stat.color === 'amber' ? 'text-amber-500' : 'text-indigo-400'
                            )}>
                                {stat.subtext}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 space-y-8">
                    {/* Main Action Button - Now inside the left column to align with right column alerts */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="relative group"
                    >
                        <Button className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white h-20 rounded-[2rem] text-2xl font-black shadow-2xl shadow-indigo-600/40 group transition-all duration-300 border border-white/20">
                            <span className="relative z-10 flex items-center gap-3">
                                <DollarSign className="h-6 w-6" />
                                Pagar ahora
                            </span>
                        </Button>
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[2.2rem] blur opacity-20 group-hover:opacity-40 transition duration-500" />
                    </motion.div>

                    {/* Activity Feed */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-indigo-400" />
                                Actividad Reciente
                            </h2>
                        </div>
                    
                    <div className="space-y-4">
                        {activity.map((item, i) => (
                            <div key={i} className="bg-zinc-900/30 border border-zinc-800/50 p-4 rounded-2xl flex items-center justify-between hover:bg-zinc-900/50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={cn("h-12 w-12 rounded-full flex items-center justify-center shadow-lg", 
                                        item.color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400' : 
                                        item.color === 'amber' ? 'bg-amber-500/20 text-amber-400' : 
                                        'bg-indigo-500/20 text-indigo-400'
                                    )}>
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                                        <p className="text-sm text-zinc-500">{item.description}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-zinc-600">{item.date}</span>
                            </div>
                        ))}
                        <button className="w-full py-2 text-sm font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-2 group">
                            Ver toda la actividad <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Alerts & Help */}
            <div className="space-y-8">
                {/* Important Alerts */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                >
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Bell className="h-5 w-5 text-amber-500" />
                        Avisos Importantes
                    </h2>
                    <motion.div 
                        whileHover={{ y: -5, borderColor: 'rgba(245, 158, 11, 0.3)' }}
                        className="bg-zinc-900/30 border border-zinc-800/50 p-6 rounded-[2rem] space-y-6 shadow-xl transition-colors"
                    >
                        {announcements.map((ann) => (
                            <div key={ann.id} className="flex gap-4 group cursor-default">
                                <div className={cn("h-2.5 w-2.5 rounded-full mt-2 shrink-0 animate-pulse", ann.color)} />
                                <div className="space-y-1">
                                    <h4 className="font-bold text-white group-hover:text-amber-400 transition-colors">{ann.title}</h4>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{ann.time}</p>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>

                {/* Help Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950/40 border border-indigo-500/20 p-8 rounded-[2rem] space-y-6 shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 -m-8 h-32 w-32 bg-indigo-600/10 rounded-full blur-3xl group-hover:bg-indigo-600/20 transition-colors" />
                    
                    <div className="space-y-2 relative z-10">
                        <h2 className="text-2xl font-black text-white">¿Necesitas ayuda?</h2>
                        <p className="text-zinc-400 text-sm leading-relaxed">Estamos aquí para apoyarte con cualquier duda o problema.</p>
                    </div>
                    <Button className="w-full bg-white/5 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white text-indigo-300 h-14 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 font-bold group-hover:shadow-lg group-hover:shadow-indigo-600/20 relative z-10">
                        <MessageSquare className="h-5 w-5" />
                        <span>Contactar admin</span>
                    </Button>
                </motion.div>
            </div>
            </div>
        </div>
    )
}
