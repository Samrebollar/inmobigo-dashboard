'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getSecurityInitialDataAction } from '@/app/actions/service-actions'
import { getPendingTransportNoticesServer, registerSecurityAccessEventAction } from '@/app/actions/security-ops-actions'
import type { SecurityAccessKind, SecurityAccessEvent } from '@/app/actions/security-ops-actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
    Users,
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
    MessageSquare,
    Shield,
    MapPin,
    Phone,
    User,
    Clock,
    XCircle,
    Car,
    LogIn,
    LogOut,
    Bike
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { DashboardHeader } from '@/components/seguridad/DashboardHeader'
import { QRScannerModal } from '@/components/seguridad/modals/qr-scanner-modal'
import { ManualVisitModal } from '@/components/seguridad/modals/manual-visit-modal'
import { PlanExpirationBanner } from '@/components/seguridad/PlanExpirationBanner'
import { useUserRole } from '@/hooks/use-user-role'

type SecurityTab = 'visitas' | 'paqueteria' | 'transporte' | 'repartidor' | 'proveedor'

// Los pases de visita se reparten en pestañas según lo que pidió el residente.
const passTab = (pass: any): 'visitas' | 'repartidor' | 'proveedor' =>
    pass.visitor_type === 'delivery' ? 'repartidor'
        : (pass.visitor_type === 'provider' || pass.access_type === 'service') ? 'proveedor'
        : 'visitas'

type AccessRowState = 'pending' | 'inside' | 'exited' | 'rejected' | 'expired' | 'cancelled' | 'delivered'

interface AccessRow {
    id: string
    kind: SecurityAccessKind
    title: string
    subtitle: string
    avatar: ReactNode
    avatarColor: string
    unit?: string | null
    vehicle?: string | null
    checkIn?: string | null
    checkOut?: string | null
    rejectionReason?: string | null
    state: AccessRowState
}

const ACCESS_STATE_BADGE: Record<AccessRowState, { label: string; className: string }> = {
    pending: { label: 'Esperando', className: 'bg-amber-500/10 text-amber-500' },
    inside: { label: 'Dentro', className: 'bg-emerald-500/10 text-emerald-500' },
    exited: { label: 'Salió', className: 'bg-sky-500/10 text-sky-400' },
    rejected: { label: 'Rechazado', className: 'bg-rose-500/10 text-rose-500' },
    expired: { label: 'Expirado', className: 'bg-zinc-500/10 text-zinc-400' },
    cancelled: { label: 'Cancelado', className: 'bg-zinc-500/10 text-zinc-400' },
    delivered: { label: 'Entregado', className: 'bg-emerald-500/10 text-emerald-500' },
}

const TAB_ORDER: SecurityTab[] = ['visitas', 'paqueteria', 'transporte', 'repartidor', 'proveedor']

const TAB_CONFIG: Record<SecurityTab, { label: string; icon: typeof UserPlus; activeClasses: string; avatarColor: string }> = {
    visitas: { label: 'Visitas', icon: UserPlus, activeClasses: 'bg-emerald-500/15 text-emerald-400', avatarColor: 'text-emerald-400' },
    paqueteria: { label: 'Paquetería', icon: Package, activeClasses: 'bg-amber-500/15 text-amber-400', avatarColor: 'text-amber-400' },
    transporte: { label: 'Transporte', icon: Car, activeClasses: 'bg-sky-500/15 text-sky-400', avatarColor: 'text-sky-400' },
    repartidor: { label: 'Repartidor', icon: Bike, activeClasses: 'bg-fuchsia-500/15 text-fuchsia-400', avatarColor: 'text-fuchsia-400' },
    proveedor: { label: 'Proveedor', icon: Wrench, activeClasses: 'bg-violet-500/15 text-violet-400', avatarColor: 'text-violet-400' },
}

const formatTime = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '--:--'

interface SecurityDashboardClientProps {
    userId?: string
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
    initialIncidents?: any[]
}


export default function SecurityDashboardAdminClient({
    userId,
    userEmail,
    userName,
    stats = { incidenciasPendientes: 0, anuncios: 0 }, 
    recentActivity = [],
    condoName,
    organizationId,
    availableCondos = [],
    daysRemaining = 999,
    nextPaymentDate,
    initialIncidents = []
}: SecurityDashboardClientProps) {
    const router = useRouter()
    const supabase = createClient()
    const [selectedCondoId, setSelectedCondoId] = useState<string>('')
    const [selectedCondoName, setSelectedCondoName] = useState<string>('')
    const [activeTab, setActiveTab] = useState<SecurityTab>('visitas')
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false)
    const [isManualVisitOpen, setIsManualVisitOpen] = useState(false)

    // Estados de datos reales
    const [visitorPasses, setVisitorPasses] = useState<any[]>([])
    const [packageAlerts, setPackageAlerts] = useState<any[]>([])
    const [transportNotices, setTransportNotices] = useState<any[]>([])
    const [processingRowId, setProcessingRowId] = useState<string | null>(null)
    const [rejectTarget, setRejectTarget] = useState<{ kind: SecurityAccessKind; id: string; label: string } | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [tableSearch, setTableSearch] = useState('')
    const [securityIncidents, setSecurityIncidents] = useState<any[]>(initialIncidents)
    const [unitToCondoMap, setUnitToCondoMap] = useState<Record<string, string>>({}) // Map unit_id -> condominium_id
    const [loading, setLoading] = useState(true)
    const [mounted, setMounted] = useState(false)
    const { isAdmin, role } = useUserRole()

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
                    const { passes, packages, unitMap, incidents } = result.data
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
                    setSecurityIncidents(incidents || [])
                }

                const transportResult = await getPendingTransportNoticesServer(organizationId, { includeResolvedHours: 24 })
                if (transportResult.success) {
                    setTransportNotices(transportResult.notices || [])
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
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'transport_notices', filter: `organization_id=eq.${organizationId}` },
                (payload) => {
                    const enriched = payload.new ? {
                        ...payload.new as any,
                        condominium_id: (payload.new as any).condominium_id || unitToCondoMap[(payload.new as any).unit_id]
                    } : null

                    if (payload.eventType === 'INSERT' && enriched) {
                        setTransportNotices(prev => [enriched, ...prev])
                    } else if (payload.eventType === 'UPDATE' && enriched) {
                        setTransportNotices(prev => prev.map(n => n.id === enriched.id ? enriched : n))
                    } else if (payload.eventType === 'DELETE') {
                        setTransportNotices(prev => prev.filter(n => n.id !== (payload.old as any).id))
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tickets', filter: `organization_id=eq.${organizationId}` },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        if ((payload.new as any).category === 'security') {
                            setSecurityIncidents(prev => [payload.new, ...prev])
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setSecurityIncidents(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
                    } else if (payload.eventType === 'DELETE') {
                        setSecurityIncidents(prev => prev.filter(i => i.id !== payload.old.id))
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

    const filteredIncidents = securityIncidents.filter(i => {
        if (!selectedCondoId) return true
        return i.condominium_id === selectedCondoId
    })

    const filteredTransportNotices = transportNotices.filter(n => {
        if (!selectedCondoId) return true
        return n.condominium_id === selectedCondoId
    })

    const handleAccessEvent = async (kind: SecurityAccessKind, id: string, event: SecurityAccessEvent, reason?: string) => {
        setProcessingRowId(id)
        try {
            const result = await registerSecurityAccessEventAction({ kind, id, event, reason, guardName: userName })
            if (!result.success || !result.record) throw new Error(result.error)

            const merge = (prev: any[]) => prev.map(r => r.id === id ? { ...r, ...result.record } : r)
            if (kind === 'visit') setVisitorPasses(merge)
            else if (kind === 'package') setPackageAlerts(merge)
            else setTransportNotices(merge)

            toast.success(event === 'check_in' ? 'Acceso registrado' : event === 'check_out' ? 'Salida registrada' : 'Rechazo registrado')
            return true
        } catch (err: any) {
            toast.error(err?.message || 'No se pudo actualizar el registro.')
            return false
        } finally {
            setProcessingRowId(null)
        }
    }

    const handleConfirmReject = async () => {
        if (!rejectTarget || !rejectReason.trim()) return
        const ok = await handleAccessEvent(rejectTarget.kind, rejectTarget.id, 'reject', rejectReason)
        if (ok) {
            setRejectTarget(null)
            setRejectReason('')
        }
    }

    // Mocks para KPIs operativos en tiempo real
    // KPIs operativos calculados en tiempo real
    const operationalStats = [
        { label: 'Accesos Hoy', value: filteredPasses.filter(p => {
            const today = new Date().toDateString();
            const isToday = new Date(p.created_at).toDateString() === today;
            return isToday && (p.status === 'registrado' || p.status === 'used');
        }).length.toString().padStart(2, '0'), icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50' },
        { label: 'Visitas Activas', value: filteredPasses.filter(p => p.status === 'pendiente' || p.status === 'pending').length.toString().padStart(2, '0'), icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500/50' },
        { label: 'Paquetes Pendientes', value: filteredPackages.filter(p => p.status === 'pending' || p.status === 'delivered_pending').length.toString().padStart(2, '0'), icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/50' },
        { label: 'Incidencias', value: filteredIncidents.filter(i => i.status !== 'closed' && i.status !== 'resolved').length.toString().padStart(2, '0'), icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/50' },
        { label: 'Transporte', value: filteredTransportNotices.filter(n => n.status === 'pending').length.toString().padStart(2, '0'), icon: Car, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'hover:border-sky-500/50' },
    ]

    // Filas normalizadas de la tabla (visitas / paquetería / transporte) para
    // que las tres pestañas compartan el flujo Acceso → Salida → Rechazo.
    const tableRows: AccessRow[] = (
        (activeTab === 'visitas' || activeTab === 'repartidor' || activeTab === 'proveedor')
            ? filteredPasses.filter(pass => passTab(pass) === activeTab).map((pass): AccessRow => {
            const checkIn = pass.checked_in_at || pass.used_at || null
            return {
                id: pass.id,
                kind: 'visit',
                title: pass.visitor_name || TAB_CONFIG[activeTab].label,
                subtitle: pass.notes ? String(pass.notes) : `ID: ${String(pass.id).substring(0, 8)}`,
                avatar: <span>{pass.visitor_name?.charAt(0) || 'V'}</span>,
                avatarColor: TAB_CONFIG[activeTab].avatarColor,
                unit: pass.unit_name,
                vehicle: pass.vehicle_info,
                checkIn,
                checkOut: pass.checked_out_at,
                rejectionReason: pass.rejection_reason,
                state: pass.status === 'rejected' ? 'rejected'
                    : pass.checked_out_at ? 'exited'
                    : (pass.status === 'used' || pass.status === 'registrado' || checkIn) ? 'inside'
                    : (pass.status === 'expired' || pass.status === 'expirado') ? 'expired'
                    : pass.status === 'cancelled' ? 'cancelled'
                    : 'pending',
            }
        })
        : activeTab === 'paqueteria' ? filteredPackages.map((pkg): AccessRow => ({
            id: pkg.id,
            kind: 'package',
            title: pkg.carrier || 'Paquetería',
            subtitle: `Residente: ${pkg.resident_name || '—'}`,
            avatar: <Package size={14} />,
            avatarColor: 'text-amber-400',
            unit: pkg.unit_name,
            vehicle: pkg.vehicle_info,
            checkIn: pkg.checked_in_at || pkg.received_at || null,
            checkOut: pkg.checked_out_at,
            rejectionReason: pkg.rejection_reason,
            state: pkg.status === 'rejected' ? 'rejected'
                : pkg.checked_out_at ? 'exited'
                : pkg.status === 'delivered' ? 'delivered'
                : (pkg.status === 'received' || pkg.checked_in_at) ? 'inside'
                : 'pending',
        }))
        : filteredTransportNotices.map((notice): AccessRow => ({
            id: notice.id,
            kind: 'transport',
            title: `${notice.platform} — ${notice.direction === 'pickup' ? 'Recogida' : 'Llegada'}`,
            subtitle: `Residente: ${notice.resident_name || '—'}`,
            avatar: notice.direction === 'pickup' ? <LogOut size={14} /> : <LogIn size={14} />,
            avatarColor: 'text-sky-400',
            unit: notice.unit_name,
            vehicle: notice.vehicle_info,
            checkIn: notice.checked_in_at || ((notice.status === 'received' || notice.status === 'closed') ? notice.handled_at : null),
            checkOut: notice.checked_out_at || (notice.status === 'closed' && !notice.checked_in_at ? notice.handled_at : null),
            rejectionReason: notice.rejection_reason,
            state: notice.status === 'rejected' ? 'rejected'
                : (notice.checked_out_at || notice.status === 'closed') ? 'exited'
                : notice.status === 'received' ? 'inside'
                : 'pending',
        }))
    ).filter(row => {
        const q = tableSearch.trim().toLowerCase()
        if (!q) return true
        return [row.unit, row.title, row.subtitle, row.vehicle].some(v => v?.toLowerCase().includes(q))
    })

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

            {isAdmin && (
                <PlanExpirationBanner 
                    daysRemaining={daysRemaining} 
                    nextPaymentDate={nextPaymentDate} 
                />
            )}

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-10"
            >
                {/* 1. KPIs Operativos */}
                <div className="grid gap-6 grid-cols-2 lg:grid-cols-5">
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

                    {/* Panel de Control & Tabla */}
                    <div className="space-y-8">

                        {/* Acciones Rápidas */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[
                                { label: 'Escanear QR', icon: QrCode, color: 'bg-indigo-600 hover:bg-indigo-500', desc: 'Acceso rápido', onClick: () => setIsQRScannerOpen(true) },
                                { label: 'Visita', icon: UserPlus, color: 'bg-emerald-600 hover:bg-emerald-500', desc: 'Registro manual', onClick: () => setIsManualVisitOpen(true) },
                                { label: 'Paquete', icon: Package, color: 'bg-amber-600 hover:bg-amber-500', desc: 'Recepción', onClick: () => router.push('/seguridad/avisos') },
                                { label: 'Transporte', icon: Car, color: 'bg-sky-600 hover:bg-sky-500', desc: 'Uber / DiDi', onClick: () => setActiveTab('transporte') },
                                { label: 'Incidente', icon: AlertTriangle, color: 'bg-rose-600 hover:bg-rose-500', desc: 'Reportar falla', onClick: () => router.push('/seguridad/incidencias') },
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
                                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                    <div className="flex flex-wrap gap-1 bg-zinc-900 p-1 rounded-xl">
                                        {TAB_ORDER.map(id => ({ id, ...TAB_CONFIG[id] })).map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={cn(
                                                    "flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-lg transition-all",
                                                    activeTab === tab.id ? cn(tab.activeClasses, "shadow-lg") : "text-zinc-500 hover:text-zinc-300"
                                                )}
                                            >
                                                <tab.icon className="h-3.5 w-3.5" />
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar por casa, nombre o placas..." 
                                                value={tableSearch}
                                                onChange={e => setTableSearch(e.target.value)}
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
                                                {['Nombre', 'Casa', 'Color / Placas', 'Estado', 'Hora de Acceso', 'Hora de Salida', 'Acción'].map(h => (
                                                    <th key={h} className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-center whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900/50">
                                            {tableRows.map((row) => {
                                                const badge = ACCESS_STATE_BADGE[row.state]
                                                const isProcessing = processingRowId === row.id
                                                return (
                                                    <tr key={row.id} className="hover:bg-zinc-900/30 transition-colors group">
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-col items-center justify-center text-center">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <div className={cn("h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs shrink-0", row.avatarColor)}>
                                                                        {row.avatar}
                                                                    </div>
                                                                    <p className="text-sm font-bold text-zinc-200">{row.title}</p>
                                                                </div>
                                                                <p className="text-[10px] text-zinc-600">{row.subtitle}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-sm font-medium text-zinc-400 text-center">
                                                            {row.unit || 'S/N'}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-medium text-zinc-300 text-center max-w-[160px]">
                                                            {row.vehicle ? (
                                                                <span className="inline-flex items-center gap-1.5">
                                                                    <Car className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                                                                    <span className="truncate" title={row.vehicle}>{row.vehicle}</span>
                                                                </span>
                                                            ) : <span className="text-zinc-600">—</span>}
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className={cn(
                                                                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                                                                badge.className
                                                            )}>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                                {badge.label}
                                                            </span>
                                                            {row.state === 'rejected' && row.rejectionReason && (
                                                                <p className="mt-1 text-[10px] text-rose-400/80 max-w-[180px] mx-auto line-clamp-2" title={row.rejectionReason}>
                                                                    {row.rejectionReason}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-mono text-zinc-500 text-center">
                                                            {formatTime(row.checkIn)}
                                                        </td>
                                                        <td className="px-4 py-4 text-xs font-mono text-zinc-500 text-center">
                                                            {formatTime(row.checkOut)}
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {row.state === 'pending' && (
                                                                    <>
                                                                        {row.kind === 'visit' && (
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={() => setIsQRScannerOpen(true)}
                                                                                className="h-9 w-9 flex items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 transition-colors"
                                                                                title="Escanear QR"
                                                                            >
                                                                                <QrCode className="h-4 w-4" />
                                                                            </motion.button>
                                                                        )}
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.05 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            disabled={isProcessing}
                                                                            onClick={() => handleAccessEvent(row.kind, row.id, 'check_in')}
                                                                            className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-[11px] font-bold transition-colors disabled:opacity-50"
                                                                            title="Registrar acceso"
                                                                        >
                                                                            <LogIn className="h-4 w-4" /> Acceso
                                                                        </motion.button>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            disabled={isProcessing}
                                                                            onClick={() => { setRejectReason(''); setRejectTarget({ kind: row.kind, id: row.id, label: row.title }) }}
                                                                            className="h-9 w-9 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 transition-colors disabled:opacity-50"
                                                                            title="Rechazar"
                                                                        >
                                                                            <XCircle className="h-4 w-4" />
                                                                        </motion.button>
                                                                    </>
                                                                )}
                                                                {row.state === 'inside' && (
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        disabled={isProcessing}
                                                                        onClick={() => handleAccessEvent(row.kind, row.id, 'check_out')}
                                                                        className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-sky-500/10 text-sky-400 text-[11px] font-bold transition-colors disabled:opacity-50"
                                                                        title="Registrar salida"
                                                                    >
                                                                        <LogOut className="h-4 w-4" /> Salida
                                                                    </motion.button>
                                                                )}
                                                                {row.state !== 'pending' && row.state !== 'inside' && (
                                                                    <span className="text-zinc-600 text-xs">—</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}

                                            {tableRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-medium">
                                                        No hay registros para mostrar en esta propiedad.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="border-t border-zinc-900 p-3">
                                    <Button
                                        variant="ghost"
                                        onClick={() => router.push('/seguridad/bitacora')}
                                        className="w-full text-zinc-500 hover:text-white hover:bg-zinc-900 text-xs font-bold"
                                    >
                                        Ver historial completo
                                        <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
            </motion.div>

            {/* Modal: Motivo de rechazo (queda como evidencia y lo ve el residente) */}
            <AnimatePresence>
                {rejectTarget && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => processingRowId !== rejectTarget.id && setRejectTarget(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 10 }}
                            onClick={e => e.stopPropagation()}
                            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4"
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                                    <XCircle className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Rechazar acceso</h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">{rejectTarget.label}</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Motivo del rechazo</label>
                                <textarea
                                    autoFocus
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                    placeholder="Ej. El conductor no coincide con los datos del aviso / placas diferentes / sin identificación..."
                                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-rose-500/50 resize-none"
                                />
                                <p className="text-[11px] text-zinc-500">El residente verá este motivo en su panel.</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    onClick={() => setRejectTarget(null)}
                                    disabled={processingRowId === rejectTarget.id}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleConfirmReject}
                                    disabled={!rejectReason.trim() || processingRowId === rejectTarget.id}
                                    className="bg-rose-600 hover:bg-rose-500 text-white"
                                >
                                    {processingRowId === rejectTarget.id ? 'Guardando...' : 'Confirmar rechazo'}
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
