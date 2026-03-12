'use client'

import { motion } from 'framer-motion'
import { BarChart3, PieChart, Activity, Globe } from 'lucide-react'

export default function AnalyticsPage() {
    return (
        <div className="space-y-8">
            <h1 className="text-4xl font-black text-white tracking-tighter">Analíticas Avanzadas</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 h-80 flex flex-col items-center justify-center text-center space-y-4">
                    <PieChart size={48} className="text-indigo-500 mb-2" />
                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Distribución de Planes</h3>
                    <p className="text-zinc-500 text-sm">Visualización de cuota de mercado por tipo de suscripción.</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 h-80 flex flex-col items-center justify-center text-center space-y-4">
                    <Activity size={48} className="text-purple-500 mb-2" />
                    <h3 className="text-xl font-bold text-white uppercase tracking-widest">Retención (Churn)</h3>
                    <p className="text-zinc-500 text-sm">Análisis de permanencia y baja de clientes.</p>
                </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 h-64 flex items-center justify-between overflow-hidden relative">
                <div className="relative z-10">
                    <h3 className="text-2xl font-black text-white tracking-tight">Presencia Global</h3>
                    <p className="text-zinc-500 font-medium">Mapa interactivo de condominios en el mundo.</p>
                </div>
                <Globe size={180} className="text-zinc-800 absolute -right-10 opacity-20" />
            </div>
        </div>
    )
}
