'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { createClient } from '@/utils/supabase/client'
import { differenceInDays, parseISO } from 'date-fns'

interface AgingData {
    name: string
    value: number
    color: string
    description: string
}

export function AgingSummary({ condominiumId }: { condominiumId: string }) {
    const [data, setData] = useState<AgingData[]>([])
    const [totalDebt, setTotalDebt] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        if (!condominiumId || condominiumId.startsWith('demo-')) {
            // Mock data
            setData([
                { name: '1-15 días', value: 3500, color: '#10b981', description: 'Deuda corriente' }, // emerald-500
                { name: '16-30 días', value: 8500, color: '#eab308', description: 'Atraso leve' }, // yellow-500
                { name: '31-60 días', value: 12000, color: '#f97316', description: 'Atraso moderado' }, // orange-500
                { name: '+60 días', value: 4900, color: '#f43f5e', description: 'Cartera vencida crítica' } // rose-500
            ])
            setTotalDebt(28900)
            setLoading(false)
            return
        }

        const fetchAging = async () => {
            try {
                const { data: invoices, error } = await supabase
                    .from('invoices')
                    .select('amount, balance_due, due_date, status')
                    .eq('condominium_id', condominiumId)
                    .or('status.eq.pending,status.eq.overdue,balance_due.gt.0')

                if (error) throw error

                let buckets = [0, 0, 0, 0] // [1-15, 16-30, 31-60, 60+]
                let total = 0
                const now = new Date()

                if (invoices) {
                    invoices.forEach(inv => {
                        const amount = inv.balance_due && inv.balance_due > 0 ? inv.balance_due : (inv.amount || 0)
                        if (amount <= 0) return

                        const dueDate = inv.due_date ? parseISO(inv.due_date) : now
                        // Calculate days strictly as difference from today
                        let maxDays = 0
                        if (inv.status === 'overdue' || (inv.status === 'pending' && dueDate < now)) {
                            maxDays = differenceInDays(now, dueDate)
                            maxDays = Math.max(0, maxDays)
                        } else if (inv.status === 'pending' && dueDate >= now) {
                             // Not overdue yet, but has pending balance, count as 0-15 bucket for now
                             maxDays = 0 
                        } else {
                             // Default fallback
                             maxDays = 0
                        }

                        total += amount

                        if (maxDays <= 15) {
                            buckets[0] += amount
                        } else if (maxDays <= 30) {
                            buckets[1] += amount
                        } else if (maxDays <= 60) {
                            buckets[2] += amount
                        } else {
                            buckets[3] += amount
                        }
                    })
                }

                setData([
                    { name: '0-15 días', value: buckets[0], color: '#10b981', description: 'Deuda corriente' },
                    { name: '16-30 días', value: buckets[1], color: '#eab308', description: 'Atraso leve' },
                    { name: '31-60 días', value: buckets[2], color: '#f97316', description: 'Atraso moderado' },
                    { name: '+60 días', value: buckets[3], color: '#f43f5e', description: 'Cartera vencida crítica' }
                ])
                setTotalDebt(total)

            } catch (err) {
                console.error("Error fetching aging summary:", err)
            } finally {
                setLoading(false)
            }
        }

        fetchAging()
    }, [condominiumId, supabase])

    if (loading) {
        return (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col h-full animate-pulse">
                <div className="h-6 w-1/2 bg-zinc-800 rounded mb-6"></div>
                <div className="flex-1 rounded-full bg-zinc-800/50 mx-auto aspect-square w-48 mb-6"></div>
                <div className="space-y-3">
                    <div className="h-10 w-full bg-zinc-800 rounded"></div>
                    <div className="h-10 w-full bg-zinc-800 rounded"></div>
                </div>
            </div>
        )
    }

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg shadow-xl">
                    <p className="text-sm font-medium text-white mb-1">{payload[0].name}</p>
                    <p className="text-xs text-zinc-400 mb-2">{payload[0].payload.description}</p>
                    <p className="font-bold text-sm" style={{ color: payload[0].payload.color }}>
                        ${payload[0].value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col h-full w-full"
        >
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">Antigüedad de Saldos</h3>
            </div>
            <p className="text-xs text-zinc-400 mb-6">Distribución de deuda por días vencidos.</p>

            {totalDebt === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="h-32 w-32 rounded-full border-8 border-emerald-500/20 flex items-center justify-center mb-4">
                        <span className="text-emerald-500 font-bold text-xl">100%</span>
                    </div>
                    <p className="text-sm font-medium text-emerald-400">Totalmente al día</p>
                    <p className="text-xs text-zinc-500 mt-1">No hay saldos pendientes.</p>
                </div>
            ) : (
                <>
                    <div className="flex-1 min-h-[150px] relative flex justify-center items-center">
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie
                                    data={data.filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {data.filter(d => d.value > 0).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center text in donut */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs text-zinc-500 uppercase font-bold tracking-widest mt-1">Total</span>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3 pt-4 border-t border-zinc-800">
                        {data.map((item, i) => {
                            if (item.value === 0) return null
                            const percentage = Math.round((item.value / totalDebt) * 100)
                            return (
                                <div key={i} className="flex items-center justify-between text-sm group hover:bg-zinc-800/40 p-1.5 rounded transition-colors cursor-default">
                                    <div className="flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                                        <span className="text-zinc-300 font-medium">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs text-zinc-500">{percentage}%</span>
                                        <span className="font-bold min-w-[70px] text-right" style={{ color: item.color }}>
                                            ${item.value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </motion.div>
    )
}
