'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueChart } from '@/components/finance/revenue-chart'
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Users } from 'lucide-react'
import { Condominium } from '@/types/properties'
import { demoDb } from '@/utils/demo-db'
import { motion } from 'framer-motion'

interface SummaryTabProps {
    condo: Condominium
}

// Mock Data for Charts


const revenueData = [
    { name: 'Ene', value: 12000 },
    { name: 'Feb', value: 15000 },
    { name: 'Mar', value: 18000 },
    { name: 'Abr', value: 16000 },
    { name: 'May', value: 21000 },
    { name: 'Jun', value: 25000 },
]

export function SummaryTab({ condo }: SummaryTabProps) {
    const isDemo = condo.id.startsWith('demo-')
    
    // Calculate Occupancy
    const residentsCount = isDemo ? demoDb.getResidents(condo.id).length : ((condo as any).residents_count || 0)
    const occRate = condo.units_total > 0 ? Math.min(100, Math.round((residentsCount / condo.units_total) * 100)) : 0

    // Demo overrides vs Real 0 state
    const ingresos = isDemo ? "$45,231.89" : "$0.00"
    const incChange = isDemo ? "+20.1% vs mes anterior" : "Aún sin datos"
    
    const morosidad = isDemo ? "$1,250.00" : "$0.00"
    const morosidadSubtext = isDemo ? "3 residentes con deuda" : "0 residentes con deuda"
    
    const occChange = isDemo ? "+2% vs mes anterior" : "Actualizado"

    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                    <Card className="bg-zinc-900 border-zinc-800 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.1)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Ocupación</CardTitle>
                            <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                                <Users className="h-4 w-4 text-indigo-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-2xl font-bold text-white">{occRate}%</div>
                            <p className={`text-xs mt-1 ${isDemo ? 'text-zinc-500' : 'text-zinc-600'}`}>{occChange}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                    <Card className="bg-zinc-900 border-zinc-800 transition-all duration-300 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Ingresos promedio por unidad</CardTitle>
                            <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className="text-2xl font-bold text-white">{ingresos}</div>
                            <p className={`text-xs mt-1 ${isDemo ? 'text-emerald-500' : 'text-zinc-500'}`}>{incChange}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                    <Card className="bg-zinc-900 border-zinc-800 transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Potencial de ingresos</CardTitle>
                            <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                                <AlertTriangle className="h-4 w-4 text-amber-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className={`text-2xl font-bold ${isDemo ? 'text-white' : 'text-zinc-300'}`}>{morosidad}</div>
                            <p className={`text-xs mt-1 ${isDemo ? 'text-zinc-500' : 'text-zinc-600'}`}>{morosidadSubtext}</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <div className="w-full">
                {/* Revenue Chart */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Histórico de Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <RevenueChart />
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity / Alerts */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Alertas Morosidad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isDemo ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-start gap-4 rounded-lg bg-zinc-950/50 p-3 border border-zinc-800/50">
                                        <div className="mt-1 rounded-full bg-rose-500/10 p-2 text-rose-500">
                                            <AlertTriangle className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Pago Vencido - Unidad A-10{i}</p>
                                            <p className="text-xs text-zinc-500">Hace 2 horas</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-zinc-800">
                                <span className="text-sm text-zinc-500">No hay alertas de morosidad</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isDemo ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="flex items-start gap-4 rounded-lg bg-zinc-950/50 p-3 border border-zinc-800/50">
                                        <div className="mt-1 rounded-full bg-emerald-500/10 p-2 text-emerald-500">
                                            <CheckCircle2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">Pago Recibido - Unidad B-20{i}</p>
                                            <p className="text-xs text-zinc-500">Hace {i * 5} minutos</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed border-zinc-800">
                                <span className="text-sm text-zinc-500">No hay actividad reciente</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
