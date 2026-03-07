'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts'
import { motion } from 'framer-motion'
import { useState } from 'react'

const data = [
    { name: 'Ene', income: 40000, invoiced: 45000, pending: 5000 },
    { name: 'Feb', income: 35000, invoiced: 42000, pending: 7000 },
    { name: 'Mar', income: 48000, invoiced: 50000, pending: 2000 },
    { name: 'Abr', income: 42000, invoiced: 48000, pending: 6000 },
    { name: 'May', income: 52000, invoiced: 55000, pending: 3000 },
    { name: 'Jun', income: 58000, invoiced: 60000, pending: 2000 },
]

export function RevenueChart() {
    const [filter, setFilter] = useState<'monthly' | 'quarterly'>('monthly')

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-white">Flujo de Ingresos</h3>
                    <p className="text-sm text-zinc-400">Comparativa de facturado vs cobrado</p>
                </div>

                {/* Custom Tab Switcher */}
                <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-zinc-700/50">
                    <button
                        onClick={() => setFilter('monthly')}
                        className={`text-xs px-3 py-1.5 rounded-md transition-all ${filter === 'monthly' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                    >
                        Mensual
                    </button>
                    <button
                        onClick={() => setFilter('quarterly')}
                        className={`text-xs px-3 py-1.5 rounded-md transition-all ${filter === 'quarterly' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-300'}`}
                    >
                        Trimestral
                    </button>
                </div>
            </div>

            <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#71717a"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#71717a"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${value / 1000}k`}
                        />
                        <Tooltip
                            cursor={{ fill: '#27272a', opacity: 0.4 }}
                            contentStyle={{
                                backgroundColor: '#18181b',
                                borderColor: '#27272a',
                                borderRadius: '8px',
                                color: '#fff',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                            }}
                            itemStyle={{ fontSize: '12px' }}
                            formatter={(value: any) => [`$${value.toLocaleString()}`, '']}
                        />
                        <Legend
                            verticalAlign="top"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ paddingBottom: '20px', fontSize: '12px', color: '#a1a1aa' }}
                        />
                        <Bar
                            dataKey="invoiced"
                            name="Facturado"
                            fill="#3b82f6"
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                            fillOpacity={0.8}
                        />
                        <Bar
                            dataKey="income"
                            name="Cobrado"
                            fill="#10b981"
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                            fillOpacity={0.8}
                        />
                        <Bar
                            dataKey="pending"
                            name="Pendiente"
                            fill="#f43f5e"
                            radius={[4, 4, 0, 0]}
                            barSize={30}
                            fillOpacity={0.8}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    )
}
