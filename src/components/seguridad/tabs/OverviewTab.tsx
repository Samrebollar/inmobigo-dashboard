'use client'

import { motion } from 'framer-motion'
import { TrendingUp, Users, Wallet, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

const data = [
    { name: 'Ene', ocupacion: 65, prediccion: 68 },
    { name: 'Feb', ocupacion: 70, prediccion: 72 },
    { name: 'Mar', ocupacion: 72, prediccion: 75 },
    { name: 'Abr', ocupacion: 75, prediccion: 78 },
    { name: 'May', ocupacion: 78, prediccion: 80 },
    { name: 'Jun', ocupacion: 82, prediccion: 85 },
    { name: 'Jul', ocupacion: 85, prediccion: 88 },
]

export function OverviewTab() {
    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Health Score */}
                <Card className="p-6 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm relative overflow-hidden">
                    <h3 className="text-lg font-semibold text-white mb-4">Salud del Condominio</h3>
                    <div className="flex items-center justify-center relative h-40">
                        <svg className="w-full h-full" viewBox="0 0 100 50">
                            <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#27272a" strokeWidth="8" strokeLinecap="round" />
                            <motion.path
                                d="M 10 50 A 40 40 0 0 1 90 50"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray="126"
                                strokeDashoffset="20"
                                initial={{ strokeDashoffset: 126 }}
                                animate={{ strokeDashoffset: 20 }}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                            />
                        </svg>
                        <div className="absolute inset-x-0 bottom-0 text-center">
                            <span className="text-4xl font-bold text-white">85</span>
                            <span className="text-sm text-zinc-500 block">Excelente</span>
                        </div>
                    </div>
                    <p className="text-sm text-zinc-400 mt-2 text-center">
                        Basado en ocupación, pagos y reportes.
                    </p>
                </Card>

                {/* Occupancy Prediction */}
                <Card className="col-span-2 p-6 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Predicción de Ocupación</h3>
                            <p className="text-sm text-zinc-400">Proyección para los próximos meses basada en tendencias.</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="flex items-center gap-1 text-emerald-400">
                                <TrendingUp className="h-4 w-4" /> +5%
                            </span>
                        </div>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data}>
                                <defs>
                                    <linearGradient id="colorOcupacion" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="ocupacion" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorOcupacion)" />
                                <Line type="monotone" dataKey="prediccion" stroke="#a1a1aa" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Insights & Actions */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="p-6 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-indigo-400" />
                        Resumen Financiero
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <span className="text-zinc-400">Ingresos Totales (Mes)</span>
                            <span className="text-white font-medium">$124,500.00</span>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                            <span className="text-zinc-400">Pendiente de Cobro</span>
                            <span className="text-amber-400 font-medium">$12,300.00</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[85%]" />
                        </div>
                        <p className="text-xs text-zinc-500 text-right">85% Recaudado</p>
                    </div>
                </Card>

                <Card className="p-6 bg-zinc-900/50 border-zinc-800 backdrop-blur-sm">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        Alertas Activas
                    </h3>
                    <div className="space-y-3">
                        <div className="flex gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-amber-200">Morosidad Elevada</h4>
                                <p className="text-xs text-amber-500/80">3 unidades tienen más de 2 meses de atraso.</p>
                            </div>
                        </div>
                        <div className="flex gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                            <Users className="h-5 w-5 text-blue-500 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-medium text-blue-200">Nuevos Residentes</h4>
                                <p className="text-xs text-blue-500/80">2 mudanzas programadas para esta semana.</p>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )
}

