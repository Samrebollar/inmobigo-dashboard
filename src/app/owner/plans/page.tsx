'use client'

import { motion } from 'framer-motion'
import { Layers, Zap, Star, Shield, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PlansPage() {
    const plans = [
        { name: 'Core', price: '$120', color: 'bg-zinc-800', icon: Layers },
        { name: 'Plus', price: '$250', color: 'bg-purple-600', icon: Zap },
        { name: 'Elite', price: '$450+', color: 'bg-indigo-600', icon: Star },
    ]

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">Planes y Tarifas</h1>
                    <p className="text-zinc-500 font-medium">Gestiona la oferta comercial de InmobiGo.</p>
                </div>
                <Button className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold py-6 px-8 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2">
                    <Plus size={20} />
                    Nuevo Plan
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center text-center space-y-6 hover:border-indigo-500/50 transition-all group"
                    >
                        <div className={`h-20 w-20 ${plan.color} rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/10 group-hover:scale-110 transition-transform`}>
                            <plan.icon size={32} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-tight">{plan.name}</h3>
                            <p className="text-4xl font-black text-indigo-400 tracking-tighter mt-2">{plan.price}</p>
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mt-1">por mes</span>
                        </div>
                        <Button variant="outline" className="w-full bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white rounded-2xl py-6 font-black text-xs uppercase tracking-widest">
                            Editar Beneficios
                        </Button>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
