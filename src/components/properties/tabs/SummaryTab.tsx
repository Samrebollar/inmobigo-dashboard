'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueChart } from '@/components/finance/revenue-chart'
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Users } from 'lucide-react'

// Mock Data for Charts
const occupancyData = [
    { name: 'Ene', value: 65 },
    { name: 'Feb', value: 70 },
    { name: 'Mar', value: 75 },
    { name: 'Abr', value: 72 },
    { name: 'May', value: 80 },
    { name: 'Jun', value: 85 },
]

const revenueData = [
    { name: 'Ene', value: 12000 },
    { name: 'Feb', value: 15000 },
    { name: 'Mar', value: 18000 },
    { name: 'Abr', value: 16000 },
    { name: 'May', value: 21000 },
    { name: 'Jun', value: 25000 },
]

export function SummaryTab() {
    return (
        <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total Ingresos Est.</CardTitle>
                        <TrendingUp className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">$45,231.89</div>
                        <p className="text-xs text-zinc-500">+20.1% vs mes anterior</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Morosidad</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">$1,250.00</div>
                        <p className="text-xs text-zinc-500">3 residentes con deuda</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Ocupación</CardTitle>
                        <Users className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">85%</div>
                        <p className="text-xs text-zinc-500">+2% vs mes anterior</p>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Tickets Activos</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-white">12</div>
                        <p className="text-xs text-zinc-500">5 alta prioridad</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Revenue Chart */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Histórico de Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <RevenueChart />
                    </CardContent>
                </Card>

                {/* Occupancy Chart (Mocked as customized RevenueChart for now since we don't have a dedicated generic chart component yet) */}
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Ocupación (Últimos 6 meses)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[350px] flex items-center justify-center text-zinc-500">
                            {/* Placeholder for a line chart specifically for occupancy */}
                            Gráfico de Ocupación (Comming Soon)
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity / Alerts */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Alertas Recientes</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
