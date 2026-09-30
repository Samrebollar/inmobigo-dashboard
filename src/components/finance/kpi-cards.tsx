'use client'

import { motion } from 'framer-motion'
import { DollarSign, Receipt, AlertCircle, Target, Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface MetricsData {
    ingresos_mes: number
    ingresos_del_mes: number
    ingresos_recuperacion: number
    ingresos_adelantos: number
    total_generado: number
    cobrado_cuotas_mes: number
    total_por_cobrar: number
    cartera_vencida: number
    cartera_vencida_mes: number
    cartera_vencida_anterior: number
    eficacia_cobro: number
}

type Color = 'emerald' | 'blue' | 'violet' | 'rose'

interface KPI {
    id: string
    title: string
    hint: string
    value: string
    isZero: boolean
    icon: React.ElementType
    color: Color
    rows: { label: string, value: string, tone?: 'muted' | 'good' | 'bad' | 'warn' }[]
    progress?: number
}

const money = (n: number) => `$${Math.round(n || 0).toLocaleString('es-MX')}`

export function KPICards({ organizationId, condominiumId }: { organizationId: string, condominiumId?: string }) {
    const [metrics, setMetrics] = useState<MetricsData | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setIsLoading(true)
                setError(null)
                const params = new URLSearchParams()
                params.append('organization_id', organizationId)
                if (condominiumId) params.append('condominium_id', condominiumId)

                const res = await fetch(`/api/finance/metrics?${params.toString()}`)
                if (res.ok) {
                    setMetrics(await res.json())
                } else {
                    const errData = await res.json().catch(() => ({}))
                    setError(errData.error || `Error ${res.status}`)
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e)
                if (!msg.includes('abort')) {
                    console.error('Error fetching finance metrics:', e)
                    setError(msg)
                }
            } finally {
                setIsLoading(false)
            }
        }
        fetchMetrics()
    }, [condominiumId, organizationId])

    const m = metrics
    const monthName = new Date().toLocaleDateString('es-MX', { month: 'long', timeZone: 'America/Mexico_City' })

    const kpis: KPI[] = [
        {
            id: 'income',
            title: 'Ingresos del Mes',
            hint: `Todo el dinero que entró en ${monthName}, sin importar a qué mes pertenece la deuda.`,
            value: money(m?.ingresos_mes ?? 0),
            isZero: !m?.ingresos_mes,
            icon: DollarSign,
            color: 'emerald',
            rows: [
                { label: `Cuotas de ${monthName}`, value: money(m?.ingresos_del_mes ?? 0) },
                { label: 'Meses anteriores (recuperación)', value: money(m?.ingresos_recuperacion ?? 0), tone: (m?.ingresos_recuperacion ?? 0) > 0 ? 'good' : 'muted' },
                { label: 'Adelantos / saldo a favor', value: money(m?.ingresos_adelantos ?? 0), tone: 'muted' },
            ],
        },
        {
            id: 'billed',
            title: 'Total por Cobrar del Periodo',
            hint: `Cuotas de mantenimiento generadas para ${monthName}.`,
            value: money(m?.total_generado ?? 0),
            isZero: !m?.total_generado,
            icon: Receipt,
            color: 'blue',
            rows: [
                { label: 'Cobrado', value: money(m?.cobrado_cuotas_mes ?? 0), tone: 'good' },
                { label: 'Por cobrar', value: money(m?.total_por_cobrar ?? 0), tone: (m?.total_por_cobrar ?? 0) > 0 ? 'warn' : 'muted' },
            ],
        },
        {
            id: 'overdue',
            title: 'Cartera Vencida',
            hint: 'Todo lo vencido sin pagar a hoy, de cualquier mes.',
            value: money(m?.cartera_vencida ?? 0),
            isZero: !m?.cartera_vencida,
            icon: AlertCircle,
            color: 'rose',
            rows: [
                { label: `De ${monthName}`, value: money(m?.cartera_vencida_mes ?? 0), tone: (m?.cartera_vencida_mes ?? 0) > 0 ? 'bad' : 'muted' },
                { label: 'Meses anteriores', value: money(m?.cartera_vencida_anterior ?? 0), tone: (m?.cartera_vencida_anterior ?? 0) > 0 ? 'bad' : 'muted' },
            ],
        },
        {
            id: 'collection',
            title: 'Eficacia de Cobro',
            hint: `Qué porcentaje de las cuotas de ${monthName} ya se cobró. Lo recuperado de meses anteriores no la infla.`,
            value: `${(m?.eficacia_cobro ?? 0).toFixed(1)}%`,
            isZero: !m?.eficacia_cobro,
            icon: Target,
            color: 'violet',
            progress: m?.eficacia_cobro ?? 0,
            rows: [
                { label: `${money(m?.cobrado_cuotas_mes ?? 0)} de ${money(m?.total_generado ?? 0)}`, value: '', tone: 'muted' },
                { label: 'Recuperado de meses anteriores', value: money(m?.ingresos_recuperacion ?? 0), tone: (m?.ingresos_recuperacion ?? 0) > 0 ? 'good' : 'muted' },
            ],
        },
    ]

    if (error) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className="rounded-xl border border-rose-800/40 bg-zinc-900/50 p-6">
                        <p className="text-xs text-rose-400">Error al cargar métricas</p>
                        <p className="text-[10px] text-zinc-600 mt-1 truncate">{error}</p>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpis.map((kpi, index) => (
                <KPICard key={kpi.id} kpi={kpi} index={index} isLoading={isLoading} />
            ))}
        </div>
    )
}

// Contorno, brillo y acento por tarjeta (clases completas para que Tailwind las detecte)
const CARD_STYLE: Record<Color, { border: string, glow: string, accent: string, icon: string }> = {
    emerald: {
        border: 'border-emerald-500/30 hover:border-emerald-400/70',
        glow: 'hover:shadow-[0_0_28px_-6px_rgba(16,185,129,0.45)]',
        accent: 'from-emerald-500/0 via-emerald-400 to-emerald-500/0',
        icon: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
    },
    blue: {
        border: 'border-blue-500/30 hover:border-blue-400/70',
        glow: 'hover:shadow-[0_0_28px_-6px_rgba(59,130,246,0.45)]',
        accent: 'from-blue-500/0 via-blue-400 to-blue-500/0',
        icon: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
    },
    rose: {
        border: 'border-rose-500/30 hover:border-rose-400/70',
        glow: 'hover:shadow-[0_0_28px_-6px_rgba(244,63,94,0.45)]',
        accent: 'from-rose-500/0 via-rose-400 to-rose-500/0',
        icon: 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20',
    },
    violet: {
        border: 'border-violet-500/30 hover:border-violet-400/70',
        glow: 'hover:shadow-[0_0_28px_-6px_rgba(139,92,246,0.45)]',
        accent: 'from-violet-500/0 via-violet-400 to-violet-500/0',
        icon: 'bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20',
    },
}

const TONE: Record<string, string> = {
    muted: 'text-zinc-500',
    good: 'text-emerald-400',
    bad: 'text-rose-400',
    warn: 'text-amber-400',
}

function KPICard({ kpi, index, isLoading }: { kpi: KPI, index: number, isLoading: boolean }) {
    const style = CARD_STYLE[kpi.color]
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            transition={{ delay: index * 0.08, duration: 0.35 }}
            className={cn(
                'group relative overflow-hidden rounded-xl border bg-zinc-900/50 p-5 transition-[border-color,box-shadow,background-color] duration-300 hover:bg-zinc-900/80',
                style.border,
                style.glow,
            )}
        >
            {/* Acento superior que recorre la tarjeta */}
            <motion.div
                aria-hidden
                className={cn('absolute top-0 left-0 h-[2px] w-1/2 bg-gradient-to-r', style.accent)}
                initial={{ x: '-100%' }}
                animate={{ x: '220%' }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut', delay: index * 0.4, repeatDelay: 1.2 }}
            />
            <div className="flex justify-between items-start mb-3">
                <motion.div
                    className={cn('p-2 rounded-lg transition-transform duration-300 group-hover:scale-110', style.icon)}
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: index * 0.3 }}
                >
                    <kpi.icon size={18} />
                </motion.div>
                <div className="relative group/hint">
                    <Info size={14} className="text-zinc-600 hover:text-zinc-300 cursor-help" />
                    <div className="pointer-events-none absolute right-0 top-5 z-20 w-56 rounded-lg border border-zinc-700 bg-zinc-950 p-2.5 text-[11px] leading-relaxed text-zinc-300 opacity-0 shadow-xl transition-opacity group-hover/hint:opacity-100">
                        {kpi.hint}
                    </div>
                </div>
            </div>

            <h3 className="text-sm font-medium text-zinc-400">{kpi.title}</h3>
            {isLoading ? (
                <div className="h-8 w-28 bg-zinc-800 rounded animate-pulse mt-1" />
            ) : (
                <motion.p
                    key={kpi.value}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={cn('text-2xl font-bold tracking-tight mt-0.5', kpi.isZero ? 'text-zinc-500' : 'text-white')}
                >
                    {kpi.value}
                </motion.p>
            )}

            {kpi.progress !== undefined && (
                <div className="mt-3 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500 transition-all duration-700" style={{ width: `${isLoading ? 0 : Math.min(100, kpi.progress)}%` }} />
                </div>
            )}

            <div className="mt-3 pt-3 border-t border-zinc-800/80 space-y-1.5">
                {kpi.rows.map(r => (
                    <div key={r.label} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-zinc-500 truncate">{r.label}</span>
                        {r.value && (
                            <span className={cn('font-medium tabular-nums', isLoading ? 'text-zinc-600' : TONE[r.tone || ''] || 'text-zinc-200')}>
                                {isLoading ? '—' : r.value}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    )
}
