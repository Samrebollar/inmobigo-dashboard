'use client'

import { motion } from 'framer-motion'
import { Sparkles, ShieldCheck, Wrench, Leaf, Zap, MoreHorizontal, Home, Droplets } from 'lucide-react'
import { clsx } from 'clsx'

interface CategoryItem {
    category: string
    amount: number
}

interface SpendingBreakdownProps {
    expenses: CategoryItem[]
    totalExpenses: number
}

const CATEGORY_MAP: Record<string, { icon: any, color: string }> = {
    'limpieza': { icon: Sparkles, color: 'text-blue-400' },
    'seguridad': { icon: ShieldCheck, color: 'text-indigo-400' },
    'mantenimiento': { icon: Wrench, color: 'text-amber-400' },
    'jardineria': { icon: Leaf, color: 'text-emerald-400' },
    'servicios': { icon: Zap, color: 'text-yellow-400' },
    'agua': { icon: Droplets, color: 'text-cyan-400' },
    'administracion': { icon: Home, color: 'text-purple-400' },
    'otros': { icon: MoreHorizontal, color: 'text-zinc-400' }
}

export function SpendingBreakdown({ expenses, totalExpenses }: SpendingBreakdownProps) {
    // Process and sort expenses
    const processedExpenses = expenses
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 6) // Show top 6

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6 bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl h-full"
        >
            <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black text-white tracking-tight">¿En qué se está utilizando el dinero?</h3>
                <p className="text-zinc-500 text-sm">Desglose de los principales egresos operativos de este periodo.</p>
            </div>

            <div className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {processedExpenses.length > 0 ? (
                    processedExpenses.map((expense, index) => {
                        const normalizedCategory = expense.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        const categoryInfo = CATEGORY_MAP[normalizedCategory] || CATEGORY_MAP['otros']
                        const Icon = categoryInfo.icon
                        const percentage = totalExpenses > 0 ? (expense.amount / totalExpenses) * 100 : 0

                        return (
                            <motion.div 
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="group flex flex-col gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={clsx("p-2 rounded-xl bg-zinc-900", categoryInfo.color)}>
                                            <Icon size={18} />
                                        </div>
                                        <span className="text-sm font-bold text-white capitalize">{expense.category}</span>
                                    </div>
                                    <span className="text-sm font-black text-white">
                                        ${expense.amount.toLocaleString('es-MX')}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col gap-1.5">
                                    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            className={clsx("h-full rounded-full", categoryInfo.color.replace('text-', 'bg-'))}
                                        />
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-500 text-right uppercase tracking-wider">
                                        {percentage.toFixed(1)}% del gasto total
                                    </span>
                                </div>
                            </motion.div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                        <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-700">
                            <MoreHorizontal size={32} />
                        </div>
                        <p className="text-zinc-500 text-sm font-medium">No hay gastos registrados aún en este periodo.</p>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

