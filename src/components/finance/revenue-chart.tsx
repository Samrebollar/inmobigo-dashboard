'use client'

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
    Legend
} from 'recharts'
import { motion } from 'framer-motion'
import { useState, useEffect, useMemo } from 'react'
import { Loader2, TrendingUp } from 'lucide-react'

// Fallback skeleton
const defaultData = [
    { mes: 'Ene', facturado: 0, cobrado: 0, pendiente: 0 },
    { mes: 'Feb', facturado: 0, cobrado: 0, pendiente: 0 },
    { mes: 'Mar', facturado: 0, cobrado: 0, pendiente: 0 },
]

export function RevenueChart({ organizationId, condominiumId }: { organizationId: string, condominiumId?: string }) {
    const [viewRange, setViewRange] = useState<number>(6)
    const [chartData, setChartData] = useState<any[] | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchChartData = async () => {
            try {
                setIsLoading(true)
                const params = new URLSearchParams()
                params.append('organization_id', organizationId)
                if (condominiumId) params.append('condominium_id', condominiumId)
                
                const res = await fetch(`/api/finance/revenue-chart?${params.toString()}`)
                if (res.ok) {
                    const data = await res.json()
                    setChartData(data)
                }
            } catch (e) {
                console.error('Error fetching revenue chart data', e)
            } finally {
                setIsLoading(false)
            }
        }
        fetchChartData()
    }, [condominiumId, organizationId])

    const filteredData = useMemo(() => {
        if (!chartData) return defaultData
        
        // Si el rango es de 1 año (12 meses), devolvemos el set completo (Ene-Dic)
        if (viewRange === 12) return chartData;
        
        // Para 3M y 6M, tomamos desde el mes actual hacia atrás
        const now = new Date()
        const currentMonthIndex = now.getMonth()
        return chartData.slice(0, currentMonthIndex + 1).slice(-viewRange)
    }, [chartData, viewRange])

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-950/90 backdrop-blur-2xl border border-white/10 p-4 rounded-2xl shadow-2xl z-50">
                    <p className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest mb-3">{label}</p>
                    <div className="space-y-2">
                        {payload.map((p: any, i: number) => (
                            <div key={i} className="flex items-center justify-between gap-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                    <span className="text-zinc-400 text-[11px]">{p.name}</span>
                                </div>
                                <span className="text-white font-bold text-[11px]">${p.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )
        }
        return null
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 relative overflow-hidden"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-indigo-400" />
                        <h3 className="text-base font-bold text-white tracking-tight">Flujo de Ingresos</h3>
                    </div>
                    <p className="text-xs text-zinc-500">Recaudación vs Pendientes en el tiempo</p>
                </div>

                <div className="flex items-center gap-1 bg-zinc-950/50 border border-white/5 p-1 rounded-full w-fit self-end md:self-auto">
                    {[3, 6, 12].map((range) => (
                        <button
                            key={range}
                            onClick={() => setViewRange(range)}
                            className={`px-4 py-1.5 text-[10px] font-black rounded-full transition-all ${
                                viewRange === range 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                    : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            {range === 12 ? '1A' : `${range}M`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-[300px] w-full relative">
                {isLoading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm rounded-lg">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCob" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                            </linearGradient>
                            <linearGradient id="colorPen" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.1}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.02)" vertical={false} />
                        <XAxis
                            dataKey="mes"
                            stroke="#52525b"
                            fontSize={10}
                            fontWeight={700}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#52525b"
                            fontSize={10}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                        <Legend 
                            verticalAlign="top" 
                            align="right"
                            height={30}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '20px' }}
                        />
                        
                        <Area
                            type="monotone"
                            dataKey="cobrado"
                            name="Cobrado"
                            fill="url(#colorCob)"
                            stroke="#10b981"
                            strokeWidth={2}
                        />
                        <Bar
                            dataKey="facturado"
                            name="Facturado"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            barSize={viewRange === 12 ? 15 : 25}
                            fillOpacity={0.3}
                        />
                        <Line
                            type="monotone"
                            dataKey="pendiente"
                            name="Pendiente"
                            stroke="#f43f5e"
                            strokeWidth={3}
                            dot={{ fill: '#f43f5e', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    )
}

