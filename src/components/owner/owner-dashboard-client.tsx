'use client'

import { motion } from 'framer-motion'
import { 
    TrendingUp, 
    Users as UsersIcon, 
    CreditCard, 
    DollarSign, 
    ArrowUpRight, 
    Package, 
    CheckCircle2, 
    Clock,
    Search,
    Filter,
    ChevronRight,
    LucideIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// --- Types ---

interface MetricCardProps {
    title: string
    value: string
    change: string
    icon: LucideIcon
    isPositive?: boolean
    delay?: number
}

// --- Sub-components ---

function MetricCard({ title, value, change, icon: Icon, isPositive = true, delay = 0 }: MetricCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group"
        >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Icon size={80} className="text-indigo-400" />
            </div>
            
            <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="h-10 w-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Icon size={18} />
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">{title}</span>
            </div>

            <div className="space-y-1 relative z-10">
                <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
                <div className="flex items-center gap-2">
                    <div className={cn(
                        "flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md",
                        isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                        <TrendingUp size={10} className={isPositive ? "" : "rotate-180"} />
                        {change}
                    </div>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">vs último mes</span>
                </div>
            </div>
        </motion.div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

export default function OwnerDashboardClient() {
    // Mock Statistics
    const metrics = [
        { title: 'MRR', value: '$24,450', change: '+12.5%', icon: DollarSign, delay: 0 },
        { title: 'Ingresos Totales', value: '$182,200', change: '+8.2%', icon: TrendingUp, delay: 0.1 },
        { title: 'Clientes Activos', value: '142', change: '+24', icon: UsersIcon, delay: 0.2 },
        { title: 'Pagos Procesados', value: '1.2k', change: '+15.3%', icon: CreditCard, delay: 0.3 },
    ]

    // Mock Customers
    const customers = [
        { name: 'Condominio Altavista', plan: 'Elite', units: 120, monthly: '$450', status: 'active', color: 'indigo' },
        { name: 'Torre Residencial X', plan: 'Plus', units: 85, monthly: '$250', status: 'active', color: 'purple' },
        { name: 'Fraccionamiento Arcos', plan: 'Core', units: 45, monthly: '$120', status: 'pending', color: 'amber' },
        { name: 'Plaza Central Apts', plan: 'Elite', units: 200, monthly: '$680', status: 'active', color: 'indigo' },
        { name: 'Villas del Bosque', plan: 'Plus', units: 60, monthly: '$250', status: 'suspended', color: 'rose' },
    ]

    // Mock Activity
    const activities = [
        { event: 'Nuevo cliente registrado', target: 'Condominio Altavista', time: 'Hace 2 min', icon: Package, color: 'text-indigo-400' },
        { event: 'Suscripción pagada', target: 'Torre Residencial X', time: 'Hace 15 min', icon: CheckCircle2, color: 'text-emerald-400' },
        { event: 'Plan actualizado', target: 'Villas del Bosque', time: 'Hace 45 min', icon: ArrowUpRight, color: 'text-purple-400' },
        { event: 'Nuevo ticket de soporte', target: 'Plaza Central Apts', time: 'Hace 1 hora', icon: Clock, color: 'text-amber-400' },
    ]

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-4xl font-black text-white tracking-tighter">Resumen de Plataforma</h1>
                    <p className="text-zinc-400 font-medium">Bienvenido de nuevo, Owner. Aquí está lo que está pasando hoy.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl font-bold transition-all flex items-center gap-2">
                        <Filter size={16} />
                        Filtros
                    </Button>
                    <Button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 px-6">
                        Descargar Reporte
                    </Button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric) => (
                    <MetricCard key={metric.title} {...metric} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Growth Chart Mockup */}
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group"
                >
                    <div className="absolute top-0 inset-0 bg-grid-white/[0.02] bg-[length:30px_30px]" />
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">Crecimiento de Ingresos</h3>
                            <p className="text-zinc-500 text-sm font-medium">Histórico de los últimos 12 meses</p>
                        </div>
                        <div className="flex items-center gap-2 bg-zinc-950/50 p-1.5 rounded-2xl border border-zinc-800">
                            {['Ene', 'Feb', 'Mar'].map((range) => (
                                <button key={range} className={cn(
                                    "px-4 py-1.5 rounded-xl text-xs font-black transition-all",
                                    range === 'Mar' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-zinc-500 hover:text-white"
                                )}>
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Simple Chart Visual Representation */}
                    <div className="h-64 flex items-end justify-between gap-4 relative z-10 pt-4">
                        {[40, 55, 45, 65, 50, 75, 60, 85, 95, 80, 100, 110].map((height, i) => (
                            <motion.div 
                                key={i}
                                initial={{ scaleY: 0 }}
                                animate={{ scaleY: 1 }}
                                transition={{ delay: 0.5 + (i * 0.05), type: "spring", stiffness: 100 }}
                                style={{ height: `${height}%` }}
                                className={cn(
                                    "flex-1 rounded-t-lg transition-all duration-300 relative group/bar cursor-pointer",
                                    i === 11 ? "bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]" : "bg-zinc-800 group-hover:bg-zinc-700 hover:bg-indigo-500/50"
                                )}
                            >
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity">
                                    ${height}k
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex justify-between mt-6 text-[10px] font-bold text-zinc-600 uppercase tracking-widest relative z-10 border-t border-zinc-800/50 pt-4">
                        <span>Abr 2025</span>
                        <span>Mar 2026</span>
                    </div>
                </motion.div>

                {/* Platform Activity Feed */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 shadow-2xl flex flex-col"
                >
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black text-white tracking-tight">Actividad</h3>
                        <div className="h-8 w-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white transition-colors cursor-pointer">
                            <ChevronRight size={16} />
                        </div>
                    </div>

                    <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {activities.map((item, i) => (
                            <div key={i} className="flex gap-4 group cursor-pointer border-l border-zinc-800 pl-4 py-1 hover:border-indigo-500 transition-colors">
                                <div className={cn("h-10 w-10 flex-shrink-0 rounded-xl bg-zinc-950 flex items-center justify-center border border-zinc-800 group-hover:scale-110 group-hover:border-indigo-500/30 transition-all", item.color)}>
                                    <item.icon size={18} />
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    <p className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{item.event}</p>
                                    <p className="text-xs font-medium text-zinc-500">{item.target}</p>
                                    <span className="text-[10px] font-black text-zinc-600 uppercase mt-1">{item.time}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button variant="ghost" className="mt-8 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-2xl font-black text-xs uppercase tracking-widest w-full">
                        Ver todo el log
                    </Button>
                </motion.div>
            </div>

            {/* Customers Table */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
                <div className="p-10 border-b border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">Clientes Recientes</h3>
                        <p className="text-zinc-500 text-sm font-medium">Estado de las suscripciones por condominio</p>
                    </div>
                    <div className="relative w-full md:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-indigo-400 transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Buscar en clientes..." 
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-2.5 pl-12 pr-4 text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-950/30 border-b border-zinc-800/50">
                                <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nombre del Cliente</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Plan</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Unidades</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Suscripción</th>
                                <th className="px-6 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Estado</th>
                                <th className="px-10 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((c, i) => (
                                <tr key={i} className="border-b border-zinc-800/30 hover:bg-zinc-800/20 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-lg",
                                                c.color === 'indigo' ? "bg-indigo-600 shadow-indigo-600/20" : 
                                                c.color === 'purple' ? "bg-purple-600 shadow-purple-600/20" :
                                                c.color === 'amber' ? "bg-amber-600 shadow-amber-600/20" : "bg-rose-600 shadow-rose-600/20"
                                            )}>
                                                {c.name[0]}
                                            </div>
                                            <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">{c.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <Badge variant="outline" className="border-zinc-800 bg-zinc-950 text-zinc-400 font-bold px-3 py-1 rounded-lg">
                                            {c.plan}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="text-sm font-black text-zinc-300">{c.units}</span>
                                    </td>
                                    <td className="px-6 py-6 text-center">
                                        <span className="text-sm font-bold text-white">{c.monthly}</span>
                                        <span className="text-[10px] text-zinc-500 block">/mes</span>
                                    </td>
                                    <td className="px-6 py-6">
                                        <div className="flex justify-center">
                                            <div className={cn(
                                                "flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider",
                                                c.status === 'active' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                c.status === 'pending' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                            )}>
                                                <div className={cn("h-1.5 w-1.5 rounded-full", 
                                                    c.status === 'active' ? "bg-emerald-500" : 
                                                    c.status === 'pending' ? "bg-amber-500" : "bg-rose-500"
                                                )} />
                                                {c.status}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                                            <ArrowUpRight size={18} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-10 bg-zinc-950/20 flex items-center justify-between border-t border-zinc-800/50">
                    <p className="text-sm text-zinc-500 font-medium">Mostrando 5 de 142 clientes registrados</p>
                    <div className="flex gap-2">
                        <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white rounded-xl px-6 font-bold text-xs uppercase tracking-widest">
                            Anterior
                        </Button>
                        <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white rounded-xl px-6 font-bold text-xs uppercase tracking-widest">
                            Siguiente
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
