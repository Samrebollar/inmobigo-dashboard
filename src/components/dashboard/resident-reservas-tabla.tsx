'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Calendar, 
    MoreVertical, 
    Pencil, 
    Trash2, 
    XCircle,
    CheckCircle2,
    Clock,
    AlertCircle,
    ArrowLeft,
    Loader2,
    CreditCard
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

function ReservationRow({ reserva, onUpdate, onDeleteClick }: { reserva: any, onUpdate: () => void, onDeleteClick: (reserva: any) => void }) {
    const [showMenu, setShowMenu] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false)
            }
        }
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showMenu])

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 px-2.5 py-1">
                        <CheckCircle2 size={12}/> Aprobada
                    </Badge>
                )
            case 'pending':
                return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1.5 px-2.5 py-1 text-xs font-bold uppercase"><Clock size={12}/> Pendiente</Badge>
            case 'cancelled':
                return <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 gap-1.5 px-2.5 py-1 text-xs font-bold uppercase"><XCircle size={12}/> Cancelada</Badge>
            default:
                return <Badge className="bg-zinc-500/10 text-zinc-500 border-zinc-500/20 px-2.5 py-1 uppercase">{status}</Badge>
        }
    }

    const handleCancel = async () => {
        setIsCancelling(true)
        setShowMenu(false)
        try {
            const { error } = await supabase
                .from('amenity_reservations')
                .update({ status: 'cancelled' })
                .eq('id', reserva.id)
            
            if (error) throw error
            onUpdate()
        } catch (error: any) {
            console.error('Error cancelling reservation:', error)
            alert('Error al cancelar: ' + error.message)
        } finally {
            setIsCancelling(false)
        }
    }



    return (
        <tr className="group hover:bg-white/[0.02] transition-colors relative text-center">
            {/* 1. Amenidad */}
            <td className="px-4 py-6">
                <p className="text-white font-bold text-sm whitespace-nowrap text-center">{reserva.amenities?.name || 'Amenidad'}</p>
            </td>
            
            {/* 2. Fecha de reserva */}
            <td className="px-4 py-6">
                <p className="text-white font-bold text-sm whitespace-nowrap text-center">{format(new Date(reserva.reservation_date), 'd MMM yyyy', { locale: es })}</p>
            </td>
            
            {/* 3. Horario de servicio */}
            <td className="px-4 py-6">
                <p className="text-zinc-300 font-medium text-sm whitespace-nowrap text-center">
                    {reserva.amenities?.use_hours || 'N/A'}
                </p>
            </td>

            {/* 4. Capacidad Maxima */}
            <td className="px-4 py-6">
                <p className="text-amber-400 font-bold text-sm whitespace-nowrap text-center">
                    {reserva.amenities?.capacity ? `${reserva.amenities.capacity} Pax` : 'N/A'}
                </p>
            </td>

            {/* 5. Deposito en Garantia (Total) */}
            <td className="px-4 py-6">
                <p className="text-white font-bold text-sm whitespace-nowrap text-center">
                    ${((reserva.amenities?.base_price || 0) + (reserva.amenities?.deposit_required ? reserva.amenities.deposit_amount : 0)).toLocaleString('en-US')} MXN
                </p>
            </td>

            {/* 6. Reglamento */}
            <td className="px-4 py-6">
                <div className="flex justify-center">
                    {/* Como el formulario frontal no permite reservar sin aceptar, siempre es true implícitamente */}
                    <CheckCircle2 size={20} className="text-emerald-500" />
                </div>
            </td>

            {/* 7. Confirmacion */}
            <td className="px-4 py-6">
                {getStatusBadge(reserva.status)}
            </td>

            {/* 8. Acciones inline */}
            <td className="px-4 py-6">
                <div className="flex items-center justify-center gap-3">
                    {/* Payment Action Icon */}
                    {reserva.status === 'approved' && ((reserva.amenities?.base_price || 0) + (reserva.amenities?.deposit_required ? reserva.amenities.deposit_amount : 0)) > 0 ? (
                        <button 
                            onClick={() => alert('Pasarela de pago próximamente')} 
                            className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all group relative border border-indigo-500/20"
                            title="Pagar E-Ticket"
                        >
                            <CreditCard size={14} />
                        </button>
                    ) : reserva.status === 'pending' && ((reserva.amenities?.base_price || 0) + (reserva.amenities?.deposit_required ? reserva.amenities.deposit_amount : 0)) > 0 ? (
                        <div 
                            className="h-8 w-8 rounded-lg bg-amber-500/5 text-amber-500/60 flex items-center justify-center cursor-not-allowed border border-amber-500/10"
                            title="Pendiente de autorización"
                        >
                            <Clock size={14} />
                        </div>
                    ) : null}

                    {/* Cancel Action Icon */}
                    {reserva.status === 'pending' && (
                        <button 
                            onClick={handleCancel}
                            disabled={isCancelling}
                            className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white flex items-center justify-center transition-all disabled:opacity-50"
                            title="Cancelar Reserva"
                        >
                            {isCancelling ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                        </button>
                    )}

                    {/* Delete Action Icon */}
                    <button 
                        onClick={() => onDeleteClick(reserva)}
                        className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-all border border-transparent"
                        title="Eliminar Historial"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    )
}

export default function ResidentReservasTabla({ resident }: { resident: any }) {
    const supabase = createClient()
    const [reservas, setReservas] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [deletingReserva, setDeletingReserva] = useState<any | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    const fetchReservas = async () => {
        setLoading(true)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return;

            const { data, error } = await supabase
                .from('amenity_reservations')
                .select('*, amenities(*)')
                .eq('resident_id', user.id)
                .order('reservation_date', { ascending: false })

            if (!error && data) {
                setReservas(data)
            }
        } catch (error) {
            console.error('Error fetching reservas:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleParentConfirmDelete = async () => {
        if (!deletingReserva) return
        
        setIsDeleting(true)
        try {
            const { error } = await supabase
                .from('amenity_reservations')
                .delete()
                .eq('id', deletingReserva.id)
            
            if (error) throw error
            fetchReservas() // Update local state
        } catch (error: any) {
            console.error('Error deleting reservation:', error)
            alert('Error al eliminar: ' + error.message)
        } finally {
            setIsDeleting(false)
            setDeletingReserva(null)
        }
    }

    useEffect(() => {
        fetchReservas()

        if (resident?.user_id) {
            const channel = supabase
                .channel('resident-amenity-reservations')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'amenity_reservations',
                        filter: `resident_id=eq.${resident.user_id}`
                    },
                    (payload) => {
                        console.log('Realtime Event (Resident):', payload)
                        fetchReservas()
                    }
                )
                .subscribe()

            return () => {
                supabase.removeChannel(channel)
            }
        }
    }, [resident.user_id])

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10 min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <Link href="/dashboard/amenidades">
                        <Button variant="ghost" className="text-zinc-500 hover:text-white gap-2 p-0 -ml-1 mb-2">
                            <ArrowLeft size={16} /> Volver a Amenidades
                        </Button>
                    </Link>
                    <h1 className="text-4xl font-black text-white tracking-tight italic">Mis Reservas</h1>
                    <p className="text-zinc-500 font-medium">Gestiona y consulta el historial de tus espacios reservados.</p>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl overflow-x-auto custom-scrollbar">
                <div className="min-w-max">
                    <table className="w-full text-center border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/30">
                                <th className="px-4 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Amenidad</th>
                                <th className="px-4 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Fecha de reserva</th>
                                <th className="px-4 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Horario de servicio</th>
                                <th className="px-4 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Capacidad Maxima</th>
                                <th className="px-4 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Deposito en Garantia</th>
                                <th className="px-4 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Reglamento</th>
                                <th className="px-4 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Confirmacion</th>
                                <th className="px-4 py-6 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={8} className="px-8 py-8"><div className="h-10 bg-zinc-800 rounded-xl w-full opacity-50"></div></td>
                                    </tr>
                                ))
                            ) : reservas.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-zinc-600">
                                            <AlertCircle size={48} className="opacity-20" />
                                            <p className="font-bold">No tienes reservas registradas aún.</p>
                                            <Link href="/dashboard/amenidades">
                                                <Button variant="outline" className="border-indigo-500/20 text-indigo-400 font-black h-12 rounded-2xl px-6 text-xs uppercase tracking-widest">Reservar Ahora</Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                reservas.map((reserva) => (
                                    <ReservationRow 
                                        key={reserva.id} 
                                        reserva={reserva} 
                                        onUpdate={fetchReservas} 
                                        onDeleteClick={(res) => setDeletingReserva(res)} 
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hint */}
            <div className="p-8 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-6">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <AlertCircle size={20} />
                </div>
                <div className="space-y-1">
                    <p className="text-indigo-400 font-black text-[10px] uppercase tracking-widest">Información de Cancelación</p>
                    <p className="text-sm text-zinc-500 font-medium leading-relaxed">
                        Las cancelaciones deben realizarse con al menos 24 horas de anticipación para el reembolso del depósito (si aplica). Las reservas aprobadas requieren contacto directo con la administración para cambios de fecha.
                    </p>
                </div>
            </div>

            {/* Global Delete Modal */}
            <AnimatePresence>
                {deletingReserva && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md"
                            onClick={() => !isDeleting && setDeletingReserva(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800/80 rounded-[2.5rem] shadow-[0_0_50px_rgba(244,63,94,0.15)] p-8 text-center overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 blur-3xl rounded-full" />
                            
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="h-20 w-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6 border-8 border-zinc-900 shadow-inner">
                                    <Trash2 className="h-8 w-8 text-rose-500" strokeWidth={1.5} />
                                </div>
                                
                                <h3 className="text-2xl font-black text-white tracking-tight mb-2">Eliminar Historial</h3>
                                <div className="h-1 w-10 bg-rose-500/50 rounded-full mb-6" />

                                <p className="text-sm text-zinc-400 leading-relaxed font-medium mb-6">
                                    ¿Estás seguro de que deseas eliminar la reserva de <span className="text-white font-bold">{deletingReserva.amenities?.name || 'la amenidad'}</span>? 
                                </p>
                                
                                <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center justify-center gap-2 w-full mb-8">
                                    <AlertCircle size={14} className="text-rose-500 shrink-0" />
                                    <p className="text-[11px] text-rose-400 font-bold tracking-tight uppercase">
                                        Esta acción no puede deshacerse
                                    </p>
                                </div>
                                
                                <div className="flex gap-3 w-full">
                                    <Button 
                                        variant="outline" 
                                        onClick={() => setDeletingReserva(null)}
                                        disabled={isDeleting}
                                        className="flex-1 bg-transparent border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-2xl h-14 font-bold text-[11px] uppercase tracking-widest transition-all"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button 
                                        onClick={handleParentConfirmDelete}
                                        disabled={isDeleting}
                                        className="flex-1 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl h-14 font-black text-[11px] uppercase tracking-widest shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all"
                                    >
                                        {isDeleting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
                                        Confirmar
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
