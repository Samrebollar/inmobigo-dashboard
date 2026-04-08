'use client'

import { motion } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Scale, Percent } from 'lucide-react'
import { FinancialRecord, FiscalRegime } from '@/types/accounting'
import { cn } from '@/lib/utils'

export function FinancialSummary({ 
    records, 
    regime 
}: { 
    records: FinancialRecord[], 
    regime: FiscalRegime 
}) {
    const totals = records.reduce((acc, curr) => {
        if (curr.type === 'ingreso') acc.ingresos += curr.amount
        else acc.egresos += curr.amount
        return acc
    }, { ingresos: 0, egresos: 0 })

    const result = totals.ingresos - totals.egresos
    const isProfit = result >= 0

    // Only for arrendamiento / actividad_empresarial
    const isBusiness = regime !== 'condominio_no_lucrativo'
    const estimatedISR = isBusiness && result > 0 ? result * 0.30 : 0

    const cards = [
        {
            title: 'Ingresos Totales',
            amount: totals.ingresos,
            icon: TrendingUp,
            color: 'text-emerald-500',
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        },
        {
            title: isBusiness ? 'Gastos Deducibles' : 'Egresos Totales',
            amount: totals.egresos,
            icon: TrendingDown,
            color: 'text-rose-500',
            bg: 'bg-rose-500/10',
            border: 'border-rose-500/20'
        },
        {
            title: isBusiness ? 'Utilidad Bruta' : 'Balance (Superávit/Déficit)',
            amount: Math.abs(result),
            icon: Scale,
            color: isProfit ? 'text-indigo-500' : 'text-amber-500',
            bg: isProfit ? 'bg-indigo-500/10' : 'bg-amber-500/10',
            border: isProfit ? 'border-indigo-500/20' : 'border-amber-500/20',
            isNegative: !isProfit
        }
    ]

    // Add ISR card if applicable
    if (isBusiness) {
        cards.push({
            title: 'Estimación ISR (30%)',
            amount: estimatedISR,
            icon: Percent,
            color: 'text-zinc-400',
            bg: 'bg-zinc-800/50',
            border: 'border-zinc-700/50',
            isNegative: false
        })
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                        "relative p-6 rounded-[32px] border transition-all duration-300 group hover:scale-[1.02]",
                        card.bg,
                        card.border
                    )}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn("p-3 rounded-2xl", card.color.replace('text', 'bg').replace('500', '500/10'))}>
                            <card.icon size={22} className={card.color} />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 opacity-60 group-hover:opacity-100 transition-opacity">
                            Este Mes
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-400">{card.title}</p>
                        <div className="flex items-baseline gap-1">
                            {card.isNegative && <span className={cn("text-2xl", card.color)}>-</span>}
                            <span className="text-2xl font-black text-white tracking-tight">
                                ${card.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs font-bold text-zinc-500 ml-1">MXN</span>
                        </div>
                    </div>

                    {index === 2 && !isBusiness && (
                        <div className="mt-4 text-[10px] font-medium text-zinc-500 italic">
                            Resumen informativo para asociaciones sin fines de lucro.
                        </div>
                    )}
                </motion.div>
            ))}
        </div>
    )
}
