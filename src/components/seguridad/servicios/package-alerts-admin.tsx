'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { 
    Package, 
    Clock, 
    CheckCircle2, 
    XCircle,
    User,
    MapPin,
    PackageCheck,
    Archive,
    Trash2,
    Building2,
    Truck
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { updatePackageAlertStatusAction, deletePackageAlertAction } from '@/app/actions/service-actions'
import { ConfirmDeleteModal } from './confirm-delete-modal'

interface PackageAlert {
    id: string
    organization_id: string
    organization_name?: string
    resident_id: string
    resident_name: string
    unit_name: string
    carrier: string
    notes: string
    status: 'pending' | 'received' | 'closed'
    created_at: string
}

export function PackageAlertsAdmin({ 
    admin, 
    initialAlerts = [] 
}: { 
    admin: any, 
    initialAlerts?: PackageAlert[] 
}) {
    const supabase = createClient()
    const [alerts, setAlerts] = useState<PackageAlert[]>(initialAlerts)
    const [loading, setLoading] = useState(initialAlerts.length === 0)
    const [alertToDelete, setAlertToDelete] = useState<PackageAlert | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        if (!admin?.organization_id) return
        
        // Sincronizar el estado local con las props del padre (que ahora maneja el Realtime)
        if (initialAlerts) {
            const formattedData = initialAlerts.map((item: any) => ({
                ...item,
                organization_name: item.organization_name || 'Las Palmas'
            }))
            setAlerts(formattedData)
            setLoading(false)
        }
    }, [initialAlerts, admin?.organization_id])

    const fetchAlerts = async () => {
        // Esta función se mantiene como fallback o para recarga manual
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('package_alerts')
                .select('*')
                .eq('organization_id', admin.organization_id)
                .in('status', ['pending', 'received'])
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error Supabase al cargar alertas:', error)
                throw error
            }

            const formattedData = data?.map((item: any) => ({
                ...item,
                organization_name: item.organization_name || 'Las Palmas'
            }))
            setAlerts(formattedData || [])
        } catch (error: any) {
            console.error('Error fetching package alerts:', error)
            toast.error('Error al cargar alertas de paquetería')
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStatus = async (id: string, newStatus: 'received' | 'closed') => {
        try {
            // Usar user_id del objeto admin (que viene de auth.user)
            const adminUserId = admin.user_id || admin.id

            // Llamar a Server Action para saltar RLS y asegurar auditoría
            const result = await updatePackageAlertStatusAction({
                id,
                status: newStatus,
                adminUserId
            })
            
            if (!result.success) throw new Error(result.error)
            
            toast.success(`Alerta marcada como ${newStatus === 'received' ? 'recibida' : 'cerrada'}`)
            
            if (newStatus === 'closed') {
                setAlerts(prev => prev.filter(a => a.id !== id))
            }
        } catch (error: any) {
            console.error('Error updating status:', error)
            toast.error(`Error: ${error.message || 'No se pudo actualizar el estado'}`)
        }
    }

    const handleDeleteAlert = async () => {
        if (!alertToDelete) return

        try {
            setIsDeleting(true)
            const result = await deletePackageAlertAction(alertToDelete.id)
            
            if (!result.success) throw new Error(result.error)
            
            toast.success('Alerta eliminada definitivamente')
            setAlerts(prev => prev.filter(a => a.id !== alertToDelete.id))
            setAlertToDelete(null)
        } catch (error: any) {
            console.error('Error deleting alert:', error)
            toast.error(`Error: ${error.message || 'No se pudo eliminar la alerta'}`)
        } finally {
            setIsDeleting(false)
        }
    }

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'pending':
                return {
                    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
                    label: 'Pendiente',
                    dot: 'bg-amber-500'
                }
            case 'received':
                return {
                    bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
                    label: 'En Caseta',
                    dot: 'bg-indigo-500'
                }
            default:
                return {
                    bg: 'bg-zinc-800 border-zinc-700 text-zinc-500',
                    label: 'Cerrado',
                    dot: 'bg-zinc-600'
                }
        }
    }

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="h-40 bg-zinc-900/40 border border-zinc-800 rounded-2xl animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                        <Package size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Gestión de Paquetería</h2>
                        <p className="text-xs text-zinc-500 font-medium">Alertas de llegada de residentes.</p>
                    </div>
                </div>
                <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
                    {alerts.length} Avisos Activos
                </div>
            </div>

            {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 border-2 border-dashed border-zinc-800 rounded-[2.5rem] bg-zinc-900/20">
                    <Archive size={48} className="text-zinc-800 mb-4" />
                    <h3 className="text-zinc-400 font-bold text-lg">No hay avisos de paquetería activos</h3>
                    <p className="text-zinc-600 text-sm mt-1">Los nuevos avisos aparecerán aquí automáticamente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <AnimatePresence mode="popLayout">
                        {alerts.map((alert) => {
                            const styles = getStatusStyles(alert.status)
                            return (
                                <motion.div
                                    layout
                                    key={alert.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                                    className="relative group h-full"
                                >
                                    {/* SaaS Glowing Border Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-[2rem] opacity-0 group-hover:opacity-100 blur-[2px] transition-opacity duration-300" />
                                    <div className="absolute inset-[1px] bg-zinc-950 rounded-[1.95rem] z-[1]" />

                                    <div className="relative z-10 bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] p-6 h-full flex flex-col shadow-2xl overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                            <Package size={120} />
                                        </div>

                                        <div className="flex justify-end items-start mb-6">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Registrado</span>
                                                <span className="text-xs text-white font-bold tracking-tighter">
                                                    {format(new Date(alert.created_at), 'p', { locale: es })}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-6 flex-1">
                                            <div>
                                                <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.2em] mb-1.5">Empresa / Envío</p>
                                                <h4 className="text-2xl font-black text-white italic tracking-tight leading-none uppercase">{alert.carrier}</h4>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                                    <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-indigo-400">
                                                        <User size={18} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Residente</p>
                                                        <p className="text-sm font-bold text-white truncate">{alert.resident_name}</p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                                        <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-emerald-400">
                                                            <MapPin size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Unidad</p>
                                                            <p className="text-sm font-bold text-white truncate">{alert.unit_name}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5">
                                                        <div className="h-10 w-10 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-400">
                                                            <Building2 size={18} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Org</p>
                                                            <p className="text-sm font-bold text-white truncate">{alert.organization_name || 'Las Palmas'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                        {alert.notes && (
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <p className="text-sm font-bold text-white italic leading-relaxed">
                                                    "{alert.notes}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                        <div className="pt-2 flex gap-3 relative z-20">
                                            {alert.status === 'pending' && (
                                                <button
                                                    onClick={() => handleUpdateStatus(alert.id, 'received')}
                                                    className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20 active:scale-95 flex items-center justify-center gap-3"
                                                >
                                                    <Truck size={18} /> Autorizar acceso
                                                </button>
                                            )}
                                            
                                            <button
                                                onClick={() => handleUpdateStatus(alert.id, 'closed')}
                                                className={`h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                                    alert.status === 'received' 
                                                    ? 'flex-1 bg-zinc-800 hover:bg-emerald-600 text-zinc-400 hover:text-white border border-zinc-700 hover:border-emerald-500 shadow-xl' 
                                                    : 'w-12 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-700/30'
                                                }`}
                                                title="Cerrar Alerta"
                                            >
                                                {alert.status === 'received' ? <><CheckCircle2 size={18} /> Entregado / Cerrar</> : <XCircle size={18} />}
                                            </button>

                                            <button
                                                onClick={() => setAlertToDelete(alert)}
                                                className="w-12 h-12 bg-zinc-800/10 hover:bg-rose-500/20 text-zinc-600 hover:text-rose-500 border border-zinc-800 hover:border-rose-500/30 rounded-2xl transition-all active:scale-95 flex items-center justify-center"
                                                title="Eliminar permanentemente de la base de datos"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                </div>
            )}

            <ConfirmDeleteModal 
                isOpen={!!alertToDelete}
                onClose={() => setAlertToDelete(null)}
                onConfirm={handleDeleteAlert}
                visitorName={alertToDelete?.carrier || ''}
                isLoading={isDeleting}
            />
        </div>
    )
}

