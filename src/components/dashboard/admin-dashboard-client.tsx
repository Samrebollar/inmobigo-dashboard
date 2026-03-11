'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DollarSign, Building, Users, Activity, TrendingUp, Home, Wrench } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'

interface AdminDashboardClientProps {
    userEmail?: string
    userName?: string
    stats: {
        totalFacturado: number
        totalCobrado: number
        facturasVencidas: number
        activeCount: number
        totalUnits: number
        tasaCobranza: string
    }
}

export default function AdminDashboardClient({ userEmail, userName, stats }: AdminDashboardClientProps) {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <DashboardHeader userEmail={userEmail} userName={userName} />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-8"
            >
                {/* Stats Grid */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
                >
                    <motion.div variants={item} whileHover={{ y: -5 }}>
                        <Card className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Ingresos Totales</CardTitle>
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">${stats.totalFacturado.toLocaleString()}</div>
                                <p className="text-xs text-emerald-500 flex items-center mt-1">
                                    <TrendingUp className="h-3 w-3 mr-1" /> +20.1% vs mes anterior
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item} whileHover={{ y: -5 }}>
                        <Card className="bg-zinc-900 border-zinc-800 hover:border-indigo-500/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Propiedades Activas</CardTitle>
                                <Building className="h-4 w-4 text-indigo-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats.activeCount}</div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    {stats.totalUnits} unidades totales
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item} whileHover={{ y: -5 }}>
                        <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Tasa de Cobranza</CardTitle>
                                <Activity className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats.tasaCobranza}%</div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Global del periodo
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item} whileHover={{ y: -5 }}>
                        <Card className="bg-zinc-900 border-zinc-800 hover:border-rose-500/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Morosidad</CardTitle>
                                <Users className="h-4 w-4 text-rose-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-white">{stats.facturasVencidas}</div>
                                <p className="text-xs text-rose-500 mt-1">
                                    Facturas vencidas
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-7">
                    {/* Main Chart Section */}
                    <motion.div variants={item} className="lg:col-span-4">
                        <Card className="h-full bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle>Resumen de Ingresos</CardTitle>
                                <CardDescription>Comportamiento de cobros en los últimos 6 meses.</CardDescription>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <div className="h-[200px] md:h-[240px] w-full flex items-end justify-between px-4 gap-1 md:gap-2">
                                    {[45, 60, 55, 70, 65, 80].map((h, i) => (
                                        <div key={i} className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 rounded-t-sm relative group transition-all" style={{ height: `${h}%` }}>
                                            <div className="absolute bottom-0 w-full bg-indigo-600 rounded-t-sm transition-all group-hover:bg-indigo-500" style={{ height: `${h / 2}%` }}></div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between mt-2 px-4 text-[10px] md:text-xs text-zinc-500">
                                    <span>Ene</span><span>Feb</span><span>Mar</span><span>Abr</span><span>May</span><span>Jun</span>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div variants={item} className="lg:col-span-3">
                        <Card className="h-full bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                <CardTitle>Actividad Reciente</CardTitle>
                                <CardDescription>Últimos movimientos registrados.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="flex items-center gap-3 md:gap-4 p-3 rounded-lg hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-800">
                                            <div className="h-8 w-8 md:h-9 md:h-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0">
                                                <DollarSign className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <p className="text-sm font-medium text-white truncate">Pago Recibido</p>
                                                <p className="text-xs text-zinc-500 truncate">Torre Reforma - A-10{i}</p>
                                            </div>
                                            <div className="text-sm font-bold text-emerald-400">+$2,500</div>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="ghost" className="w-full mt-4 text-xs text-zinc-400 hover:text-white">Ver todo</Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Quick Actions */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4"
                >
                    <Link href="/dashboard/properties">
                        <motion.div variants={item} whileHover={{ y: -5 }} className="h-full">
                            <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-indigo-500/50 transition-colors cursor-pointer group">
                                <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center h-full">
                                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                        <Building className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">Nuevo Condominio</h3>
                                        <p className="text-xs text-zinc-500 mt-1">Registra una nueva propiedad</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/finance">
                        <motion.div variants={item} whileHover={{ y: -5 }} className="h-full">
                            <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors cursor-pointer group">
                                <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center h-full">
                                    <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                        <DollarSign className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">Registrar Pago</h3>
                                        <p className="text-xs text-zinc-500 mt-1">Ingresa un cobro manual</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/settings">
                        <motion.div variants={item} whileHover={{ y: -5 }} className="h-full">
                            <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors cursor-pointer group">
                                <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center h-full">
                                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">Invitar Usuario</h3>
                                        <p className="text-xs text-zinc-500 mt-1">Agrega colaboradores</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Link>

                    <Link href="/dashboard/reports">
                        <motion.div variants={item} whileHover={{ y: -5 }} className="h-full">
                            <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer group">
                                <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center h-full">
                                    <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-zinc-700 group-hover:text-white transition-all">
                                        <Activity className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">Ver Reportes</h3>
                                        <p className="text-xs text-zinc-500 mt-1">Análisis detallado</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Link>
                </motion.div>
            </motion.div>
        </div>
    )
}
