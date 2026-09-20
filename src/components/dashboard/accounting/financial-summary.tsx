import { motion } from 'framer-motion'
import { Wallet, TrendingUp, TrendingDown, Scale, Percent, Clock, FileText, Activity, Receipt, CreditCard, AlertCircle } from 'lucide-react'
import { FiscalRegime } from '@/types/accounting'
import { cn } from '@/lib/utils'

export function FinancialSummary({
    metrics,
    regime,
    iaBadge
}: {
    metrics: {
        totalCollected: number,
        totalReceivable: number,
        totalOverdue: number,
        totalInvoiced: number,
        totalExpenses: number,
        utilidad: number,
        isrEstimado: number
    },
    regime: FiscalRegime,
    // Estado del mismo diagnóstico de IA que se muestra en el banner de
    // arriba (getIAState). El color/subtexto de "Resultado Neto" se deriva
    // de este único estado, en vez de un simple utilidad >= 0: así la
    // tarjeta nunca puede decir "Operación saludable" mientras el banner de
    // arriba dice "Morosidad Elevada" o "Atención Requerida" para el mismo
    // periodo — antes eran dos chequeos independientes que podían
    // contradecirse.
    iaBadge?: string
}) {
    const isBusiness = regime !== 'condominio_no_lucrativo'
    const isProfit = metrics.utilidad >= 0

    const resultStyleByBadge: Record<string, { color: string, iconBg: string, bg: string, border: string, glow: string, subtext: string, subtextColor: string }> = {
        'Déficit Operativo': {
            color: 'text-rose-500', iconBg: 'bg-rose-500/15', bg: 'bg-rose-500/10', border: 'border-rose-500/20',
            glow: 'hover:border-rose-500/40 hover:shadow-rose-500/10',
            subtext: 'Déficit operativo', subtextColor: 'text-rose-400/80'
        },
        'Atención Requerida': {
            color: 'text-rose-500', iconBg: 'bg-rose-500/15', bg: 'bg-rose-500/10', border: 'border-rose-500/20',
            glow: 'hover:border-rose-500/40 hover:shadow-rose-500/10',
            subtext: 'Atención requerida', subtextColor: 'text-rose-400/80'
        },
        'Morosidad Elevada': {
            color: 'text-amber-500', iconBg: 'bg-amber-500/15', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
            glow: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
            subtext: 'Positivo, con morosidad elevada', subtextColor: 'text-amber-400/80'
        },
        'Cobranza Parcial': {
            color: 'text-amber-500', iconBg: 'bg-amber-500/15', bg: 'bg-amber-500/10', border: 'border-amber-500/20',
            glow: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
            subtext: 'Positivo, cobranza parcial', subtextColor: 'text-amber-400/80'
        },
    }
    const resultStyle = (iaBadge && resultStyleByBadge[iaBadge]) || {
        color: isProfit ? 'text-emerald-500' : 'text-rose-500',
        iconBg: isProfit ? 'bg-emerald-500/15' : 'bg-rose-500/15',
        bg: isProfit ? 'bg-emerald-500/10' : 'bg-rose-500/10',
        border: isProfit ? 'border-emerald-500/20' : 'border-rose-500/20',
        glow: isProfit ? 'hover:border-emerald-500/40 hover:shadow-emerald-500/10' : 'hover:border-rose-500/40 hover:shadow-rose-500/10',
        subtext: isProfit ? 'Operación saludable' : 'Déficit operativo',
        subtextColor: isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'
    }

    const cards = [
        {
            title: 'Total del Periodo',
            amount: metrics.totalInvoiced,
            icon: Receipt,
            color: 'text-indigo-400',
            iconBg: 'bg-indigo-500/15',
            bg: 'bg-indigo-950/30 backdrop-blur-xl',
            border: 'border-indigo-500/20',
            glow: 'hover:border-indigo-500/40 hover:shadow-indigo-500/10',
            subtext: 'Cobranza esperada del periodo',
            subtextColor: 'text-indigo-400/80'
        },
        {
            title: 'Cobrado',
            amount: metrics.totalCollected,
            icon: Wallet,
            color: 'text-emerald-400',
            iconBg: 'bg-emerald-500/15',
            bg: 'bg-emerald-950/30 backdrop-blur-xl',
            border: 'border-emerald-500/20',
            glow: 'hover:border-emerald-500/40 hover:shadow-emerald-500/10',
            subtext: 'Pagado por residentes',
            subtextColor: 'text-emerald-400/80'
        },
        {
            title: 'Pendiente',
            amount: metrics.totalReceivable,
            icon: Clock,
            color: 'text-amber-400',
            iconBg: 'bg-amber-500/15',
            bg: 'bg-amber-950/30 backdrop-blur-xl',
            border: 'border-amber-500/20',
            glow: 'hover:border-amber-500/40 hover:shadow-amber-500/10',
            subtext: 'Pendiente dentro de fecha',
            subtextColor: 'text-amber-400/80'
        },
        {
            title: 'Morosidad',
            amount: metrics.totalOverdue,
            icon: AlertCircle,
            color: 'text-red-500',
            iconBg: 'bg-red-500/15',
            bg: 'bg-red-950/30 backdrop-blur-xl',
            border: 'border-red-500/20',
            glow: 'hover:border-red-500/40 hover:shadow-red-500/10',
            subtext: 'Pagos fuera de plazo',
            subtextColor: 'text-red-400/80'
        },
        {
            title: 'Gastos del Periodo',
            amount: metrics.totalExpenses,
            icon: CreditCard,
            color: 'text-purple-400',
            iconBg: 'bg-purple-500/15',
            bg: 'bg-purple-950/30 backdrop-blur-xl',
            border: 'border-purple-500/20',
            glow: 'hover:border-purple-500/40 hover:shadow-purple-500/10',
            subtext: 'Gastos operativos registrados',
            subtextColor: 'text-purple-400/80'
        },
        {
            title: 'Resultado Neto',
            amount: metrics.utilidad,
            icon: Scale,
            color: resultStyle.color,
            iconBg: resultStyle.iconBg,
            bg: resultStyle.bg,
            border: resultStyle.border,
            glow: resultStyle.glow,
            subtext: resultStyle.subtext,
            subtextColor: resultStyle.subtextColor
        }
    ]

    // ISR solo aplica a regímenes lucrativos (Arrendamiento/Actividad Empresarial).
    // Un condominio no lucrativo no debe mostrar una retención estimada sobre
    // las cuotas de mantenimiento que cobra para su propia operación.
    if (isBusiness && metrics.isrEstimado > 0) {
        cards.push({
            title: 'ISR Estimado (30%)',
            amount: metrics.isrEstimado,
            icon: Percent,
            color: 'text-zinc-500',
            iconBg: 'bg-zinc-500/15',
            bg: 'bg-zinc-800/10',
            border: 'border-white/5',
            glow: 'hover:border-zinc-500/30',
            subtext: 'Retención estimada SAT',
            subtextColor: 'text-zinc-500/80'
        })
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {cards.map((card, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                        "relative p-5 rounded-[32px] border transition-all duration-500 ease-out group hover:-translate-y-1 hover:shadow-2xl",
                        card.bg,
                        card.border,
                        (card as any).glow
                    )}
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={cn("p-3 rounded-2xl", (card as any).iconBg)}>
                            <card.icon size={22} className={card.color} />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-sm font-bold text-zinc-400">{card.title}</p>
                        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                            <span className="text-xl xl:text-2xl font-black text-white tracking-tight leading-none">
                                {card.amount < 0 ? '-' : ''}${Math.abs(card.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] font-black text-zinc-500 shrink-0 uppercase">MXN</span>
                        </div>
                        {card.subtext && (
                            <p className={cn("text-[8.5px] font-bold uppercase tracking-wider mt-2", (card as any).subtextColor)}>
                                {card.subtext}
                            </p>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    )
}
