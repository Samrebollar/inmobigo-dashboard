'use client'

import { motion } from 'framer-motion'
import { Building2, Home, Users, TrendingUp, AlertCircle } from 'lucide-react'

interface KPIProps {
    totalCondos: number
    totalUnits: number
    totalResidents: number
    occupancyRate: number
}

export function PropertiesKPI({ totalCondos, totalUnits, totalResidents, occupancyRate }: KPIProps) {
    const stats = [
        {
            label: 'Total Condominios',
            value: totalCondos,
            icon: Building2,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            trend: '+12% vs mes anterior',
            trendColor: 'text-emerald-400',
            hoverBorder: 'hover:border-blue-500/50'
        },
        {
            label: 'Total Unidades',
            value: totalUnits,
            icon: Home,
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            trend: 'Capacidad total',
            trendColor: 'text-zinc-500',
            hoverBorder: 'hover:border-purple-500/50'
        },
        {
            label: 'Residentes Activos',
            value: totalResidents,
            icon: Users,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
            trend: '+5 nuevos esta semana',
            trendColor: 'text-emerald-400',
            hoverBorder: 'hover:border-emerald-500/50'
        },
        {
            label: 'Ocupación Promedio',
            value: `${occupancyRate}%`,
            icon: TrendingUp,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10',
            trend: '2% vacante',
            trendColor: 'text-amber-400',
            hoverBorder: 'hover:border-amber-500/50'
        }
    ]

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { y: 20, opacity: 0 },
        show: { y: 0, opacity: 1 }
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
            {stats.map((stat, i) => (
                <motion.div
                    key={i}
                    variants={item}
                    whileHover={{ y: -5 }}
                    className={`relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl transition-all duration-300 ${stat.hoverBorder}`}
                >
                    <div className="flex items-center justify-between">
                        <div className={`rounded-lg p-2 ${stat.bg}`}>
                            <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </div>
                        {i === 3 && occupancyRate < 50 && (
                            <div className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-red-400">
                                <AlertCircle className="h-3 w-3" />
                                Baja
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
                        <p className="text-sm text-zinc-400">{stat.label}</p>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                        <span className={`text-xs font-medium ${stat.trendColor}`}>
                            {stat.trend}
                        </span>
                    </div>

                    {/* Decorative gradient glow */}
                    <div
                        className={`absolute -right-6 -top-6 h-24 w-24 rounded-full blur-3xl opacity-10 ${stat.bg.replace('/10', '')}`}
                    />
                </motion.div>
            ))}
        </motion.div>
    )
}
