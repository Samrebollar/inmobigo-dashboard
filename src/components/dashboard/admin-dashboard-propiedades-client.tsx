'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DollarSign, Building, Users, Activity, TrendingUp, Home, Wrench, AlertTriangle, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { financeService } from '@/services/finance-service'
import { dashboardService } from '@/services/dashboard-service'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { useUserRole } from '@/hooks/use-user-role'

import { PlanExpirationBanner } from '@/components/dashboard/PlanExpirationBanner'
import { IncomeComparisonChart } from '@/components/dashboard/IncomeComparisonChart'

interface AdminDashboardClientProps {
    userEmail?: string
    userName?: string
    daysRemaining?: number
    nextPaymentDate?: string
    stats: {
        totalFacturado: number
        totalCobrado: number
        facturasVencidas?: number
        deudaTotal?: number
        activeCount: number
        totalUnits: number
        tasaCobranza?: string
        incidenciasPendientes?: number
        anuncios?: number
    }
    recentActivity?: any[]
}

export default function AdminDashboardPropiedadesClient({ 
    userEmail, 
    userName, 
    daysRemaining = 999, 
    nextPaymentDate,
    stats, 
    recentActivity = [] 
}: AdminDashboardClientProps) {
    const isPropiedades = true
    const [totalIngresos, setTotalIngresos] = useState<number | null>(null)
    const [isLoadingIngresos, setIsLoadingIngresos] = useState(true)
    const [ingresosError, setIngresosError] = useState<string | null>(null)
    const [totalDeuda, setTotalDeuda] = useState<number | null>(null)
    const [isLoadingDeuda, setIsLoadingDeuda] = useState(true)
    const [deudaError, setDeudaError] = useState<string | null>(null)

    const [tasaCobranza, setTasaCobranza] = useState<number | null>(null)
    const [isLoadingTasa, setIsLoadingTasa] = useState(true)
    const [tasaError, setTasaError] = useState<string | null>(null)

    const [morosidad, setMorosidad] = useState<{ total_facturas_vencidas: number, monto_vencido: number } | null>(null)
    const [isLoadingMorosidad, setIsLoadingMorosidad] = useState(true)
    const [morosidadError, setMorosidadError] = useState<string | null>(null)

    const [incomeSummary, setIncomeSummary] = useState<Array<{ month: string, total_cobrado: number, total_pendiente: number }>>([])
    const [isLoadingIncome, setIsLoadingIncome] = useState(true)
    const [incomeError, setIncomeError] = useState<string | null>(null)

    const [condominiums, setCondominiums] = useState<Array<{ id: string, name: string }>>([])
    const [selectedCondoId, setSelectedCondoId] = useState<string>('')

    useEffect(() => {
        let isMounted = true
        const fetchIncome = async () => {
            try {
                setIsLoadingIncome(true)
                setIncomeError(null)
                const data = await financeService.getIncomeSummaryYear(selectedCondoId || undefined)
                if (isMounted) setIncomeSummary(data)
            } catch (err) {
                console.error(err)
                if (isMounted) setIncomeError('Error al cargar')
            } finally {
                if (isMounted) setIsLoadingIncome(false)
            }
        }
        fetchIncome()
        return () => { isMounted = false }
    }, [selectedCondoId])

    useEffect(() => {
        let isMounted = true
        const fetchIngresos = async () => {
            try {
                setIsLoadingIngresos(true)
                setIngresosError(null)
                const total = await financeService.getTotalIngresos()
                if (isMounted) setTotalIngresos(total)
            } catch (err) {
                console.error(err)
                if (isMounted) setIngresosError('Error al cargar')
            } finally {
                if (isMounted) setIsLoadingIngresos(false)
            }
        }
        const fetchDeuda = async () => {
            try {
                setIsLoadingDeuda(true)
                setDeudaError(null)
                const { total_deuda } = await dashboardService.getDeudaTotal()
                if (isMounted) setTotalDeuda(total_deuda)
            } catch (err) {
                console.error(err)
                if (isMounted) setDeudaError('Error al cargar')
            } finally {
                if (isMounted) setIsLoadingDeuda(false)
            }
        }
        const fetchTasa = async () => {
            try {
                setIsLoadingTasa(true)
                setTasaError(null)
                const tasa = await financeService.getTasaCobranza()
                if (isMounted) setTasaCobranza(tasa)
            } catch (err) {
                console.error(err)
                if (isMounted) setTasaError('Error al cargar')
            } finally {
                if (isMounted) setIsLoadingTasa(false)
            }
        }
        const fetchMorosidad = async () => {
            try {
                setIsLoadingMorosidad(true)
                setMorosidadError(null)
                const data = await financeService.getMorosidad()
                if (isMounted) setMorosidad(data)
            } catch (err) {
                console.error(err)
                if (isMounted) setMorosidadError('Error al cargar')
            } finally {
                if (isMounted) setIsLoadingMorosidad(false)
            }
        }
        const fetchIncome = async () => {
            try {
                setIsLoadingIncome(true)
                setIncomeError(null)
                // Usar getIncomeSummaryYear para consistencia con el dashboard de condominios
                const data = await financeService.getIncomeSummaryYear(selectedCondoId || undefined)
                if (isMounted) setIncomeSummary(data)
            } catch (err) {
                console.error(err)
                if (isMounted) setIncomeError('Error al cargar')
            } finally {
                if (isMounted) setIsLoadingIncome(false)
            }
        }
        const fetchCondos = async () => {
            const supabase = createClient()
            const { data } = await supabase.from('condominiums').select('id, name')
            if (isMounted && data) {
                setCondominiums(data)
            }
        }
        fetchIngresos()
        fetchDeuda()
        fetchTasa()
        fetchMorosidad()
        fetchCondos()
        return () => { isMounted = false }
    }, [])

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
        <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
            <DashboardHeader userEmail={userEmail} userName={userName} />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-8"
            >
                <PlanExpirationBanner dias={daysRemaining || 0} />

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <motion.div variants={item} whileHover={{ y: -5 }}>
                        <Card className="bg-zinc-900 border-zinc-800 hover:border-emerald-500/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Ingresos Totales</CardTitle>
                                <DollarSign className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                {isLoadingIngresos ? (
                                    <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded mt-1"></div>
                                ) : ingresosError ? (
                                    <div className="text-sm font-medium text-rose-500 mt-2">{ingresosError}</div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold text-white">
                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalIngresos || 0)}
                                        </div>
                                        <p className="text-xs text-emerald-500 flex items-center mt-1">
                                            <TrendingUp className="h-3 w-3 mr-1" /> +20.1% vs mes anterior
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    <motion.div variants={item} whileHover={{ y: -5 }}>
                        <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/50 transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium text-zinc-400">Deuda Total</CardTitle>
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                            </CardHeader>
                            <CardContent>
                                {isLoadingDeuda ? (
                                    <div className="h-8 w-24 bg-zinc-800 animate-pulse rounded mt-1"></div>
                                ) : deudaError ? (
                                    <div className="text-sm font-medium text-rose-500 mt-2">{deudaError}</div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold text-white">
                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(totalDeuda || 0)}
                                        </div>
                                        <p className="text-xs text-amber-500 mt-1">
                                            Monto vencido total
                                        </p>
                                    </>
                                )}
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
                                {isLoadingTasa ? (
                                    <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded mt-1"></div>
                                ) : tasaError ? (
                                    <div className="text-sm font-medium text-rose-500 mt-2">{tasaError}</div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold text-white">{tasaCobranza !== null ? tasaCobranza.toFixed(1) : '0.0'}%</div>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Global del periodo
                                        </p>
                                    </>
                                )}
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
                                {isLoadingMorosidad ? (
                                    <div className="h-8 w-16 bg-zinc-800 animate-pulse rounded mt-1"></div>
                                ) : morosidadError ? (
                                    <div className="text-sm font-medium text-rose-500 mt-2">{morosidadError}</div>
                                ) : (
                                    <>
                                        <div className="text-2xl font-bold text-white">{morosidad?.total_facturas_vencidas || 0}</div>
                                        <p className="text-xs text-rose-500 mt-1">
                                            {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(morosidad?.monto_vencido || 0)} vencido
                                        </p>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>

            <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 lg:grid-cols-7">
                    {/* Main Chart Section */}
                    <motion.div variants={item} className="lg:col-span-4">
                        <Card className="h-full bg-zinc-900 border-zinc-800">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-white">Resumen de Ingresos</CardTitle>
                                    <CardDescription className="text-zinc-400">Balance anual de cobros vs pendientes.</CardDescription>
                                </div>
                                <select 
                                    className="bg-zinc-950 border border-zinc-800 text-sm rounded px-2 py-1 text-zinc-300 outline-none focus:border-indigo-500 max-w-[150px] md:max-w-[200px] truncate"
                                    value={selectedCondoId}
                                    onChange={(e) => setSelectedCondoId(e.target.value)}
                                >
                                    <option value="">Global (todas las propiedades)</option>
                                    {condominiums.map(condo => (
                                        <option key={condo.id} value={condo.id}>{condo.name}</option>
                                    ))}
                                </select>
                            </CardHeader>
                            <CardContent className="pl-2">
                                <IncomeComparisonChart 
                                    data={incomeSummary} 
                                    isLoading={isLoadingIncome} 
                                />
                                
                                {incomeError && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-10">
                                        <div className="text-rose-500 text-sm flex flex-col items-center gap-2">
                                            <AlertTriangle className="h-5 w-5" />
                                            <span>{incomeError}</span>
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedCondoId(selectedCondoId)} className="mt-2 text-zinc-400 hover:text-white">Reintentar</Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Recent Activity */}
                    <motion.div variants={item} className="lg:col-span-3">
                        <Card className="h-full bg-zinc-900 border-zinc-800">
                            <CardHeader>
                                {/* Re-imported missing icons at the top of file later if needed, assuming Wrench, Users, etc. are already imported */}
                                <CardTitle className="text-white">
                                    {isPropiedades ? 'Actividad de la propiedad' : 'Actividad del condominio'}
                                </CardTitle>
                                <CardDescription className="text-zinc-400">Últimos movimientos registrados.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {recentActivity && recentActivity.length > 0 ? (
                                        recentActivity.map((activity, i) => {
                                            // Determine styles and icons based on type
                                            let Icon = Activity;
                                            let colorClass = 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/20';
                                            let textClass = 'text-zinc-400';
                                            
                                            switch (activity.type) {
                                                case 'payment':
                                                    Icon = DollarSign;
                                                    colorClass = 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
                                                    textClass = 'text-emerald-400';
                                                    break;
                                                case 'overdue':
                                                    Icon = Activity; // Or AlertCircle
                                                    colorClass = 'bg-rose-500/10 text-rose-500 border border-rose-500/20';
                                                    textClass = 'text-rose-400';
                                                    break;
                                                case 'incident':
                                                    Icon = Wrench;
                                                    colorClass = 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
                                                    textClass = 'text-amber-400';
                                                    break;
                                                case 'resident':
                                                    Icon = Users; // Or UserPlus
                                                    colorClass = 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
                                                    textClass = 'text-blue-400';
                                                    break;
                                            }

                                            return (
                                            <motion.div 
                                                key={activity.id} 
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                whileHover={{ scale: 1.02, backgroundColor: 'rgba(39, 39, 42, 0.8)' }}
                                                className="flex items-center gap-3 md:gap-4 p-3 rounded-lg border border-transparent hover:border-zinc-700/50 bg-zinc-950/30 transition-all cursor-pointer group"
                                            >
                                                <div className={`h-8 w-8 md:h-10 md:w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${colorClass}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <p className="text-sm font-medium text-white truncate">
                                                        {activity.title}
                                                    </p>
                                                    <p className="text-xs text-zinc-500 truncate">
                                                        {activity.subtitle}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    {(activity.type === 'payment' || activity.type === 'overdue') && (
                                                        <div className={`text-sm font-bold ${textClass}`}>
                                                            {activity.type === 'payment' ? '+' : ''}${activity.amount?.toLocaleString()}
                                                        </div>
                                                    )}
                                                    <div className="text-[10px] text-zinc-600">
                                                        {new Date(activity.date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </motion.div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center p-6 text-sm text-zinc-500 bg-zinc-950/30 rounded-lg border border-zinc-800/50">
                                            No hay actividad reciente
                                        </div>
                                    )}
                                </div>
                                {recentActivity && recentActivity.length > 0 && (
                                    <Link href="/dashboard/finance">
                                        <Button variant="ghost" className="w-full mt-4 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800">Ver todo</Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>

                {/* Alertas Rápidas */}
                <div className="pt-2">
                    <h2 className="text-xl font-bold text-white mb-4">Alertas Rápidas</h2>
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid gap-4 md:grid-cols-2"
                    >
                        <Link href="/dashboard/morosos" className="block">
                            <motion.div variants={item} whileHover={{ y: -5 }}>
                                <Card className="bg-zinc-900 border-zinc-800 hover:border-amber-500/50 transition-colors cursor-pointer group h-full">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 flex-shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-all">
                                            <AlertTriangle className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-white">{morosidad?.total_facturas_vencidas || 0}</p>
                                            <p className="text-sm text-zinc-400">Pagos vencidos</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Link>

                        <Link href="/dashboard/maintenance" className="block">
                            <motion.div variants={item} whileHover={{ y: -5 }}>
                                <Card className="bg-zinc-900 border-zinc-800 hover:border-blue-500/50 transition-colors cursor-pointer group h-full">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                            <Wrench className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-white">{stats.incidenciasPendientes || 0}</p>
                                            <p className="text-sm text-zinc-400">Incidencias pendientes</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Link>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid gap-4 md:gap-6 grid-cols-2 lg:grid-cols-4"
                >
                    <Link href="/dashboard/propiedades">
                        <motion.div variants={item} whileHover={{ y: -5 }} className="h-full">
                            <Card className="h-full bg-zinc-900 border-zinc-800 hover:border-indigo-500/50 transition-colors cursor-pointer group">
                                <CardContent className="flex flex-col items-center justify-center p-6 gap-4 text-center h-full">
                                    <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                        <Building className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-white">
                                            {isPropiedades ? 'Nueva Propiedad' : 'Nuevo Condominio'}
                                        </h3>
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

                    <Link href="/dashboard/configuracion">
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

                    <Link href="/dashboard/reportes">
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
        </div>
    )
}
