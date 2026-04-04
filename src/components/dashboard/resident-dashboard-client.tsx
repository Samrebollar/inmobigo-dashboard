'use client'

import { useEffect } from 'react'
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
    CreditCard,
    Zap,
    TrendingUp,
    ShieldCheck,
    Home
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

interface ResidentDashboardClientProps {
    resident: any
    userName: string
}

export default function ResidentDashboardClient({ resident, userName }: ResidentDashboardClientProps) {
    const supabase = createClient()

    useEffect(() => {
        if (!resident?.user_id) return

        const channel = supabase
            .channel(`package-alerts-${resident.user_id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'package_alerts',
                    filter: `resident_id=eq.${resident.user_id}`
                },
                (payload) => {
                    // Si el estado cambia a 'received' (autorizado)
                    if (payload.new.status === 'received' && payload.old.status === 'pending') {
                        const carrier = payload.new.carrier || 'Paquetería'
                        const orgName = resident.condominiums?.name || 'Las Palmas'
                        
                        toast.success(
                            `📦 ¡Buenas noticias! Tu paquete de ${carrier} ha sido autorizado por seguridad y está ingresando a ${orgName}. Estará en tu domicilio en breve.`,
                            {
                                duration: 10000,
                                position: 'top-center'
                            }
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [resident?.user_id, resident?.condominiums?.name])

    const stats = [
        {
            label: 'Saldo Pendiente',
            value: `$${(resident?.debt_amount || 2500).toLocaleString()}`,
            subtext: 'Vence: 5 Abr',
            icon: CreditCard,
            color: 'rose',
            accent: 'rose-500'
        },
        {
            label: 'Último Pago',
            value: `$${(resident?.last_payment_amount || 2500).toLocaleString()}`,
            subtext: '3 Mar',
            icon: CheckCircle2,
            color: 'emerald',
            accent: 'emerald-500'
        },
        {
            label: 'Incidencias',
            value: resident?.active_tickets_count || '1',
            subtext: 'Activo',
            icon: Wrench,
            color: 'amber',
            accent: 'amber-500'
        },
        {
            label: 'Historial',
            value: resident?.paid_installments_count || '12',
            subtext: 'Este año',
            icon: Receipt,
            color: 'indigo',
            accent: 'indigo-500'
        }
    ]

    const containers = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="relative min-h-screen p-4 md:p-6 overflow-hidden bg-zinc-950 font-sans">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[100px] -z-10" />
            
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest text-[9px]">
                                Mi Propiedad
                            </Badge>
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            Hola, <span className="text-zinc-400">{userName}</span>
                        </h1>
                        <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
                             <Home className="h-4 w-4 text-indigo-500/30" />
                            {resident?.units?.unit_number || 'A-101'} <span className="text-zinc-800">•</span> {resident?.condominiums?.name || 'Torre Reforma'}
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900/40 backdrop-blur-md border border-white/5 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-xl ring-1 ring-white/5"
                    >
                        <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Próximo vencimiento</p>
                            <p className="text-xl font-bold text-white tracking-tight">5 Días</p>
                        </div>
                        <div className="h-8 w-8 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                            <Zap className="h-4 w-4 text-indigo-400 fill-indigo-400/20" />
                        </div>
                    </motion.div>
                </header>

                {/* Dynamic Payment Status Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "w-full p-6 rounded-2xl border backdrop-blur-md shadow-xl ring-1 ring-white/5 flex flex-col md:flex-row items-center justify-between gap-4",
                        (resident?.debt_amount > 0 || !resident?.debt_amount) 
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center shadow-lg",
                            (resident?.debt_amount > 0 || !resident?.debt_amount) ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                        )}>
                            {(resident?.debt_amount > 0 || !resident?.debt_amount) ? <Bell className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                        </div>
                        <div className="space-y-0.5 text-center md:text-left">
                            <h2 className="text-xl font-bold tracking-tight text-white">
                                {(resident?.debt_amount > 0 || !resident?.debt_amount) 
                                    ? "Debes ponerte al corriente con tus pagos" 
                                    : "¡Estás al día con tus pagos!"}
                            </h2>
                            <p className="text-sm font-medium opacity-80">
                                {(resident?.debt_amount > 0 || !resident?.debt_amount)
                                    ? "Tu último pago fue hace 20 días"
                                    : "Gracias por tu puntualidad y compromiso."}
                            </p>
                        </div>
                    </div>
                    {resident?.debt_amount > 0 && (
                         <Button variant="outline" className="bg-white/5 border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10">
                            Revisar Detalles
                         </Button>
                    )}
                </motion.div>

                {/* Grid Stats */}
                <motion.div 
                    variants={containers}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            variants={item}
                            whileHover={{ y: -4 }}
                            className="group relative"
                        >
                            <div className="h-full bg-zinc-900/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl transition-all duration-300 hover:bg-zinc-900/60 ring-1 ring-white/5 shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                                        stat.color === 'rose' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                        stat.color === 'emerald' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                        stat.color === 'amber' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                        "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                    )}>
                                        <stat.icon size={20} />
                                    </div>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-wide opacity-80",
                                        stat.color === 'rose' ? 'text-rose-400' : 
                                        stat.color === 'emerald' ? 'text-emerald-400' : 
                                        stat.color === 'amber' ? 'text-amber-400' : 'text-indigo-400'
                                    )}>
                                        {stat.subtext}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Action Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 ring-1 ring-white/5"
                        >
                            <div className="space-y-2 text-center md:text-left">
                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                    <ShieldCheck className="h-4 w-4 text-indigo-400" />
                                    <span className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">Servicios Seguros</span>
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Realiza tus pagos en segundos</h2>
                                <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">Administra las cuotas de tu propiedad de forma rápida y confiable.</p>
                            </div>
                            
                            <Button className="h-14 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 border border-white/10 font-bold tracking-wide transition-all active:scale-95">
                                <DollarSign className="h-5 w-5 mr-2" />
                                PAGAR AHORA
                            </Button>
                        </motion.div>

                        {/* Recent Activity */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                    <TrendingUp size={18} className="text-indigo-500" />
                                    Actividad Reciente
                                </h2>
                                <Button variant="ghost" size="sm" className="text-indigo-400 text-xs font-bold hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg">
                                    Ver historial
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { title: 'Pago Verificado', desc: 'Cuota de Abril confirmada', date: 'Hoy', icon: CheckCircle2, color: 'emerald' },
                                    { title: 'Incidencia Reportada', desc: 'Fuga en el área común', date: 'Ayer', icon: MessageSquare, color: 'amber' },
                                    { title: 'Aviso Importante', desc: 'Mantenimiento preventivo', date: '24 Mar', icon: Bell, color: 'indigo' }
                                ].map((act, i) => (
                                    <div 
                                        key={i}
                                        className="bg-zinc-900/20 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:bg-zinc-900/40 transition-all border-l-2"
                                        style={{ borderLeftColor: `var(--${act.color}-500)` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-lg flex items-center justify-center shadow-sm",
                                                act.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                                                act.color === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-indigo-500/10 text-indigo-400'
                                            )}>
                                                <act.icon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{act.title}</h4>
                                                <p className="text-xs text-zinc-500">{act.desc}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-600">{act.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Alerts Card */}
                        <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl space-y-5 ring-1 ring-white/5 shadow-xl relative overflow-hidden">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                                    <Bell size={16} className="text-amber-500" />
                                    Avisos de la Torre
                                </h2>
                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-[9px] border-none font-bold">2 NUEVOS</Badge>
                            </div>

                            <div className="space-y-4 relative">
                                {/* Timeline Line */}
                                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gradient-to-b from-zinc-800 via-zinc-800 to-transparent" />

                                {[
                                    { title: 'Limpieza Cisternas', time: 'Lunes, 10:00 AM', color: 'rose', icon: Wrench, desc: 'Corte de agua parcial' },
                                    { title: 'Reunión Ordinaria', time: 'Viernes, 07:00 PM', color: 'indigo', icon: MessageSquare, desc: 'Salón de eventos' }
                                ].map((ann, i) => (
                                    <motion.div 
                                        key={i} 
                                        whileHover={{ x: 4 }}
                                        className="flex gap-4 group cursor-pointer relative z-10"
                                    >
                                        <div className={cn(
                                            "h-6 w-6 rounded-full flex items-center justify-center ring-4 ring-zinc-950 transition-all group-hover:scale-110 shadow-sm",
                                            ann.color === 'rose' ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'
                                        )}>
                                            <ann.icon size={12} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="font-bold text-white text-[13px] leading-tight group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{ann.title}</h4>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{ann.time}</p>
                                                <span className="h-1 w-1 rounded-full bg-zinc-800" />
                                                <p className="text-[10px] font-medium text-zinc-600 italic">{ann.desc}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <Button variant="ghost" className="w-full text-zinc-500 hover:text-white text-[11px] font-bold h-9 rounded-xl hover:bg-white/5 transition-all group">
                                Ver todos los comunicados <ArrowRight size={12} className="ml-2 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
                            </Button>
                        </div>

                        {/* Help / Contact Card */}
                        <motion.div 
                            whileHover={{ y: -2 }}
                            className="bg-indigo-600/90 p-6 rounded-2xl space-y-4 shadow-xl relative overflow-hidden"
                        >
                            <div className="relative z-10 space-y-2">
                                <h2 className="text-lg font-bold text-white tracking-tight">¿Necesitas ayuda?</h2>
                                <p className="text-indigo-100 text-[13px] font-medium leading-relaxed opacity-90">Estamos aquí para apoyarte con cualquier duda sobre tu unidad.</p>
                            </div>
                            <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 font-bold h-11 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-xs">
                                <MessageSquare size={16} />
                                CONTACTAR ADMINISTRACIÓN
                            </Button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    )
}
