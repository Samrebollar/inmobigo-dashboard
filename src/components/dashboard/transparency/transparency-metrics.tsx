'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Scale, AlertCircle, DollarSign } from 'lucide-react'
import { clsx } from 'clsx'

interface MetricProps {
    title: string
    amount: number
    description: string
    icon: any
    type: 'income' | 'expense' | 'balance' | 'warning'
}

function MetricCard({ title, amount, description, icon: Icon, type }: MetricProps) {
    const isBalance = type === 'balance'
    const isPositive = amount >= 0
    
    let colorClass = 'text-blue-400'
    let bgGlow = 'bg-blue-500/10'
    let borderClass = 'border-white/10'

    if (type === 'income') {
        colorClass = 'text-emerald-400'
        bgGlow = 'bg-emerald-500/10'
    } else if (type === 'expense') {
        colorClass = 'text-rose-400'
        bgGlow = 'bg-rose-500/10'
    } else if (type === 'warning') {
        colorClass = 'text-amber-400'
        bgGlow = 'bg-amber-500/10'
    } else if (isBalance) {
        colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400'
        bgGlow = isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'
    }

    return (
        <motion.div 
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className={clsx(
                "relative group overflow-hidden rounded-[2rem] border backdrop-blur-xl p-6 transition-all",
                borderClass,
                "bg-white/[0.02] hover:bg-white/[0.04]"
            )}
        >
            <div className={clsx("absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -mr-16 -mt-16 rounded-full", bgGlow)} />
            
            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className={clsx("p-3 rounded-2xl bg-zinc-900/50 border border-white/5", colorClass)}>
                        <Icon size={24} />
                    </div>
                    {isBalance && (
                        <div className={clsx(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                            isPositive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        )}>
                            {isPositive ? 'Superávit' : 'Déficit'}
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.1em] mb-1">{title}</p>
                    <h3 className={clsx("text-3xl font-black tracking-tight", colorClass)}>
                        ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </h3>
                </div>

                <p className="text-zinc-400 text-xs leading-relaxed">
                    {description}
                </p>
            </div>
        </motion.div>
    )
}

interface TransparencyMetricsProps {
    metrics: {
        totalCollected: number
        totalExpenses: number
        utilidad: number
        totalReceivable: number
    }
}

export function TransparencyMetrics({ metrics }: TransparencyMetricsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard 
                title="Ingresos del mes"
                amount={metrics.totalCollected}
                description="Pagos realizados por los residentes"
                icon={TrendingUp}
                type="income"
            />
            <MetricCard 
                title="Gastos del mes"
                amount={metrics.totalExpenses}
                description="Egresos operativos del condominio"
                icon={TrendingDown}
                type="expense"
            />
            <MetricCard 
                title="Balance"
                amount={metrics.utilidad}
                description={metrics.utilidad >= 0 
                    ? "El condominio opera con superávit" 
                    : "El condominio presenta déficit"}
                icon={Scale}
                type="balance"
            />
            <MetricCard 
                title="Morosidad"
                amount={metrics.totalReceivable}
                description="Pagos pendientes de residentes"
                icon={AlertCircle}
                type="warning"
            />
        </div>
    )
}
