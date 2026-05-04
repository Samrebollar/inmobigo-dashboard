import { motion } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Scale, Percent, Clock, FileText, Activity, Receipt, CreditCard } from 'lucide-react'
import { FiscalRegime } from '@/types/accounting'
import { cn } from '@/lib/utils'

export function FinancialSummary({ 
    metrics, 
    regime 
}: { 
    metrics: {
        totalCollected: number,
        totalReceivable: number,
        totalInvoiced: number,
        totalExpenses: number,
        utilidad: number,
        isrEstimado: number
    }, 
    regime: FiscalRegime 
}) {
    const isBusiness = regime !== 'condominio_no_lucrativo'
    const isProfit = metrics.utilidad >= 0

    const cards = [
        {
            title: 'Ingresos Cobrados',
            amount: metrics.totalCollected,
            icon: Wallet,
            color: 'text-emerald-400',
            iconBg: 'bg-emerald-500/15',
            bg: 'bg-emerald-950/30 backdrop-blur-xl',
            border: 'border-emerald-500/20',
            glow: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10'
        },
        {
            title: 'Cuentas por Cobrar',
            amount: metrics.totalReceivable,
            icon: Clock,
            color: 'text-amber-400',
            iconBg: 'bg-amber-500/15',
            bg: 'bg-amber-950/30 backdrop-blur-xl',
            border: 'border-amber-500/20',
            glow: 'hover:border-amber-500/40 hover:shadow-amber-500/10'
        },
        {
            title: 'Total Facturado',
            amount: metrics.totalInvoiced,
            icon: Receipt,
            color: 'text-indigo-400',
            iconBg: 'bg-indigo-500/15',
            bg: 'bg-indigo-950/30 backdrop-blur-xl',
            border: 'border-indigo-500/20',
            glow: 'hover:border-indigo-500/40 hover:shadow-indigo-500/10'
        },
        {
            title: 'Egresos (Captura Manual)',
            amount: metrics.totalExpenses,
            icon: CreditCard,
            color: 'text-rose-400',
            iconBg: 'bg-rose-500/15',
            bg: 'bg-rose-950/30 backdrop-blur-xl',
            border: 'border-rose-500/20',
            glow: 'hover:border-rose-500/40 hover:shadow-rose-500/10'
        },
        {
            title: 'Resultado Neto',
            amount: metrics.utilidad, 
            icon: Scale,
            color: isProfit ? 'text-emerald-500' : 'text-rose-500',
            iconBg: isProfit ? 'bg-emerald-500/15' : 'bg-rose-500/15',
            bg: isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10',
            border: isProfit ? 'border-emerald-500/20' : 'border-rose-500/20',
            glow: isProfit ? 'hover:border-emerald-500/40 hover:shadow-emerald-500/10' : 'hover:border-rose-500/40 hover:shadow-rose-500/10',
            subtext: isProfit ? 'El condominio opera con superávit' : 'El condominio presenta déficit'
        }
    ]

    // ISR Card for Arrendamiento/Empresa
    if (regime && metrics.isrEstimado > 0) {
        cards.push({
            title: 'ISR Estimado (30%)',
            amount: metrics.isrEstimado,
            icon: Percent,
            color: 'text-zinc-500',
            bg: 'bg-zinc-800/10',
            border: 'border-white/5'
        })
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {cards.map((card, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                        "relative p-6 rounded-[32px] border transition-all duration-500 ease-out group hover:-translate-y-1 hover:shadow-2xl",
                        card.bg,
                        card.border,
                        (card as any).glow
                    )}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn("p-3 rounded-2xl", (card as any).iconBg)}>
                            <card.icon size={22} className={card.color} />
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 opacity-60 group-hover:opacity-100 transition-opacity">
                            PERIODO ACTUAL
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-400">{card.title}</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-black text-white tracking-tight">
                                {card.amount < 0 ? '-' : ''}${Math.abs(card.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs font-bold text-zinc-500 ml-1">MXN</span>
                        </div>
                        {card.subtext && (
                            <p className={cn("text-[10px] font-bold uppercase tracking-wider mt-2", isProfit ? "text-emerald-400/80" : "text-rose-400/80")}>
                                {card.subtext}
                            </p>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    )
}

