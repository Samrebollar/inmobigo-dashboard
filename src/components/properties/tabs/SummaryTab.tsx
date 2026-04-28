'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueChart } from '@/components/finance/revenue-chart'
import { Activity, AlertTriangle, CheckCircle2, TrendingUp, Users } from 'lucide-react'
import { Condominium } from '@/types/properties'
import { demoDb } from '@/utils/demo-db'
import { motion } from 'framer-motion'
import { useUserRole } from '@/hooks/use-user-role'
import { createClient } from '@/utils/supabase/client'

interface SummaryTabProps {
    condo: Condominium
    revenueData?: any[]
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

export function SummaryTab({ condo, revenueData = [] }: SummaryTabProps) {
    const { isPropiedades } = useUserRole()
    const isDemo = condo.id.startsWith('demo-')
    
    // Real State for Metrics
    const [metrics, setMetrics] = useState({
        recaudado: 0,
        porCobrar: 0,
        vencido: 0,
        morosos: 0
    })

    useEffect(() => {
        if (!condo.id || isDemo) return
        
        const fetchMetrics = async () => {
            const supabase = createClient()
            
            // 1. Fetch Invoices
            const { data: invoices } = await supabase
                .from('invoices')
                .select('amount, paid_amount, balance_due, resident_id, status')
                .eq('condominium_id', condo.id)

            // 2. Fetch Residents
            const { data: residents } = await supabase
                .from('residents')
                .select('id, debt_amount')
                .eq('condominium_id', condo.id)

            const totalRecaudado = invoices?.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0) || 0;
            
            const invoicesDebtSum = invoices?.filter(i => i.status === 'pending' || i.status === 'overdue' || (i.balance_due || 0) > 0)
                .reduce((acc, curr) => acc + (curr.balance_due && curr.balance_due > 0 ? curr.balance_due : (curr.amount || 0)), 0) || 0;
            const residentsDebtSum = residents?.reduce((acc, curr) => acc + Number(curr.debt_amount || 0), 0) || 0;
            const totalVencido = invoicesDebtSum + residentsDebtSum;

            const overdueInvoices = invoices?.filter(i => i.status === 'pending' || i.status === 'overdue' || (i.balance_due && i.balance_due > 0)) || []
            const uniqueMorosos = new Set(overdueInvoices.map(item => item.resident_id).filter(Boolean))
            residents?.forEach(r => {
                if (Number(r.debt_amount || 0) > 0) {
                    uniqueMorosos.add(r.id)
                }
            })

            setMetrics({
                recaudado: totalRecaudado,
                porCobrar: totalVencido,
                vencido: totalVencido,
                morosos: uniqueMorosos.size
            })
        }
        
        fetchMetrics()
    }, [condo.id, isDemo])
    
    // Calculate Occupancy
    const residentsCount = isDemo ? demoDb.getResidents(condo.id).length : ((condo as any).residents_count || 0)
    const occRate = condo.units_total > 0 ? Math.min(100, Math.round((residentsCount / condo.units_total) * 100)) : 0

    // Metrics Values
    const ingresos = isDemo 
        ? "$45,231.89" 
        : `$${metrics.recaudado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    const incChange = isDemo ? "+20.1% vs mes anterior" : "Actualizado"
    
    const morosidad = isDemo 
        ? "$1,250.00" 
        : `$${metrics.vencido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    const morosidadSubtext = isDemo 
        ? `${isPropiedades ? '3 inquilinos con deuda' : '3 residentes con deuda'}` 
        : `${metrics.morosos} ${isPropiedades ? (metrics.morosos === 1 ? 'inquilino con deuda' : 'inquilinos con deuda') : (metrics.morosos === 1 ? 'residente con deuda' : 'residentes con deuda')}`
    
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
                            <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Ingresos Recaudados</CardTitle>
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
                            <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Morosidad Pendiente</CardTitle>
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
                        <RevenueChart organizationId={condo.organization_id} condominiumId={condo.id} />
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity / Alerts */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Alertas Morosidad</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0">
                        {((condo as any).alerts && (condo as any).alerts.length > 0) ? (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {(condo as any).alerts.map((alert: any) => (
                                    <div key={alert.id} className="flex items-center justify-between gap-4 rounded-xl bg-zinc-950/50 p-4 border border-zinc-800/50 hover:bg-zinc-900/80 transition-colors shadow-sm">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-rose-500/10 text-rose-500">
                                                <AlertTriangle className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{alert.title}</p>
                                                <p className="text-xs font-medium text-zinc-500 truncate mt-0.5">{alert.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-base font-bold text-rose-400">
                                                ${Number(alert.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-xs font-medium text-zinc-500 mt-0.5">{alert.timeText}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-zinc-800/80 bg-zinc-900/20">
                                <span className="text-sm text-zinc-500 font-medium">No hay alertas de morosidad</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0">
                        {((condo as any).recent_activity && (condo as any).recent_activity.length > 0) ? (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {(condo as any).recent_activity.map((activity: any) => (
                                    <div key={activity.id} className="flex items-center justify-between gap-4 rounded-xl bg-zinc-950/50 p-4 border border-zinc-800/50 hover:bg-zinc-900/80 transition-colors shadow-sm">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500">
                                                <CheckCircle2 className="h-5 w-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold text-white truncate">{activity.title}</p>
                                                <p className="text-xs font-medium text-zinc-500 truncate mt-0.5">{activity.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-base font-bold text-emerald-400">
                                                ${Number(activity.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            <p className="text-xs font-medium text-zinc-500 mt-0.5">{activity.timeText}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-32 items-center justify-center rounded-xl border-2 border-dashed border-zinc-800/80 bg-zinc-900/20">
                                <span className="text-sm text-zinc-500 font-medium">No hay actividad reciente</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
