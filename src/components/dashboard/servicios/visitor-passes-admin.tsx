'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { 
    QrCode, 
    Clock, 
    CheckCircle2, 
    X,
    Calendar,
    User,
    ShieldCheck,
    Gift,
    AlertCircle,
    Search,
    Filter
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface VisitorPass {
    id: string
    visitor_name: string
    access_type: 'guest' | 'service' | 'event'
    visit_date: string
    start_time: string
    end_time: string
    status: 'pending' | 'used' | 'expired' | 'cancelled'
    qr_token: string
    authorized_by_name: string
    unit_name: string
    organization_name: string
    created_at: string
}

export function VisitorPassesAdmin({ admin, initialPasses = [] }: { admin: any, initialPasses?: VisitorPass[] }) {
    const supabase = createClient()
    const [passes, setPasses] = useState<VisitorPass[]>(initialPasses)
    const [loading, setLoading] = useState(initialPasses.length === 0)
    const [filterStatus, setFilterStatus] = useState<string>('all')
    const [filterType, setFilterType] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const orgId = admin?.organization_id
        console.log('VisitorPassesAdmin - Current OrgId:', orgId)

        if (orgId) {
            fetchPasses(orgId)

            // Suscribirse a cambios en tiempo real para la organización
            const channel = supabase
                .channel('admin-visitor-passes')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'visitor_passes',
                        filter: `organization_id=eq.${orgId}`
                    },
                    (payload) => {
                        console.log('Realtime update received:', payload)
                        fetchPasses(orgId)
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        } else {
            console.warn('VisitorPassesAdmin - No organization_id found in admin object')
            setLoading(false)
        }
    }, [admin?.organization_id])

    const fetchPasses = async (orgId: string) => {
        if (!orgId) return

        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('visitor_passes')
                .select('*')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error
            setPasses(data || [])
        } catch (error) {
            console.error('Error fetching passes:', error)
            toast.error('Error al cargar los accesos')
        } finally {
            setLoading(false)
        }
    }

    const getDisplayStatus = (pass: VisitorPass) => {
        if (pass.status !== 'pending') return pass.status
        
        const now = new Date()
        // Crear fecha de fin combinando visit_date y end_time
        const visitEndDateTime = new Date(`${pass.visit_date}T${pass.end_time}`)
        
        return now > visitEndDateTime ? 'expired' : 'pending'
    }

    const handleRegisterEntry = async (pass: VisitorPass) => {
        const currentStatus = getDisplayStatus(pass)
        
        if (currentStatus !== 'pending') {
            toast.error(`No se puede registrar un pase que está ${currentStatus.toUpperCase()}`)
            return
        }

        try {
            // Verificar doblemente con la DB antes de actualizar
            const { data: latest, error: fetchErr } = await supabase
                .from('visitor_passes')
                .select('status')
                .eq('id', pass.id)
                .single()

            if (fetchErr) throw fetchErr
            
            if (latest.status !== 'pending') {
                toast.error('El estado del pase ha cambiado en otro dispositivo.')
                fetchPasses(admin.organization_id)
                return
            }

            const { error: updateErr } = await supabase
                .from('visitor_passes')
                .update({ 
                    status: 'used',
                    used_at: new Date().toISOString()
                })
                .eq('id', pass.id)

            if (updateErr) throw updateErr
            
            toast.success(`Entrada registrada para ${pass.visitor_name}`)
            fetchPasses(admin.organization_id)
        } catch (error) {
            toast.error('Error al registrar la entrada')
        }
    }

    const handleCancelPass = async (id: string) => {
        try {
            const { error } = await supabase
                .from('visitor_passes')
                .update({ status: 'cancelled' })
                .eq('id', id)
            
            if (error) throw error
            toast.success('Pase cancelado correctamente')
            fetchPasses(admin.organization_id)
        } catch (error) {
            toast.error('Error al cancelar el pase')
        }
    }

    const getStatusConfig = (status: string) => {
        switch(status) {
            case 'pending': return { label: 'PENDIENTE', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock }
            case 'used': return { label: 'USADO', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 }
            case 'expired': return { label: 'EXPIRADO', color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: AlertCircle }
            case 'cancelled': return { label: 'CANCELADO', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: X }
            default: return { label: 'OCHO', color: 'bg-zinc-800 text-zinc-400 border-zinc-700', icon: AlertCircle }
        }
    }

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'guest': return <User className="w-5 h-5" />
            case 'service': return <ShieldCheck className="w-5 h-5" />
            case 'event': return <Gift className="w-5 h-5" />
            default: return <User className="w-5 h-5" />
        }
    }

    const filteredPasses = passes.filter(pass => {
        const displayStatus = getDisplayStatus(pass)
        const matchesStatus = filterStatus === 'all' || displayStatus === filterStatus
        const matchesType = filterType === 'all' || pass.access_type === filterType
        const matchesSearch = pass.visitor_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             pass.unit_name.toLowerCase().includes(searchTerm.toLowerCase())
        return matchesStatus && matchesType && matchesSearch
    })

    return (
        <div className="space-y-6">
            {/* Filters Bar */}
            <div className="flex flex-col lg:flex-row gap-4 p-4 bg-zinc-900/40 border border-zinc-800 rounded-2xl backdrop-blur-md">
                <div className="relative flex-1 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 h-4 w-4 transition-colors group-hover:text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o unidad..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-11 w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium"
                    />
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
                        <select 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="h-11 pl-9 pr-8 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 focus:outline-none appearance-none cursor-pointer hover:bg-zinc-900 transition-colors"
                        >
                            <option value="all">TODOS LOS ESTADOS</option>
                            <option value="pending">PENDIENTES</option>
                            <option value="used">USADOS</option>
                            <option value="expired">EXPIRADOS</option>
                            <option value="cancelled">CANCELADOS</option>
                        </select>
                    </div>

                    <div className="relative">
                        <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
                        <select 
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="h-11 pl-9 pr-8 bg-zinc-950/50 border border-zinc-800 rounded-xl text-xs font-bold text-zinc-400 focus:outline-none appearance-none cursor-pointer hover:bg-zinc-900 transition-colors"
                        >
                            <option value="all">TODOS LOS TIPOS</option>
                            <option value="guest">INVITADOS</option>
                            <option value="service">SERVICIOS</option>
                            <option value="event">EVENTOS</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {loading ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 opacity-50">
                        <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Cargando Accesos del Condominio...</p>
                    </div>
                ) : filteredPasses.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-30">
                        <QrCode size={64} className="mb-4 text-zinc-700" />
                        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs tracking-[0.2em]">No se encontraron accesos</p>
                    </div>
                ) : (
                    filteredPasses.map((pass) => {
                        const currentStatus = getDisplayStatus(pass)
                        const config = getStatusConfig(currentStatus)
                        const StatusIcon = config.icon

                        return (
                            <motion.div
                                key={pass.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="group relative"
                            >
                                <Card className="bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 transition-all overflow-hidden h-full">
                                    <CardContent className="p-0">
                                        <div className="p-6 pb-4">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                                                    pass.access_type === 'guest' ? 'bg-indigo-500/10 text-indigo-400' :
                                                    pass.access_type === 'service' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    'bg-purple-500/10 text-purple-400'
                                                }`}>
                                                    {getTypeIcon(pass.access_type)}
                                                </div>
                                                <Badge className={`px-3 py-1 rounded-lg font-black text-[9px] border uppercase tracking-widest ${config.color}`}>
                                                    <StatusIcon size={10} className="mr-1.5" />
                                                    {config.label}
                                                </Badge>
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">
                                                        {pass.visitor_name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 text-indigo-400">
                                                        <ShieldCheck className="w-3.5 h-3.5" />
                                                        <span className="text-xs font-black uppercase tracking-widest">{pass.unit_name}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-zinc-800/50">
                                                    <div>
                                                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Autorizado Por</p>
                                                        <p className="text-sm font-bold text-zinc-300 truncate">{pass.authorized_by_name}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Vigencia</p>
                                                        <div className="flex items-center gap-1.5 text-zinc-300">
                                                            <Clock size={12} className="text-zinc-500" />
                                                            <p className="text-sm font-bold">Hasta {pass.end_time.substring(0,5)} hs</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-6 py-4 bg-black/40 flex items-center justify-between gap-3">
                                            {currentStatus === 'pending' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleRegisterEntry(pass)}
                                                        className="h-12 flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl font-black text-[11px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
                                                    >
                                                        <CheckCircle2 size={16} /> Registrar Entrada
                                                    </button>
                                                    
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => window.open(`/${pass.qr_token}`, '_blank')}
                                                            title="Ver QR de acceso"
                                                            className="h-12 w-12 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl flex items-center justify-center transition-all"
                                                        >
                                                            <QrCode size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleCancelPass(pass.id)}
                                                            title="Cancelar Acceso"
                                                            className="h-12 w-12 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-xl flex items-center justify-center transition-all"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full h-12 flex items-center justify-center">
                                                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em]">Pase No Gestionable</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
