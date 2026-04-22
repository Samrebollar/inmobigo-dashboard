'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface KPI {
    id: string
    title: string
    value: number
    prefix?: string
    suffix?: string
    change: number // percentage
    trend: 'up' | 'down' | 'neutral'
    icon: React.ElementType
    color: 'emerald' | 'blue' | 'violet' | 'rose'
    data: number[] // sparkline 7 days
}

export function KPICards({ organizationId, condominiumId }: { organizationId: string, condominiumId?: string }) {
    const [metrics, setMetrics] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setIsLoading(true)
                const params = new URLSearchParams()
                params.append('organization_id', organizationId)
                if (condominiumId) params.append('condominium_id', condominiumId)
                
                const res = await fetch(`/api/finance/metrics?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    setMetrics(data)
                }
            } catch (e) {
                console.error('Error fetching finance metrics:', e)
            } finally {
                setIsLoading(false)
            }
        }
        fetchMetrics()
    }, [condominiumId, organizationId])

    const kpis: KPI[] = [
        {
            id: 'income',
            title: 'Ingresos del Mes',
            value: metrics?.ingresos_mes || 0,
            prefix: '$',
            change: 12.5,
            trend: 'up',
            icon: DollarSign,
            color: 'emerald',
            data: [4000, 3000, 2000, 2780, 1890, 2390, 3490]
        },
        {
            id: 'invoiced',
            title: 'Total por cobrar del periodo',
            value: metrics?.total_por_cobrar || 0,
            prefix: '$',
            change: 8.2,
            trend: 'up',
            icon: Wallet,
            color: 'blue',
            data: [3000, 2000, 2780, 1890, 2390, 3490, 4200]
        },
        {
            id: 'overdue',
            title: 'Cartera Vencida',
            value: metrics?.cartera_vencida || 0,
            prefix: '$',
            change: -2.4, // Negative is good for overdue, but we handle color logic
            trend: 'down',
            icon: AlertCircle,
            color: 'rose',
            data: [2000, 2200, 2100, 2400, 2300, 2000, 1800]
        },
        {
            id: 'collection',
            title: 'Eficacia de Cobro',
            value: metrics?.eficacia_cobro || 0,
            suffix: '%',
            change: 5.1,
            trend: 'up',
            icon: Calendar,
            color: 'violet',
            data: [70, 75, 72, 78, 80, 82, 85]
        }
    ]

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi, index) => (
                <KPICard key={kpi.id} kpi={kpi} index={index} />
            ))}
        </div>
    )
}

function KPICard({ kpi, index }: { kpi: KPI, index: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 hover:bg-zinc-900/80 transition-all duration-300 hover:border-zinc-700/50 hover:shadow-xl hover:shadow-indigo-500/5"
        >
            {/* Background Gradient on Hover */}
            <div className={cn(
                "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-tr from-transparent to-transparent pointer-events-none",
                kpi.color === 'emerald' && "via-emerald-500/5",
                kpi.color === 'blue' && "via-blue-500/5",
                kpi.color === 'violet' && "via-violet-500/5",
                kpi.color === 'rose' && "via-rose-500/5",
            )} />

            <div className="flex justify-between items-start mb-4">
                <div className={cn(
                    "p-2 rounded-lg bg-zinc-800/50 text-zinc-400 group-hover:text-white transition-colors duration-300",
                    kpi.color === 'emerald' && "group-hover:bg-emerald-500/20 group-hover:text-emerald-400",
                    kpi.color === 'blue' && "group-hover:bg-blue-500/20 group-hover:text-blue-400",
                    kpi.color === 'violet' && "group-hover:bg-violet-500/20 group-hover:text-violet-400",
                    kpi.color === 'rose' && "group-hover:bg-rose-500/20 group-hover:text-rose-400",
                )}>
                    <kpi.icon size={20} />
                </div>

                {/* Trend Badge */}
                <div className={cn(
                    "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                    kpi.trend === 'up' && kpi.id !== 'overdue' ? "bg-emerald-500/10 text-emerald-400" :
                        kpi.trend === 'down' && kpi.id === 'overdue' ? "bg-emerald-500/10 text-emerald-400" :
                            "bg-rose-500/10 text-rose-400"
                )}>
                    {kpi.change > 0 ? '+' : ''}{kpi.change}%
                    {kpi.change > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                </div>
            </div>

            <div className="space-y-1">
                <h3 className="text-sm font-medium text-zinc-400">{kpi.title}</h3>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white tracking-tight">
                        {kpi.prefix}{kpi.value.toLocaleString()}
                        {kpi.suffix}
                    </span>
                </div>
            </div>

            {/* Simulated Sparkline */}
            <div className="mt-4 h-10 w-full flex items-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                {kpi.data.map((value, i) => {
                    const max = Math.max(...kpi.data)
                    const height = (value / max) * 100
                    return (
                        <div
                            key={i}
                            className={cn(
                                "flex-1 rounded-t-sm transition-all duration-500",
                                kpi.color === 'emerald' ? "bg-emerald-500" :
                                    kpi.color === 'blue' ? "bg-blue-500" :
                                        kpi.color === 'violet' ? "bg-violet-500" :
                                            "bg-rose-500"
                            )}
                            style={{ height: `${height}%` }}
                        />
                    )
                })}
            </div>
        </motion.div>
    )
}
