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
import { calculateCondoMonthlyFinancials, getLocalDateParts } from '@/utils/finance-utils'

interface SummaryTabProps {
    condo: Condominium
    revenueData?: any[]
}

export function SummaryTab({ condo, revenueData = [] }: SummaryTabProps) {
    const { isPropiedades } = useUserRole()
    const isDemo = condo.id.startsWith('demo-')
    
    const [metrics, setMetrics] = useState({
        recaudado: 0,
        porCobrar: 0,
        vencido: 0,
        morosos: 0
    })

    const [alerts, setAlerts] = useState<any[]>([])
    const [recentActivity, setRecentActivity] = useState<any[]>([])

    useEffect(() => {
        if (!condo.id || isDemo) return
        
        const fetchMetrics = async () => {
            const supabase = createClient()
            
            try {
                // Calculate current month's dynamic metrics
                const now = new Date()
                const currentMonth = now.getMonth()
                const currentYear = now.getFullYear()

                // 1. Fetch units — select unit_number for the alerts display
                const { data: unitsData, error: unitsError } = await supabase
                    .from('units')
                    .select('id, monto_mensual, facturacion_activa, unit_number')
                    .eq('condominium_id', condo.id)
                    .neq('billing_status', 'suspended')

                if (unitsError) throw unitsError

                // 2. Fetch residents — select id, first_name, last_name to build alert titles
                const { data: residentsData, error: residentsError } = await supabase
                    .from('residents')
                    .select('id, unit_id, first_name, last_name, fecha_ingreso, status')
                    .eq('condominium_id', condo.id)

                if (residentsError) throw residentsError

                // 3. Fetch resident invoices — include due_date so calculateCondoMonthlyFinancials
                // can assign each invoice to its correct billing month (due_date takes priority over created_at)
                const yearStart = new Date(currentYear, 0, 1).toISOString().substring(0, 10)
                const yearEnd = new Date(currentYear, 11, 31).toISOString().substring(0, 10)
                const { data: invoicesData, error: invoiceError } = await supabase
                    .from('resident_invoices')
                    .select('id, amount, balance_due, status, resident_id, unit_id, invoice_type, created_at, due_date, paid_at')
                    .eq('condominium_id', condo.id)
                    .gte('due_date', yearStart)
                    .lte('due_date', yearEnd)

                if (invoiceError) throw invoiceError

                const condoFinancials = calculateCondoMonthlyFinancials({
                    units: unitsData || [],
                    residents: residentsData || [],
                    invoices: invoicesData || [],
                    selectedMonth: currentMonth,
                    selectedYear: currentYear
                })

                setMetrics({
                    recaudado: condoFinancials.recaudado,
                    porCobrar: condoFinancials.porCobrar,
                    vencido: condoFinancials.vencido,
                    morosos: condoFinancials.morososCount
                })

                // Helper: invoice belongs to the current month by due_date
                const isCurrentMonth = (inv: any) => {
                    const dateStr = inv.due_date || inv.created_at
                    if (!dateStr) return false
                    const parts = getLocalDateParts(dateStr)
                    if (!parts) return false
                    return parts.year === currentYear && parts.month === currentMonth
                }

                const invoices = invoicesData || []
                const residents = residentsData || []
                const units = unitsData || []

                // Fast look-up maps
                const residentById   = new Map<string, any>(residents.map(r => [r.id, r]))
                const residentByUnit = new Map<string, any>()
                residents.filter(r => r.status === 'active' || r.status === 'delinquent').forEach(r => {
                    if (r.unit_id) residentByUnit.set(r.unit_id, r)
                })
                const unitById = new Map<string, any>(units.map(u => [u.id, u]))

                // ── Alertas Morosidad (mes actual) ────────────────────────
                const currentMonthInvoices = invoices.filter(isCurrentMonth)

                const overdueInvoices = currentMonthInvoices.filter(inv =>
                    (inv.status === 'overdue' || inv.status === 'pending') &&
                    Number(inv.balance_due || 0) > 0 &&
                    inv.invoice_type === 'maintenance'
                )

                // Deduplicate by unit — keep highest amount
                const alertsMap = new Map<string, any>()
                overdueInvoices.forEach(inv => {
                    const resident = inv.resident_id
                        ? (residentById.get(inv.resident_id) ?? residentByUnit.get(inv.unit_id))
                        : residentByUnit.get(inv.unit_id)

                    const unit = unitById.get(inv.unit_id || resident?.unit_id)
                    const unitNum = resident?.unit_number ?? unit?.unit_number ?? 'S/N'
                    const residentName = resident
                        ? `${resident.first_name ?? ''} ${resident.last_name ?? ''}`.trim()
                        : ''

                    if (!residentName) return

                    const dueDate    = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at)
                    const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24))
                    const timeText   = daysOverdue <= 0 ? 'Mes Actual' : `Hace ${daysOverdue} días`
                    const amount     = Number(inv.balance_due || inv.amount || 0)
                    const key        = inv.unit_id || resident?.unit_id || inv.id

                    if (!alertsMap.has(key) || alertsMap.get(key).amount < amount) {
                        alertsMap.set(key, {
                            id: inv.id,
                            title: residentName,
                            name: `Unidad ${unitNum}`,
                            amount,
                            timeText
                        })
                    }
                })

                setAlerts(Array.from(alertsMap.values()).sort((a, b) => b.amount - a.amount))

                // ── Actividad Reciente (pagos del mes actual) ─────────────
                const paidInvoices = currentMonthInvoices.filter(inv =>
                    inv.status === 'paid' || inv.status === 'completed'
                )

                const activity = paidInvoices.map(inv => {
                    const resident = inv.resident_id
                        ? (residentById.get(inv.resident_id) ?? residentByUnit.get(inv.unit_id))
                        : residentByUnit.get(inv.unit_id)

                    const unit     = unitById.get(inv.unit_id || resident?.unit_id)
                    const unitNum  = resident?.unit_number ?? unit?.unit_number ?? 'S/N'
                    const name     = resident
                        ? `${resident.first_name ?? ''} ${resident.last_name ?? ''}`.trim()
                        : 'Desconocido'

                    const activityDate = new Date(inv.paid_at || inv.created_at)
                    const daysAgo      = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 3600 * 24))
                    const timeText     = daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `Hace ${daysAgo} días`

                    return {
                        id: inv.id,
                        title: `Pago Recibido - Unidad ${unitNum}`,
                        name,
                        amount: Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0)),
                        timeText,
                        date: activityDate.getTime()
                    }
                })

                activity.sort((a, b) => b.date - a.date)
                setRecentActivity(activity.slice(0, 10))

            } catch (error: any) {
                console.error('[SummaryTab] fetchMetrics error:', error?.message || error?.details || error)
            }
        }
        
        fetchMetrics()
    }, [condo.id, isDemo])
    
    const residentsCount = isDemo ? demoDb.getResidents(condo.id).length : ((condo as any).residents_count || 0)
    const occRate = condo.units_total > 0 ? Math.min(100, Math.round((residentsCount / condo.units_total) * 100)) : 0

    const ingresos = isDemo 
        ? "$45,231.89" 
        : `$${metrics.recaudado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    const incChange = isDemo ? "+20.1% vs mes anterior" : "Actualizado"
    
    const morosidad = isDemo 
        ? "$1,250.00" 
        : `$${metrics.vencido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
    const morosidadSubtext = isDemo 
        ? `${isPropiedades ? '3 inquilinos con deuda' : '3 residentes con deuda'}` 
        : `${metrics.morosos} ${isPropiedades ? (metrics.morosos === 1 ? 'inquilino en atraso' : 'inquilinos en atraso') : (metrics.morosos === 1 ? 'residente en atraso' : 'residentes en atraso')}`
    
    const occChange = isDemo ? "+2% vs mes anterior" : "Actualizado"

    // Demo mode: fall back to page.tsx pre-computed data
    const displayAlerts   = isDemo ? ((condo as any).alerts || []) : alerts
    const displayActivity = isDemo ? ((condo as any).recent_activity || []) : recentActivity

    return (
        <div className="space-y-6">
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
                    <Card className="bg-zinc-900 border-zinc-800 transition-all duration-300 hover:border-rose-500/50 hover:shadow-[0_0_15px_rgba(244,63,94,0.1)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                            <CardTitle className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Morosidad Pendiente</CardTitle>
                            <div className="p-2 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 transition-colors">
                                <AlertTriangle className="h-4 w-4 text-rose-400" />
                            </div>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <div className={`text-2xl font-bold ${isDemo ? 'text-white' : 'text-rose-500'}`}>{morosidad}</div>
                            <p className={`text-xs mt-1 ${isDemo ? 'text-zinc-500' : 'text-zinc-500'}`}>{morosidadSubtext}</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <div className="w-full">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Histórico de Ingresos</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <RevenueChart organizationId={condo.organization_id} condominiumId={condo.id} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-lg font-medium text-white">Alertas Morosidad</CardTitle>
                    </CardHeader>
                    <CardContent className="px-3 pb-3 pt-0">
                        {(displayAlerts && displayAlerts.length > 0) ? (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {displayAlerts.map((alert: any) => (
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
                                        <div className="flex items-center gap-3">
                                            <div className="text-right flex-shrink-0">
                                                <p className="text-base font-bold text-rose-400">
                                                    ${Number(alert.amount).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                                <p className="text-xs font-medium text-zinc-500 mt-0.5">{alert.timeText}</p>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.15 }}
                                                whileTap={{ scale: 0.9 }}
                                                animate={{ 
                                                    boxShadow: ["0px 0px 0px rgba(37, 211, 102, 0)", "0px 0px 10px rgba(37, 211, 102, 0.5)", "0px 0px 0px rgba(37, 211, 102, 0)"]
                                                }}
                                                transition={{ 
                                                    duration: 2.5, 
                                                    repeat: Infinity,
                                                    ease: "easeInOut" 
                                                }}
                                                className="flex-shrink-0 h-9 w-9 rounded-full bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all duration-300 shadow-sm"
                                                title="Enviar recordatorio por WhatsApp"
                                            >
                                                <svg 
                                                    viewBox="0 0 24 24" 
                                                    className="h-5 w-5 fill-current"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                </svg>
                                            </motion.button>
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
                        {(displayActivity && displayActivity.length > 0) ? (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                {displayActivity.map((activity: any) => (
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
