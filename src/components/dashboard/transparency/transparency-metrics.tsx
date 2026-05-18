'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Scale, AlertCircle, DollarSign } from 'lucide-react'
import { clsx } from 'clsx'

interface MetricProps {
    title: string
    amount: number
    description: string
    icon: any
    type: 'income' | 'expense' | 'balance' | 'warning' | 'danger' | 'period'
    customBadge?: {
        text: string
        variant: 'success' | 'danger' | 'warning' | 'info'
    }
}

function MetricCard({ title, amount, description, icon: Icon, type, customBadge }: MetricProps) {
    const isBalance = type === 'balance'
    const isPositive = amount >= 0
    
    let colorClass = 'text-blue-400'
    let bgGlow = 'bg-blue-500/10'
    let borderClass = 'border-white/10'
    let hoverBorderClass = 'hover:border-blue-500/40 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)]'

    if (type === 'income') {
        colorClass = 'text-emerald-400'
        bgGlow = 'bg-emerald-500/10'
        hoverBorderClass = 'hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]'
    } else if (type === 'expense') {
        colorClass = 'text-rose-400'
        bgGlow = 'bg-rose-500/10'
        hoverBorderClass = 'hover:border-rose-500/40 hover:shadow-[0_0_25px_rgba(244,63,94,0.15)]'
    } else if (type === 'warning') {
        colorClass = 'text-amber-400'
        bgGlow = 'bg-amber-500/10'
        hoverBorderClass = 'hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.15)]'
    } else if (type === 'danger') {
        colorClass = 'text-red-500'
        bgGlow = 'bg-red-500/10'
        hoverBorderClass = 'hover:border-red-500/40 hover:shadow-[0_0_25px_rgba(239,68,68,0.15)]'
    } else if (isBalance) {
        colorClass = isPositive ? 'text-emerald-400' : 'text-rose-400'
        bgGlow = isPositive ? 'bg-emerald-500/10' : 'bg-rose-500/10'
        hoverBorderClass = isPositive 
            ? 'hover:border-emerald-500/40 hover:shadow-[0_0_25px_rgba(16,185,129,0.15)]' 
            : 'hover:border-rose-500/40 hover:shadow-[0_0_25px_rgba(244,63,94,0.15)]'
    }

    return (
        <motion.div 
            whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
            className={clsx(
                "relative group overflow-hidden rounded-[1.8rem] border backdrop-blur-xl p-5 transition-all duration-300",
                borderClass,
                "bg-white/[0.02] hover:bg-white/[0.04]",
                hoverBorderClass
            )}
        >
            <div className={clsx("absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 -mr-16 -mt-16 rounded-full", bgGlow)} />
            
            <div className="relative z-10 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className={clsx("p-3 rounded-2xl bg-zinc-900/50 border border-white/5", colorClass)}>
                        <Icon size={22} />
                    </div>
                    {isBalance && (
                        <div className={clsx(
                            "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border",
                            customBadge 
                                ? (
                                    customBadge.variant === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                    customBadge.variant === 'danger' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                                    customBadge.variant === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                                    "bg-blue-500/10 border-blue-500/20 text-blue-400"
                                  )
                                : (isPositive ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border-rose-500/20 text-rose-400")
                        )}>
                            {customBadge ? customBadge.text : (isPositive ? 'Superávit' : 'Déficit')}
                        </div>
                    )}
                </div>

                <div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.1em] mb-1">{title}</p>
                    <h3 className={clsx("text-2xl font-black tracking-tight", colorClass)}>
                        ${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </h3>
                </div>

                <p className="text-zinc-400 text-[11px] leading-relaxed">
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
        totalInvoiced?: number
        totalPending?: number
        totalOverdue?: number
    }
}

export function TransparencyMetrics({ metrics }: TransparencyMetricsProps) {
    const hasUncollected = (metrics.totalPending || 0) > 0 || (metrics.totalOverdue || 0) > 0
    const isPositive = metrics.utilidad >= 0

    let balanceBadgeText = isPositive ? 'Superávit' : 'Déficit'
    let balanceBadgeVariant: 'success' | 'danger' | 'warning' | 'info' = isPositive ? 'success' : 'danger'
    let balanceDescription = isPositive 
        ? "El condominio opera con superávit" 
        : "El condominio presenta déficit"

    if (isPositive && hasUncollected) {
        balanceBadgeText = 'En Proceso'
        balanceBadgeVariant = 'info'
        balanceDescription = "Flujo neto favorable con cobros pendientes"
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <MetricCard 
                title="Total del Periodo"
                amount={metrics.totalInvoiced || 0}
                description="Cobranza esperada del periodo"
                icon={DollarSign}
                type="period"
            />
            <MetricCard 
                title="Ingresos del mes"
                amount={metrics.totalCollected}
                description="Pagos realizados"
                icon={TrendingUp}
                type="income"
            />
            <MetricCard 
                title="Pendiente"
                amount={metrics.totalPending || 0}
                description="Pendiente dentro de Fecha"
                icon={AlertCircle}
                type="warning"
            />
            <MetricCard 
                title="Morosidad"
                amount={metrics.totalOverdue ?? metrics.totalReceivable}
                description="Pagos pendientes de residentes"
                icon={AlertCircle}
                type="danger"
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
                description={balanceDescription}
                icon={Scale}
                type="balance"
                customBadge={{
                    text: balanceBadgeText,
                    variant: balanceBadgeVariant
                }}
            />
        </div>
    )
}
