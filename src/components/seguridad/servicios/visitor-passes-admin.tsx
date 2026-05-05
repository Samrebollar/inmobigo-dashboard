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
    Filter,
    Trash2
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ConfirmDeleteModal } from './confirm-delete-modal'
import { deleteVisitorPassAction } from '@/app/actions/service-actions'

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
    const [passToDelete, setPassToDelete] = useState<VisitorPass | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const orgId = admin?.organization_id
        if (!orgId) return

        // 1. Sincronizar pases iniciales
        if (initialPasses) {
            setPasses(initialPasses)
            setLoading(false)
        }

        // 2. Suscripción Realtime para actualizaciones automáticas
        const channel = supabase
            .channel(`realtime-passes-${orgId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'visitor_passes',
                    filter: `organization_id=eq.${orgId}`
                },
                (payload) => {
                    console.log('🔥 Cambio en pases detectado:', payload)
                    
                    if (payload.eventType === 'INSERT') {
                        const newPass = payload.new as VisitorPass
                        setPasses(prev => [newPass, ...prev])
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedPass = payload.new as VisitorPass
                        setPasses(prev => prev.map(p => p.id === updatedPass.id ? updatedPass : p))
                    } else if (payload.eventType === 'DELETE') {
                        const deletedId = (payload.old as any).id
                        setPasses(prev => prev.filter(p => p.id !== deletedId))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [initialPasses, admin?.organization_id])

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
        
        try {
            const now = new Date()
            
            // Asegurarnos de que el formato de hora sea HH:mm:ss o HH:mm
            let timeStr = pass.end_time
            if (timeStr && timeStr.length === 5) timeStr += ':59' // Si es 21:00 -> 21:00:59
            if (!timeStr) timeStr = '23:59:59'

            // Construcción robusta de la fecha de fin
            const [year, month, day] = pass.visit_date.split('-').map(Number)
            const [hours, minutes, seconds] = timeStr.split(':').map(Number)
            
            const visitEndDateTime = new Date(year, month - 1, day, hours, minutes, seconds || 0)
            
            // Si la fecha es inválida, confiar en el estado de la base de datos
            if (isNaN(visitEndDateTime.getTime())) return pass.status

            return now > visitEndDateTime ? 'expired' : 'pending'
        } catch (e) {
            console.error('Error parsing pass expiration:', e)
            return pass.status
        }
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

    const handleDeletePass = async () => {
        if (!passToDelete) return
        
        try {
            setIsDeleting(true)
            
            // Usar Server Action para saltar RLS y asegurar el borrado
            const result = await deleteVisitorPassAction(passToDelete.id)
            
            if (!result.success) throw new Error(result.error)
            
            toast.success('Pase eliminado definitivamente de la base de datos')
            setPassToDelete(null)
            fetchPasses(admin.organization_id)
        } catch (error: any) {
            console.error('Delete Error:', error)
            toast.error(`Error al eliminar: ${error.message || 'Sin permiso'}`)
        } finally {
            setIsDeleting(false)
        }
    }

    const getStatusConfig = (status: string) => {
        switch(status) {
            case 'pending': return { label: 'PENDIENTE', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock }
            case 'used': return { label: 'REGISTRADO', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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

                        // Map access type labels
                        const typeLabels = {
                            guest: 'INVITADO',
                            service: 'SERVICIO',
                            event: 'EVENTO'
                        }

                        return (
                            <motion.div
                                key={pass.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                                className="group relative"
                            >
                                <Card className="bg-zinc-900/40 border-zinc-800/40 hover:border-zinc-700/50 hover:bg-zinc-900/60 transition-all duration-300 backdrop-blur-md overflow-hidden h-full flex flex-col shadow-2xl">
                                    <CardContent className="p-0 flex flex-col h-full">
                                        <div className="p-5 flex-1 space-y-5">
                                            {/* Header: Icon + Status */}
                                            <div className="flex justify-between items-start">
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                                                    pass.access_type === 'guest' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                                                    pass.access_type === 'service' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                }`}>
                                                    {getTypeIcon(pass.access_type)}
                                                    <span className="text-[10px] font-black tracking-widest">{typeLabels[pass.access_type]}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={`px-2.5 py-1 rounded-lg font-black text-[9px] border uppercase tracking-widest ${config.color} shadow-sm`}>
                                                        <StatusIcon size={10} className="mr-1.5" />
                                                        {config.label}
                                                    </Badge>
                                                    
                                                    {/* Botón de Borrado Profesional */}
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setPassToDelete(pass)
                                                        }}
                                                        className="p-1.5 rounded-lg border bg-zinc-800/50 text-zinc-500 border-zinc-700 hover:text-red-400 hover:border-red-500/30 transition-all"
                                                        title="Eliminar pase"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Visitor Info */}
                                            <div>
                                                <h3 className="text-xl font-black text-white tracking-tight leading-tight mb-1 group-hover:text-indigo-400 transition-colors">
                                                    {pass.visitor_name}
                                                </h3>
                                                
                                                <div className="flex items-center gap-2 mb-4">
                                                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{pass.organization_name}</span>
                                                    <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{pass.unit_name}</span>
                                                </div>
                                            </div>

                                            {/* Authorized and Time Grid */}
                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800/40">
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Autorizado Por</p>
                                                    <p className="text-xs font-bold text-zinc-400 truncate">{pass.authorized_by_name}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Vigencia Termina</p>
                                                    <div className="flex items-center gap-1.5 text-emerald-500/80">
                                                        <Clock size={10} />
                                                        <p className="text-xs font-bold">{pass.end_time.substring(0,5)} HS</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="px-5 py-4 bg-black/40 border-t border-zinc-800/40 flex items-center justify-between gap-2">
                                            {currentStatus === 'pending' ? (
                                                <>
                                                    <button 
                                                        onClick={() => handleRegisterEntry(pass)}
                                                        className="h-10 flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl font-black text-[10px] uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/20"
                                                    >
                                                        <CheckCircle2 size={14} /> Registrar Entrada
                                                    </button>
                                                    
                                                    <div className="flex gap-1.5">
                                                        <button 
                                                            onClick={() => window.open(`/${pass.qr_token}`, '_blank')}
                                                            title="Ver QR"
                                                            className="h-10 w-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl flex items-center justify-center transition-all border border-zinc-700/50"
                                                        >
                                                            <QrCode size={16} />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleCancelPass(pass.id)}
                                                            title="Cancelar"
                                                            className="h-10 w-10 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 rounded-xl flex items-center justify-center transition-all"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className={`w-full h-10 flex items-center justify-center rounded-xl border transition-all duration-500 ${
                                                    (currentStatus === 'used' || pass.status === 'used')
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                                                        : 'bg-zinc-800/10 border-zinc-800/30'
                                                }`}>
                                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                                                        (currentStatus === 'used' || pass.status === 'used') ? 'text-emerald-400' : 'text-zinc-500'
                                                    }`}>
                                                        {(currentStatus === 'used' || pass.status === 'used') ? 'Visita Ingresada' : 'Pase No Gestionable'}
                                                    </p>
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

            {/* Modal de Confirmación de Borrado */}
            <ConfirmDeleteModal 
                isOpen={!!passToDelete}
                onClose={() => setPassToDelete(null)}
                onConfirm={handleDeletePass}
                visitorName={passToDelete?.visitor_name || ''}
                isLoading={isDeleting}
            />
        </div>
    )
}

