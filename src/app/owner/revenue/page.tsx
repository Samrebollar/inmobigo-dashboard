'use client'

import { motion } from 'framer-motion'
import { TrendingUp, DollarSign, ArrowUpRight, Calendar, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RevenuePage() {
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Análisis de Ingresos</h1>
                    <p className="text-zinc-500 font-medium">Monitorea el crecimiento financiero de la plataforma.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white rounded-2xl p-6 font-bold flex items-center gap-2">
                        <Calendar size={18} />
                        Este Año
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold py-6 px-8 shadow-lg shadow-indigo-600/20 transition-all">
                        Expedir Balance
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Ingresos Totales', value: '$842,500', growth: '+22.4%', icon: DollarSign },
                    { label: 'Enero 2024', value: '$65,200', growth: '+8.1%', icon: TrendingUp },
                    { label: 'Ticket Promedio', value: '$240', growth: '+3.5%', icon: BarChart2 },
                ].map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 relative overflow-hidden group"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all">
                            <stat.icon size={64} className="text-indigo-400" />
                        </div>
                        <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">{stat.label}</p>
                        <h3 className="text-3xl font-black text-white tracking-tighter mb-4">{stat.value}</h3>
                        <div className="flex items-center gap-1.5 text-xs font-black text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full border border-emerald-500/10 w-fit">
                            <ArrowUpRight size={14} />
                            {stat.growth}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 h-96 flex flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-4 scale-125">
                    <TrendingUp size={32} />
                </div>
                <h3 className="text-2xl font-black text-white tracking-tight">Gráfico Detallado en Construcción</h3>
                <p className="text-zinc-500 max-w-md mx-auto">Estamos procesando los datos históricos para ofrecerte una visualización granular por plan y región.</p>
                <div className="flex gap-2 pt-4">
                    <div className="h-2 w-12 bg-indigo-600 rounded-full animate-pulse" />
                    <div className="h-2 w-8 bg-zinc-800 rounded-full" />
                    <div className="h-2 w-8 bg-zinc-800 rounded-full" />
                </div>
            </div>
        </div>
    )
}
