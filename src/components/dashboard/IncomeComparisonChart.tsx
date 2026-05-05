'use client'

import { useState, useMemo, useEffect } from 'react'
import { 
    ComposedChart, 
    Bar, 
    Line,
    Area,
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
} from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar } from 'lucide-react'

interface IncomeComparisonChartProps {
    data: Array<{
        month: string
        total_cobrado: number
        total_pendiente: number
    }>
    isLoading?: boolean
}

export function IncomeComparisonChart({ data, isLoading }: IncomeComparisonChartProps) {
    const [viewRange, setViewRange] = useState<number>(6)
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const chartData = useMemo(() => {
        if (!data || data.length === 0) return []
        
        // Filter out items with no data if they are at the beginning
        let processed = data.map(item => ({
            ...item,
            total_sum: Number(item.total_cobrado || 0) + Number(item.total_pendiente || 0)
        }))

        // Take last viewRange
        return processed.slice(-viewRange)
    }, [data, viewRange])

    if (!isMounted) return <div className="h-[320px] bg-zinc-900/50 rounded-3xl animate-pulse" />

    if (isLoading) {
        return (
            <div className="h-[320px] w-full flex items-end justify-between px-4 gap-3 animate-pulse pt-10">
                {[40, 70, 45, 90, 65, 30].map((height, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                        <div className="w-full bg-zinc-800/40 rounded-t-xl" style={{ height: `${height}%` }}></div>
                        <div className="w-8 h-3 bg-zinc-800/40 rounded mt-2"></div>
                    </div>
                ))}
            </div>
        )
    }

    if (chartData.length === 0) {
        return (
            <div className="h-[320px] flex flex-col items-center justify-center text-zinc-500 text-sm italic gap-4 border border-dashed border-zinc-800 rounded-3xl">
                <Calendar className="h-8 w-8 opacity-20" />
                Sin datos registrados
            </div>
        )
    }

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const cobrado = payload.find((p: any) => p.dataKey === 'total_cobrado')?.value || 0
            const pendiente = payload.find((p: any) => p.dataKey === 'total_pendiente')?.value || 0
            
            return (
                <div className="bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl shadow-2xl shadow-indigo-500/10 min-w-[200px] z-50">
                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mb-4">{label}</p>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-emerald-400 text-xs font-medium">Cobrado</span>
                            <span className="text-white font-bold text-sm">${cobrado.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-amber-400 text-xs font-medium">Pendiente</span>
                            <span className="text-white font-bold text-sm">${pendiente.toLocaleString()}</span>
                        </div>
                        <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                            <span className="text-zinc-400 text-xs font-black">TOTAL</span>
                            <span className="text-indigo-400 font-black text-sm">${(cobrado + pendiente).toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <div className="relative h-[350px] w-full flex flex-col">
            {/* Range Selectors */}
            <div className="absolute top-[-50px] right-0 z-10 flex items-center gap-1 bg-zinc-900/50 border border-white/5 p-1 rounded-full">
                {[3, 6, 12].map((range) => (
                    <button
                        key={range}
                        onClick={() => setViewRange(range)}
                        className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${
                            viewRange === range 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {range === 12 ? '1A' : `${range}M`}
                    </button>
                ))}
            </div>

            <div className="flex-1 w-full min-h-[250px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="barCob" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" />
                                <stop offset="100%" stopColor="#059669" />
                            </linearGradient>
                            <linearGradient id="barPen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="#d97706" />
                            </linearGradient>
                        </defs>
                        
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                        
                        <XAxis 
                            dataKey="month" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#52525b', fontSize: 10, fontWeight: 700 }}
                            dy={10}
                        />
                        
                        <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#52525b', fontSize: 10 }}
                            tickFormatter={(v) => `$${v >= 1000 ? (v/1000).toFixed(0) + 'k' : v}`}
                        />
                        
                        <Tooltip 
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        />

                        <Area
                            type="monotone"
                            dataKey="total_sum"
                            fill="url(#areaGrad)"
                            stroke="transparent"
                        />

                        <Bar 
                            dataKey="total_cobrado" 
                            stackId="a" 
                            fill="url(#barCob)" 
                            barSize={viewRange === 12 ? 15 : 35} 
                        />
                        <Bar 
                            dataKey="total_pendiente" 
                            stackId="a" 
                            fill="url(#barPen)" 
                            radius={[6, 6, 0, 0]} 
                            barSize={viewRange === 12 ? 15 : 35} 
                        />

                        <Line
                            type="monotone"
                            dataKey="total_sum"
                            stroke="#6366f1"
                            strokeWidth={3}
                            dot={{ fill: '#6366f1', r: 4, strokeWidth: 2, stroke: '#18181b' }}
                            activeDot={{ r: 6, fill: '#fff' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-center gap-8 mt-6">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cobrado</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pendiente</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Tendencia</span>
                </div>
            </div>
        </div>
    )
}
