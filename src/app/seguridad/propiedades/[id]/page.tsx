// Force refresh
'use client'
console.log('Mounting Property Page')

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    Building, MapPin, Users, Home, TrendingUp, Settings,
    ArrowLeft, Edit, AlertCircle
} from 'lucide-react'

import { createClient } from '@/utils/supabase/client'
import { propertiesService } from '@/services/properties-service'
import { residentsService } from '@/services/residents-service'
import { Condominium } from '@/types/properties'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

import { UnitsTab } from '@/components/seguridad/tabs/UnitsTab'
import { ResidentsTab } from '@/components/seguridad/tabs/ResidentsTab'
import { SummaryTab } from '@/components/seguridad/tabs/SummaryTab'
import { FinanceTab } from '@/components/seguridad/tabs/FinanceTab'
import { SettingsTab } from '@/components/seguridad/tabs/SettingsTab'
import { EditCondominiumModal } from '@/components/seguridad/EditCondominiumModal'
import { demoDb } from '@/utils/demo-db'
import { useUserRole } from '@/hooks/use-user-role'

export default function CondominiumPage() {
    const { isPropiedades } = useUserRole()
    console.log(">>>>>>>> CONDOMINIUM PAGE SSR/CLIENT MOUNT <<<<<<<<")
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [condo, setCondo] = useState<Condominium | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('summary')
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)

    useEffect(() => {
        fetchCondo()
    }, [])
    const [revenueData, setRevenueData] = useState<any[]>([])

    const fetchCondo = async () => {
        try {
            if (!params.id) {
                console.error('No ID in params:', params)
                return
            }

            const id = params.id as string
            console.log('Fetching Condo ID:', id)

            let data: Condominium | null = null

            if (id.startsWith('demo-')) {
                const demoProperties = demoDb.getProperties()
                data = demoProperties.find(p => p.id === id) || null
            } else {
                data = await propertiesService.getById(id)
                if (data) {
                    const { count: realResidentsCount } = await supabase
                        .from('residents')
                        .select('*', { count: 'exact', head: true })
                        .eq('condominium_id', id)

                        ; (data as any).residents_count = realResidentsCount || 0

                    const { count: realUnitsCount } = await supabase
                        .from('units')
                        .select('*', { count: 'exact', head: true })
                        .eq('condominium_id', id)

                        ; (data as any).real_units_count = realUnitsCount || 0

                    // NEW FINANCIAL METRICS

                    if (id.startsWith('demo-')) {
                        // Demo data fallbacks
                        ; (data as any).ingresos_mes = 0;
                        ; (data as any).deuda_total = 10;
                        ; (data as any).morosos_count = 1;
                        ; (data as any).ocupadas_count = 1;

                        const demoChartData = [
                            { name: 'Ene', invoiced: 50000, income: 45000, pending: 5000 },
                            { name: 'Feb', invoiced: 48000, income: 48000, pending: 0 },
                            { name: 'Mar', invoiced: 52000, income: 40000, pending: 12000 },
                            { name: 'Abr', invoiced: 51000, income: 45000, pending: 6000 },
                            { name: 'May', invoiced: 49000, income: 49000, pending: 0 },
                            { name: 'Jun', invoiced: 55000, income: 50000, pending: 5000 }
                        ]
                        setRevenueData(demoChartData)

                        ; (data as any).alerts = [
                            { id: '1', title: 'Unidad A-101', name: 'Juan Pérez', amount: 1500, timeText: 'Hace 2 d' },
                            { id: '2', title: 'Unidad A-102', name: 'María Gómez', amount: 3200, timeText: 'Hace 5 d' },
                            { id: '3', title: 'Unidad B-201', name: 'Carlos López', amount: 800, timeText: 'Hace 1 d' }
                        ]

                        ; (data as any).recent_activity = [
                            { id: '1', title: 'Pago Recibido - Unidad B-202', name: 'Laura Martínez', amount: 1500, timeText: 'Hace 10 m' },
                            { id: '2', title: 'Pago Recibido - Unidad C-101', name: 'Roberto Carlos', amount: 3200, timeText: 'Hace 1 hora' }
                        ]
                    } else {
                            const now = new Date()
                            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
                            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
                            const currentDay = now.getDate()

                            const { data: activeResidents } = await supabase
                                .from('residents')
                                .select('id, first_name, last_name, unit_number, status')
                                .eq('condominium_id', id)
                                .eq('status', 'active')

                            const activeResidentIds = new Set((activeResidents || []).map(r => r.id))

                            const { data: unitsData } = await supabase
                                .from('units')
                                .select('id, monto_mensual')
                                .eq('condominium_id', id)

                            const { data: allInvoices } = await supabase
                                .from('invoices')
                                .select('id, unit_id, amount, paid_amount, balance_due, resident_id, status, created_at')
                                .eq('condominium_id', id)

                            // Only invoices from currently active residents
                            const invoices = (allInvoices || []).filter(inv =>
                                inv.resident_id && activeResidentIds.has(inv.resident_id)
                            )

                            const totalRecaudado = invoices
                                .filter(i => i.created_at >= startOfMonth && i.created_at <= endOfMonth)
                                .reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0)

                            ;(data as any).ingresos_mes = totalRecaudado

                            const expectedTotal = (unitsData || []).reduce((acc, unit) => acc + (Number(unit.monto_mensual) || 0), 0)
                            const unpaidBalance = Math.max(0, expectedTotal - totalRecaudado)
                            ;(data as any).deuda_total = currentDay > 10 ? unpaidBalance : 0

                            let morososCount = 0
                            if (unitsData && invoices.length > 0) {
                                const currentPeriodInvoices = invoices.filter(i => i.created_at >= startOfMonth && i.created_at <= endOfMonth)
                                const paymentsPerUnit: Record<string, number> = {}
                                currentPeriodInvoices.forEach(inv => {
                                    if (inv.unit_id) paymentsPerUnit[inv.unit_id] = (paymentsPerUnit[inv.unit_id] || 0) + (Number(inv.paid_amount) || 0)
                                })
                                unitsData.forEach(unit => {
                                    if ((paymentsPerUnit[unit.id] || 0) < Number(unit.monto_mensual)) morososCount++
                                })
                            }
                            ;(data as any).morosos_count = currentDay > 10 ? morososCount : 0

                            const residentsList = activeResidents || []
                            const morosidadAlerts: any[] = []

                            if (unitsData && invoices.length > 0) {
                                const currentPeriodInvoices = invoices.filter(i => i.created_at >= startOfMonth && i.created_at <= endOfMonth)
                                const paymentsPerUnit: Record<string, number> = {}
                                currentPeriodInvoices.forEach(inv => {
                                    if (inv.unit_id) paymentsPerUnit[inv.unit_id] = (paymentsPerUnit[inv.unit_id] || 0) + (Number(inv.paid_amount) || 0)
                                })
                                unitsData.forEach(unit => {
                                    const paid = paymentsPerUnit[unit.id] || 0
                                    const expected = Number(unit.monto_mensual) || 0
                                    if (currentDay > 10 && paid < expected) {
                                        const resident = residentsList.find(r => {
                                            const inv = invoices.find(i => i.unit_id === unit.id)
                                            return inv ? r.id === inv.resident_id : false
                                        })
                                        if (resident) {
                                            const residentName = `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
                                            if (residentName) {
                                                morosidadAlerts.push({
                                                    id: `alert-${unit.id}`,
                                                    title: residentName,
                                                    amount: expected - paid,
                                                    timeText: 'Mes Actual',
                                                    name: `Unidad ${resident.unit_number || unit.id.split('-').pop() || 'S/N'}`
                                                })
                                            }
                                        }
                                    }
                                })
                            }

                            const pastOverdueInvoices = invoices.filter(i =>
                                i.created_at < startOfMonth && (i.status === 'overdue' || (i.balance_due && i.balance_due > 0))
                            )
                            pastOverdueInvoices.forEach(inv => {
                                const resident = residentsList.find(r => r.id === inv.resident_id)
                                if (resident) {
                                    const residentName = `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
                                    if (residentName) {
                                        const daysOverdue = Math.floor((new Date().getTime() - new Date(inv.created_at).getTime()) / (1000 * 3600 * 24))
                                        morosidadAlerts.push({
                                            id: inv.id || Math.random().toString(),
                                            title: residentName,
                                            amount: inv.balance_due && inv.balance_due > 0 ? inv.balance_due : (inv.amount || 0),
                                            timeText: `Hace ${daysOverdue} días`,
                                            name: `Unidad ${resident.unit_number || 'S/N'}`
                                        })
                                    }
                                }
                            })

                            morosidadAlerts.sort((a, b) => b.amount - a.amount)
                            ;(data as any).alerts = morosidadAlerts

                            const paidInvoices = invoices.filter(i => i.status === 'paid' || i.status === 'completed')
                            const recentActivity = paidInvoices.map(inv => {
                                const resident = residentsList.find(r => r.id === inv.resident_id)
                                const unit = resident?.unit_number || 'S/N'
                                const name = resident ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim() : 'Desconocido'
                                const activityDate = new Date(inv.created_at)
                                const daysAgo = Math.floor((new Date().getTime() - activityDate.getTime()) / (1000 * 3600 * 24))
                                return {
                                    id: inv.id || Math.random().toString(),
                                    title: `Pago Recibido - Unidad ${unit}`,
                                    amount: inv.paid_amount || inv.amount || 0,
                                    timeText: daysAgo === 0 ? 'Hoy' : daysAgo === 1 ? 'Ayer' : `Hace ${daysAgo} días`,
                                    name, date: activityDate.getTime()
                                }
                            })
                            recentActivity.sort((a, b) => b.date - a.date)
                            ;(data as any).recent_activity = recentActivity.slice(0, 10)

                            const { count: ocupadasCount } = await supabase
                                .from('units').select('*', { count: 'exact', head: true }).eq('condominium_id', id)
                            ;(data as any).ocupadas_count = ocupadasCount || 0

                            const staticMonths = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
                            const last6Months = staticMonths.map((monthName, index) => ({
                                name: monthName, month: index, invoiced: 0, income: 0, pending: 0
                            }))
                            invoices.forEach(inv => {
                                const invMonth = new Date(inv.created_at).getMonth()
                                const targetMonth = last6Months.find(m => m.month === invMonth)
                                if (targetMonth) {
                                    if (inv.status === 'paid' || inv.status === 'completed') targetMonth.invoiced += Number(inv.amount || 0)
                                    targetMonth.income += Number(inv.paid_amount || 0)
                                    if (inv.status === 'pending' || inv.status === 'overdue' || (inv.balance_due && inv.balance_due > 0)) {
                                        targetMonth.pending += Number(inv.balance_due && inv.balance_due > 0 ? inv.balance_due : inv.amount || 0)
                                    }
                                }
                            })
                            setRevenueData(last6Months)
                        }
                    }
                }

            console.log('Condo Data:', data)

            // Verify organization ownership
            const { data: { user } } = await supabase.auth.getUser()

            // Si estamos en modo demo (id empieza con demo-) o si data existe y hay usuario
            if (data && (id.startsWith('demo-') || user)) {
                setCondo(data)
            } else {
                router.push('/seguridad/propiedades')
            }
        } catch (error) {
            console.error(error)
            router.push('/seguridad/propiedades')
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-7xl p-6 space-y-8">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                </div>
                <Skeleton className="h-[200px] w-full rounded-2xl" />
            </div>
        )
    }

    if (!condo) return null

    const tabs = [
        { id: 'summary', label: 'Resumen', icon: TrendingUp },
        { id: 'units', label: 'Unidades', icon: Home },
        { id: 'residents', label: isPropiedades ? 'Inquilinos' : 'Residentes', icon: Users },
        { id: 'finance', label: 'Facturación', icon: AlertCircle },
        { id: 'settings', label: 'Configuración', icon: Settings },
    ]

    return (
        <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-b-3xl bg-zinc-900 border-b border-zinc-800 pb-8 pt-6 px-8 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />

                {/* Breadcrumb / Back */}
                <button
                    onClick={() => router.push('/seguridad/propiedades')}
                    className="relative z-10 mb-6 flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" /> Volver a Propiedades
                </button>

                <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div className="flex items-start gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 shadow-xl">
                            <Building className="h-8 w-8 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-white tracking-tight">{condo.name}</h1>
                                <Badge variant={condo.status === 'active' ? 'success' : 'warning'}>
                                    {condo.status === 'active' ? 'Activo' : 'Pausado'}
                                </Badge>
                            </div>
                            <div className="mt-2 flex items-center gap-4 text-sm text-zinc-400">
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    {condo.city}, {condo.state}
                                </div>
                                <div className="h-1 w-1 rounded-full bg-zinc-700" />
                                <span className="capitalize">{condo.type === 'residential' ? 'Residencial' : condo.type}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => setActiveTab('settings')} className="gap-2 border-zinc-700 hover:bg-zinc-800">
                            <Settings className="h-4 w-4" /> Configuración
                        </Button>
                        <Button onClick={() => setIsEditModalOpen(true)} className="gap-2 bg-indigo-600 hover:bg-indigo-500">
                            <Edit className="h-4 w-4" /> Editar Info
                        </Button>
                    </div>
                </div>

                {/* Quick Stats in Hero */}
                <div className="relative z-10 mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-8 border-t border-zinc-800/50 pt-8">
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Ingresos (Mes)</p>
                        <p className="text-2xl font-bold text-emerald-400">
                            ${(condo as any).ingresos_mes?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Deuda Total</p>
                        <p className="text-2xl font-bold text-amber-500">
                            ${(condo as any).deuda_total?.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">{isPropiedades ? 'Inquilinos Morosos' : 'Residentes Morosos'}</p>
                        <div className="flex items-center gap-2">
                            <p className="text-2xl font-bold text-rose-400">
                                {(condo as any).morosos_count || 0}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm text-zinc-500">Unidades Ocupadas</p>
                        <p className="text-2xl font-bold text-white">
                            {(condo as any).ocupadas_count || 0}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="mt-8 px-6">
                <div className="border-b border-zinc-800">
                    <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                    group inline-flex items-center border-b-2 py-4 px-1 text-sm font-medium transition-all
                    ${activeTab === tab.id
                                            ? 'border-indigo-500 text-indigo-400'
                                            : 'border-transparent text-zinc-400 hover:border-zinc-700 hover:text-zinc-300'
                                        }
                  `}
                                >
                                    <Icon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-400'}`} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="mt-6">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* END DEBUG UI */}
                        {activeTab === 'summary' && <SummaryTab condo={condo} revenueData={revenueData} />}
                        {activeTab === 'units' && <UnitsTab onUnitsUpdated={fetchCondo} />}
                        {activeTab === 'residents' && <ResidentsTab onResidentsUpdated={fetchCondo} />}
                        {activeTab === 'finance' && <FinanceTab />}
                        {activeTab === 'settings' && <SettingsTab />}
                    </motion.div>
                </div>
            </div>

            {/* Edit Modal */}
            <EditCondominiumModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={() => {
                    setIsEditModalOpen(false)
                    fetchCondo()
                }}
                condominium={condo}
                updateProperty={propertiesService.update}
            />
        </div>
    )
}
