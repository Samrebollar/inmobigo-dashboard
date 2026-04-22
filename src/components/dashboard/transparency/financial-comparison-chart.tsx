'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts'
import { motion } from 'framer-motion'

interface FinancialComparisonChartProps {
    data: {
        totalCollected: number
        totalExpenses: number
    }
}

export function FinancialComparisonChart({ data }: FinancialComparisonChartProps) {
    const chartData = [
        { name: 'Ingresos', value: data.totalCollected, color: '#10b981' },
        { name: 'Gastos', value: data.totalExpenses, color: '#f43f5e' }
    ]

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-full min-h-[300px] bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl flex flex-col gap-6"
        >
            <div className="flex flex-col gap-1">
                <h3 className="text-xl font-black text-white tracking-tight">Resumen Financiero</h3>
                <p className="text-zinc-500 text-sm">Comparativa visual entre lo recaudado y lo invertido este mes.</p>
            </div>

            <div className="flex-1 w-full min-h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0.2}/>
                            </linearGradient>
                            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8}/>
                                <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.2}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 12, fontWeight: 700 }}
                            dy={10}
                        />
                        <YAxis 
                            hide 
                        />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#18181b', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                borderRadius: '16px',
                                boxShadow: '0 20px 40px -12px rgba(0,0,0,0.5)'
                            }}
                            itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                            formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Bar 
                            dataKey="value" 
                            radius={[12, 12, 0, 0]}
                            barSize={60}
                            minPointSize={10}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.name === 'Ingresos' ? 'url(#incomeGradient)' : 'url(#expenseGradient)'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Ingresos</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Gastos</span>
                </div>
            </div>
        </motion.div>
    )
}
