'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
    Users, 
    Activity, 
    Wrench, 
    AlertTriangle, 
    QrCode, 
    Package, 
    UserPlus, 
    ChevronRight,
    Search,
    Filter,
    Bell,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { DashboardHeader } from '@/components/seguridad/DashboardHeader'
import { QRScannerModal } from '@/components/seguridad/modals/qr-scanner-modal'
import { ManualVisitModal } from '@/components/seguridad/modals/manual-visit-modal'
import { PlanExpirationBanner } from '@/components/seguridad/PlanExpirationBanner'

interface SecurityDashboardClientProps {
    userEmail?: string
    userName?: string
    stats?: {
        incidenciasPendientes: number
        anuncios: number
    }
    recentActivity?: any[]
    condoName?: string
    organizationId?: string
    availableCondos?: any[]
    daysRemaining?: number
    nextPaymentDate?: string
}

import { getSecurityInitialDataAction } from '@/app/actions/service-actions'

export default function SecurityDashboardAdminClient({ 
    userEmail, 
    userName, 
    stats = { incidenciasPendientes: 0, anuncios: 0 }, 
    recentActivity = [],
    condoName,
    organizationId,
    availableCondos = [],
    daysRemaining = 999,
    nextPaymentDate
}: SecurityDashboardClientProps) {
    const router = useRouter()
    const supabase = createClient()
    const [selectedCondoId, setSelectedCondoId] = useState<string>('')
    const [selectedCondoName, setSelectedCondoName] = useState<string>('')
    const [activeTab, setActiveTab] = useState<'visitas' | 'paqueteria' | 'alertas'>('visitas')
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
    const [isManualVisitOpen, setIsManualVisitOpen] = useState(false)
    
    // Estados de datos reales
    const [visitorPasses, setVisitorPasses] = useState<any[]>([])
    const [packageAlerts, setPackageAlerts] = useState<any[]>([])
    const [unitToCondoMap, setUnitToCondoMap] = useState<Record<string, string>>({}) // Map unit_id -> condominium_id
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    // Sync condo name when selection changes
    useEffect(() => {
        if (selectedCondoId) {
            const condo = availableCondos.find(c => c.id === selectedCondoId)
            setSelectedCondoName(condo?.name || '')
        } else {
            setSelectedCondoName('')
        }
    }, [selectedCondoId, availableCondos])

    // Carga Inicial (Solo depende de organizationId)
    useEffect(() => {
        if (!organizationId) return

        const fetchInitialData = async () => {
            setLoading(true)
            try {
                // Use Server Action to bypass RLS issues for initial load
                const result = await getSecurityInitialDataAction(organizationId)
                
                if (result.success && result.data) {
                    const { unitMap, passes, packages } = result.data
                    setUnitToCondoMap(unitMap)

                    // Enrich initial data with condominium_id from our map if missing
                    const enrichedPasses = (passes || []).map((p: any) => ({
                        ...p,
                        condominium_id: p.condominium_id || unitMap[p.unit_id]
                    }))
                    
                    const enrichedPackages = (packages || []).map((pkg: any) => ({
                        ...pkg,
                        condominium_id: pkg.condominium_id || unitMap[pkg.unit_id]
                    }))

                    setVisitorPasses(enrichedPasses)
                    setPackageAlerts(enrichedPackages)
                }
            } catch (error) {
                console.error('Error fetching security dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchInitialData()
    }, [organizationId])

    // Suscripción Realtime (Depende del mapa para enriquecer registros)
    useEffect(() => {
        if (!organizationId) return

        // Canal de Realtime
        const channel = supabase
            .channel(`security-dashboard-live-${organizationId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'visitor_passes', filter: `organization_id=eq.${organizationId}` },
                (payload) => {
                    const enriched = payload.new ? {
                        ...payload.new as any,
                        condominium_id: (payload.new as any).condominium_id || unitToCondoMap[(payload.new as any).unit_id]
                    } : null

                    if (payload.eventType === 'INSERT' && enriched) {
                        setVisitorPasses(prev => [enriched, ...prev])
                    } else if (payload.eventType === 'UPDATE' && enriched) {
                        setVisitorPasses(prev => prev.map(p => p.id === enriched.id ? enriched : p))
                    } else if (payload.eventType === 'DELETE') {
                        setVisitorPasses(prev => prev.filter(p => p.id !== (payload.old as any).id))
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'package_alerts', filter: `organization_id=eq.${organizationId}` },
                (payload) => {
                    const enriched = payload.new ? {
                        ...payload.new as any,
                        condominium_id: (payload.new as any).condominium_id || unitToCondoMap[(payload.new as any).unit_id]
                    } : null

                    if (payload.eventType === 'INSERT' && enriched) {
                        setPackageAlerts(prev => [enriched, ...prev])
                    } else if (payload.eventType === 'UPDATE' && enriched) {
                        setPackageAlerts(prev => prev.map(p => p.id === enriched.id ? enriched : p))
                    } else if (payload.eventType === 'DELETE') {
                        setPackageAlerts(prev => prev.filter(p => p.id !== (payload.old as any).id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [organizationId, unitToCondoMap])

    // Robust Filtering Logic
    const filteredPasses = visitorPasses.filter(p => {
        if (!selectedCondoId) return true
        
        // Match by ID OR by Name (organization_name field often stores condo name)
        const matchesId = p.condominium_id === selectedCondoId
        const matchesName = p.organization_name?.toLowerCase() === selectedCondoName?.toLowerCase()
        
        return matchesId || matchesName
    })

    const filteredPackages = packageAlerts.filter(p => {
        if (!selectedCondoId) return true
        
        const matchesId = p.condominium_id === selectedCondoId
        const matchesName = p.organization_name?.toLowerCase() === selectedCondoName?.toLowerCase()
        
        return matchesId || matchesName
    })

    
    // Mocks para KPIs operativos en tiempo real
    // KPIs operativos calculados en tiempo real
    const operationalStats = [
        { label: 'Accesos Hoy', value: filteredPasses.filter(p => {
            const today = new Date().toDateString();
            return new Date(p.created_at).toDateString() === today;
        }).length.toString().padStart(2, '0'), icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50' },
        { label: 'Visitas Activas', value: filteredPasses.filter(p => p.status === 'pendiente').length.toString().padStart(2, '0'), icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500/50' },
        { label: 'Paquetes Pendientes', value: filteredPackages.filter(p => p.status === 'pending').length.toString().padStart(2, '0'), icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/50' },
        { label: 'Incidencias', value: stats.incidenciasPendientes.toString().padStart(2, '0'), icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/50' },
    ]

    // Feed de Actividad dinámico basado en datos reales
    const activityFeed = [
        ...filteredPasses.slice(0, 3).map(p => ({
            id: p.id,
            type: 'qr',
            title: p.status === 'registrado' ? 'Acceso Registrado' : 'Pase Generado',
            house: p.unit_name || 'S/N',
            details: `Visitante: ${p.visitor_name}`,
            time: p.created_at ? new Date(p.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Hoy',
            status: p.status === 'registrado' ? 'success' : 'pending'
        })),
        ...filteredPackages.slice(0, 2).map(pkg => ({
            id: pkg.id,
            type: 'package',
            title: 'Paquete Recibido',
            house: pkg.unit_name || 'S/N',
            details: `${pkg.carrier || 'Amazon'} - ${pkg.resident_name}`,
            time: pkg.created_at ? new Date(pkg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Hoy',
            status: pkg.status === 'delivered' ? 'success' : 'pending'
        }))
    ].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
        return dateB - dateA
    }).slice(0, 5)

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    if (!mounted) return null

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8 bg-black min-h-screen">
            <DashboardHeader 
                userEmail={userEmail} 
                userName={userName} 
                condoName={condoName} 
                availableCondos={availableCondos}
                selectedCondo={selectedCondoId}
                onCondoChange={setSelectedCondoId}
            />

            <PlanExpirationBanner 
                daysRemaining={daysRemaining} 
                nextPaymentDate={nextPaymentDate} 
            />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-10"
            >
                {/* 1. KPIs Operativos */}
                <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
                    {operationalStats.map((stat, idx) => (
                        <motion.div key={idx} variants={item} whileHover={{ y: -5 }}>
                            <Card className={cn("bg-zinc-950 border-zinc-900 transition-all duration-300 h-40 flex flex-col justify-between overflow-hidden", stat.border)}>
                                <CardContent className="p-8 pt-10 flex flex-col justify-between h-full">
                                    <div className="flex items-center justify-between">
                                        <div className={cn("p-3 rounded-xl", stat.bg)}>
                                            <stat.icon className={cn("h-6 w-6", stat.color)} />
                                        </div>
                                        <p className="text-4xl font-bold text-white tracking-tight tabular-nums">
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] leading-none">
                                            {stat.label}
                                        </p>
                                        <div className={cn("h-1 w-6 rounded-full", stat.bg.replace('/10', '/30'))} />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid gap-8 lg:grid-cols-12">
                    {/* 2. Sección Principal: Feed de Actividad */}
                    <motion.div variants={item} className="lg:col-span-4 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Activity className="h-5 w-5 text-indigo-500" />
                                Actividad Real
                            </h2>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse">
                                En Vivo
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            {activityFeed.map((event) => (
                                <motion.div 
                                    key={event.id}
                                    whileHover={{ x: 5 }}
                                    className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                                            event.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                            event.status === 'error' ? 'bg-rose-500/10 text-rose-500' :
                                            event.status === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                        )}>
                                            {event.type === 'qr' && <QrCode className="h-5 w-5" />}
                                            {event.type === 'package' && <Package className="h-5 w-5" />}
                                            {event.type === 'access' && <XCircle className="h-5 w-5" />}
                                            {event.type === 'incident' && <AlertTriangle className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-bold text-white">{event.title}</p>
                                                <span className="text-[10px] text-zinc-600 font-mono italic">{event.time}</span>
                                            </div>
                                            <p className="text-xs text-zinc-400 font-medium mb-1">{event.house}</p>
                                            <p className="text-[11px] text-zinc-500 truncate">{event.details}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full text-zinc-500 hover:text-white hover:bg-zinc-900 text-xs">
                            Ver historial completo
                        </Button>
                    </motion.div>

                    {/* 3. Panel de Control & Tabla */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Acciones Rápidas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Escanear QR', icon: QrCode, color: 'bg-indigo-600 hover:bg-indigo-500', desc: 'Acceso rápido', onClick: () => setIsQRScannerOpen(true) },
                                { label: 'Visita', icon: UserPlus, color: 'bg-emerald-600 hover:bg-emerald-500', desc: 'Registro manual', onClick: () => setIsManualVisitOpen(true) },
                                { label: 'Paquete', icon: Package, color: 'bg-amber-600 hover:bg-amber-500', desc: 'Recepción', onClick: () => router.push('/seguridad/avisos') },
                                { label: 'Incidente', icon: AlertTriangle, color: 'bg-rose-600 hover:bg-rose-500', desc: 'Reportar falla', onClick: () => {} },
                            ].map((action, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={action.onClick}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-6 rounded-2xl transition-all shadow-xl gap-3 text-white group",
                                        action.color
                                    )}
                                >
                                    <action.icon className="h-8 w-8 transition-transform group-hover:scale-110" />
                                    <div className="text-center">
                                        <p className="text-sm font-bold">{action.label}</p>
                                        <p className="text-[10px] opacity-70 font-medium uppercase tracking-tighter">{action.desc}</p>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Tabla de Gestión */}
                        <Card className="bg-zinc-950 border-zinc-900 shadow-2xl overflow-hidden rounded-2xl">
                            <CardHeader className="border-b border-zinc-900 pb-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl">
                                        {(['visitas', 'paqueteria', 'alertas'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={cn(
                                                    "px-6 py-2 text-xs font-bold rounded-lg transition-all capitalize",
                                                    activeTab === tab ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                                                )}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar por casa..." 
                                                className="bg-zinc-900 border-none rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-indigo-500/50 w-48"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-900 bg-zinc-900/20">
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nombre</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Casa</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Hora</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900/50">
                                            {activeTab === 'visitas' && filteredPasses.map((pass, i) => (
                                                <tr key={pass.id} className="hover:bg-zinc-900/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-indigo-400 font-bold text-xs">
                                                                {pass.visitor_name?.charAt(0) || 'V'}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-zinc-200">{pass.visitor_name}</p>
                                                                <p className="text-[10px] text-zinc-600">ID: {pass.id.substring(0, 8)}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-zinc-400">
                                                        {pass.unit_name || 'S/N'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                                                            pass.status === 'registrado' ? "bg-emerald-500/10 text-emerald-500" :
                                                            pass.status === 'pendiente' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                                                        )}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                            {pass.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                                                        {pass.created_at ? new Date(pass.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}

                                            {activeTab === 'paqueteria' && filteredPackages.map((pkg, i) => (
                                                <tr key={pkg.id} className="hover:bg-zinc-900/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-amber-400 font-bold text-xs">
                                                                <Package size={14} />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-zinc-200">{pkg.carrier || 'Paquetería'}</p>
                                                                <p className="text-[10px] text-zinc-600">Residente: {pkg.resident_name}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-zinc-400">
                                                        {pkg.unit_name || 'S/N'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                                                            pkg.status === 'delivered' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                                        )}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                            {pkg.status === 'delivered' ? 'Entregado' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                                                        {pkg.created_at ? new Date(pkg.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}

                                            {(activeTab === 'visitas' ? filteredPasses : filteredPackages).length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 font-medium">
                                                        No hay registros para mostrar en esta propiedad.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Footer Section - Links preserving module structure */}
                <div className="pt-8 border-t border-zinc-900 flex items-center justify-between">
                    <p className="text-xs text-zinc-600 font-medium italic">InmobiGo v2.4 Security Sentinel Edition</p>
                    <div className="flex items-center gap-6">
                        <Link href="/seguridad/avisos" className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest">
                            Panel de Avisos
                        </Link>
                        <Link href="/seguridad/configuracion" className="text-xs text-zinc-500 hover:text-white transition-colors">
                            Configuración
                        </Link>
                    </div>
                </div>
            </motion.div>

            {/* Modales Operativos */}
            <QRScannerModal 
                isOpen={isQRScannerOpen} 
                onClose={() => setIsQRScannerOpen(false)} 
            />
            <ManualVisitModal 
                isOpen={isManualVisitOpen} 
                onClose={() => setIsManualVisitOpen(false)} 
                organizationId={organizationId}
                availableCondos={availableCondos}
            />
        </div>
    )
}

