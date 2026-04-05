'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    ShieldCheck,
    Calendar,
    Users,
    Info,
    PartyPopper,
    Waves,
    Dumbbell,
    Flame,
    ChevronRight,
    X,
    CheckCircle2,
    CalendarDays,
    ArrowRight,
    CreditCard,
    FileText,
    DownloadCloud
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { getAmenitiesAction, createAmenityReservationAction } from '@/app/actions/service-actions'
import { 
    format, 
    isSameDay, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isToday, 
    addMonths, 
    subMonths 
} from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface Amenity {
    id: string
    name: string
    description: string
    icon_name: string
    base_price: number
    deposit_required: boolean
    deposit_amount: number
    rules: string
    color: string
    status?: string
}

const DEFAULT_AMENITIES = [
    {
        name: 'Salón de Fiestas',
        description: 'Espacio elegante para eventos sociales con cocina equipada y mobiliario premium.',
        icon_name: 'PartyPopper',
        base_price: 2500,
        deposit_required: true,
        deposit_amount: 5000,
        capacity: 100,
        rules: 'No se permite música después de las 12 AM. Máximo 100 personas.',
        color: 'from-purple-600 to-indigo-600'
    },
    {
        name: 'Alberca Infinity',
        description: 'Relájate en nuestra alberca climatizada con vistas panorámicas a la ciudad.',
        icon_name: 'Waves',
        base_price: 0,
        deposit_required: false,
        deposit_amount: 0,
        capacity: 30,
        rules: 'Uso obligatorio de traje de baño. No se permiten envases de vidrio.',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        name: 'Gimnasio Pro',
        description: 'Equipamiento de última generación para cardio y pesas. Abierto 24/7.',
        icon_name: 'Dumbbell',
        base_price: 0,
        deposit_required: false,
        deposit_amount: 0,
        capacity: 15,
        rules: 'Uso de toalla obligatorio. Limpiar equipo después de usar.',
        color: 'from-rose-500 to-orange-500'
    },
    {
        name: 'Área de Asadores',
        description: 'Zona al aire libre con asadores de gas, mesas y pérgola para convivencias.',
        icon_name: 'Flame',
        base_price: 500,
        deposit_required: true,
        deposit_amount: 1000,
        capacity: 12,
        rules: 'Dejar el asador limpio. Duración máxima de 5 horas.',
        color: 'from-orange-600 to-amber-500'
    }
]

const getIcon = (name: string) => {
    switch (name) {
        case 'PartyPopper': return <PartyPopper className="h-6 w-6" />
        case 'Waves': return <Waves className="h-6 w-6" />
        case 'Dumbbell': return <Dumbbell className="h-6 w-6" />
        case 'Flame': return <Flame className="h-6 w-6" />
        default: return <Info className="h-6 w-6" />
    }
}

export default function ResidentAmenidadesClient({ resident }: { resident: any }) {
    const supabase = createClient()
    const [amenities, setAmenities] = useState<Amenity[]>([])
    const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null)
    const [bookingDate, setBookingDate] = useState<Date>(new Date())
    const [viewDate, setViewDate] = useState<Date>(new Date())
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [showSuccess, setShowSuccess] = useState(false)
    const [acceptedRules, setAcceptedRules] = useState(false)

    useEffect(() => {
        fetchAmenities()
    }, [resident?.organization_id])

    const fetchAmenities = async () => {
        let orgId = resident?.organization_id

        if (!orgId) {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: orgUser } = await supabase
                        .from('organization_users')
                        .select('organization_id')
                        .eq('user_id', user.id)
                        .maybeSingle()
                    if (orgUser?.organization_id) orgId = orgUser.organization_id
                }
            } catch (e) {
                console.error('Error fallback orgId:', e)
            }
        }

        if (!orgId) {
            setFetching(false)
            return
        }

        setFetching(true)
        try {
            const result = await getAmenitiesAction(orgId)
            
            if (result.success && result.data && result.data.length > 0) {
                setAmenities(result.data)
            } else if (result.success) {
                // Si llegamos aquí con orgId válidopero sin datos, intentamos sembrar
                const amenitiesToSeed = DEFAULT_AMENITIES.map(a => ({
                    ...a,
                    organization_id: orgId
                }))
                
                // Usamos la Server Action para insertar (bypass RLS)
                // Añado una nueva acción para insertar masivamente si es necesario
                const { data: seededData, error: seedError } = await supabase
                    .from('amenities')
                    .insert(amenitiesToSeed)
                    .select()

                if (seededData) setAmenities(seededData)
            }
        } catch (error) {
            console.error('Error grave en fetchAmenities:', error)
        } finally {
            setFetching(false)
        }
    }

    // Calendar logic
    const monthStart = startOfMonth(viewDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)
    
    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    })

    const prevMonth = () => setViewDate(subMonths(viewDate, 1))
    const nextMonth = () => setViewDate(addMonths(viewDate, 1))

    const handleBooking = async () => {
        if (!selectedAmenity) return
        setLoading(true)
        
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("No autenticado")

            // Priorizar orgId de la amenidad, luego el del objeto resident, 
            // y como último recurso, consultar la tabla organization_users
            let orgId = (selectedAmenity as any).organization_id || resident?.organization_id

            if (!orgId) {
                const { data: orgUser } = await supabase
                    .from('organization_users')
                    .select('organization_id')
                    .eq('user_id', user.id)
                    .single()
                
                if (orgUser?.organization_id) orgId = orgUser.organization_id
            }

            if (!orgId) {
                throw new Error("No se pudo identificar tu organización. Por favor, re-inicia sesión.")
            }

            // Realizar la reserva a través de Server Action (Bypass RLS)
            const result = await createAmenityReservationAction({
                amenity_id: selectedAmenity.id,
                resident_id: user.id,
                organization_id: orgId,
                reservation_date: format(bookingDate, 'yyyy-MM-dd'),
                status: 'pending'
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            setShowSuccess(true)
            toast.success('¡Reserva solicitada con éxito!')
        } catch (error: any) {
            console.error('Error detallado booking:', error)
            
            const errorMsg = error.message || 'Error desconocido al procesar la reserva'
            alert(`Error al reservar: ${errorMsg}`)
            toast.error(`Error: ${errorMsg}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-12 p-6 md:p-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1 rounded-lg font-black uppercase tracking-[0.2em] text-[10px] mb-2">
                            Explora y Reserva
                        </Badge>
                        <h1 className="text-5xl font-black text-white tracking-tight italic">Amenidades</h1>
                        <p className="text-zinc-500 font-medium">Gestiona tus espacios y vive la experiencia {resident?.condominiums?.name || 'InmobiGo'}.</p>
                    </motion.div>
                </div>
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 p-4 rounded-3xl flex items-center gap-6 shadow-2xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <CalendarDays className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest leading-none mb-1">Hoy</p>
                            <p className="text-sm font-bold text-white">{format(new Date(), 'EEEE, d MMM', { locale: es })}</p>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Grid Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {fetching ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-[400px] rounded-[2.5rem] bg-zinc-900/40 border border-zinc-800 animate-pulse" />
                    ))
                ) : (
                    amenities.map((amenity, index) => {
                        const isMaintenance = amenity.status === 'maintenance';
                        return (
                        <motion.div
                            key={amenity.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={isMaintenance ? {} : { y: -8, scale: 1.02 }}
                            onClick={() => {
                                if (isMaintenance) {
                                    toast.error('Este espacio se encuentra temporalmente fuera de servicio por mantenimiento.');
                                    return;
                                }
                                setSelectedAmenity(amenity)
                                setAcceptedRules(false)
                                setViewDate(new Date()) 
                            }}
                            className={`group relative ${isMaintenance ? 'cursor-not-allowed opacity-[0.85]' : 'cursor-pointer'}`}
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${amenity.color} opacity-0 ${isMaintenance ? '' : 'group-hover:opacity-10'} rounded-[2.5rem] transition-opacity duration-500 blur-2xl`} />
                            <div className="relative bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-[2.5rem] p-8 h-full flex flex-col justify-between overflow-hidden shadow-xl transition-all group-hover:border-white/20 group-hover:bg-zinc-900/80">
                                
                                <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <div className="scale-[4]">
                                        {getIcon(amenity.icon_name)}
                                    </div>
                                </div>

                                <div className="space-y-6 relative z-10">
                                    <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${isMaintenance ? 'from-orange-800 to-orange-950 grayscale' : amenity.color} flex items-center justify-center text-white shadow-lg`}>
                                        {getIcon(amenity.icon_name)}
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className={`text-2xl font-black tracking-tight ${isMaintenance ? 'text-zinc-400' : 'text-white'}`}>{amenity.name}</h3>
                                            {isMaintenance && (
                                                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[9px] uppercase font-black px-2 py-0.5 shrink-0 animate-pulse pointer-events-none">
                                                    Mantenimiento
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-zinc-500 text-xs leading-relaxed font-medium line-clamp-3 group-hover:text-zinc-400 transition-colors">
                                            {amenity.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="bg-zinc-950/50 border-zinc-800 text-[9px] font-black uppercase text-zinc-400 py-1">
                                            <Users className="h-3 w-3 mr-1" /> {amenity.capacity} Pers.
                                        </Badge>
                                        <Badge variant="outline" className="bg-zinc-950/50 border-zinc-800 text-[9px] font-black uppercase text-zinc-400 py-1">
                                            {((amenity.base_price || 0) + (amenity.deposit_required ? (amenity.deposit_amount || 0) : 0)) > 0 
                                                ? `$${((amenity.base_price || 0) + (amenity.deposit_required ? (amenity.deposit_amount || 0) : 0)).toLocaleString('en-US')} MXN` 
                                                : 'Gratis'}
                                        </Badge>
                                        {amenity.deposit_required && (
                                            <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-[9px] font-black uppercase text-amber-500 py-1">
                                                Depósito
                                            </Badge>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-10 flex items-center justify-between relative z-10">
                                    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isMaintenance ? 'text-orange-500/60' : 'text-zinc-600 group-hover:text-white'}`}>
                                        {isMaintenance ? 'Fuera de Servicio' : 'Ver disponibilidad'}
                                    </span>
                                    <div className={`h-8 w-8 rounded-full border flex items-center justify-center transition-all ${isMaintenance ? 'border-orange-500/20 text-orange-500/40' : 'border-zinc-800 group-hover:bg-white group-hover:text-zinc-950'}`}>
                                        <ChevronRight size={16} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )})
                )}
            </div>

            {/* Summary / Stats (Mock) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6"
            >
                <Link href="/dashboard/amenidades/reservas" className="block group">
                    <div className="p-8 h-full rounded-[2.5rem] bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-between group-hover:bg-indigo-600/20 group-hover:border-indigo-500/40 transition-all overflow-hidden relative">
                        <div className="absolute inset-0 bg-grid-indigo-500/[0.05] bg-[length:20px_20px]" />
                        <div className="relative z-10">
                            <p className="text-zinc-400 group-hover:text-indigo-300 font-black text-[10px] uppercase tracking-[0.2em] mb-1 transition-colors">Tus Reservas</p>
                            <h4 className="text-3xl font-black text-white">Ver Historial</h4>
                        </div>
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center relative z-10 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all">
                            <Calendar size={24} />
                        </div>
                    </div>
                </Link>

                <div className="md:col-span-2 p-8 rounded-[2.5rem] bg-zinc-900/60 border border-zinc-800 flex items-center justify-between gap-8 h-full">
                    <div className="flex-1 space-y-2">
                        <p className="text-zinc-500 font-bold text-xs">Aviso importante</p>
                        <p className="text-sm font-medium text-zinc-300">Todas las reservaciones deben ser confirmadas por la administración. Los eventos del fin de semana requieren 48h de anticipación.</p>
                    </div>
                    <Button variant="outline" className="border-indigo-500/30 bg-indigo-500/5 text-indigo-400 font-black h-12 rounded-2xl px-6 text-xs uppercase tracking-widest shrink-0">
                        Reglamento General
                    </Button>
                </div>
            </motion.div>

            {/* Booking Modal */}
            <AnimatePresence>
                {selectedAmenity && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedAmenity(null)}
                            className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl"
                        />
                        
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[3rem] shadow-3xl overflow-hidden"
                        >
                            {!showSuccess ? (
                                <div className="flex flex-col md:flex-row h-full">
                                    <div className={`w-full md:w-2 whitespace-nowrap bg-gradient-to-b ${selectedAmenity.color}`} />
                                    
                                    <div className="p-10 flex-1 space-y-8">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <Badge className="bg-white/10 text-white border-white/20 uppercase tracking-widest text-[10px] font-black">Solicitud de Reserva</Badge>
                                                <h2 className="text-4xl font-black text-white italic">{selectedAmenity.name}</h2>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedAmenity(null)}
                                                className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                                            <div className="lg:col-span-3 space-y-6">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest italic">1. Selecciona Fecha</p>
                                                    <div className="flex items-center gap-4">
                                                        <button onClick={prevMonth} className="h-8 w-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                                                            <ChevronRight className="h-4 w-4 rotate-180" />
                                                        </button>
                                                        <span className="text-sm font-black text-white min-w-[120px] text-center uppercase tracking-widest">
                                                            {format(viewDate, 'MMMM yyyy', { locale: es })}
                                                        </span>
                                                        <button onClick={nextMonth} className="h-8 w-8 rounded-full border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-3xl p-6">
                                                    <div className="grid grid-cols-7 gap-1 mb-4">
                                                        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                                                            <div key={day} className="text-[10px] font-black text-zinc-600 text-center uppercase py-2">
                                                                {day}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="grid grid-cols-7 gap-1">
                                                        {calendarDays.map((day) => {
                                                            const isSelected = isSameDay(day, bookingDate)
                                                            const isCurMonth = isSameMonth(day, viewDate)
                                                            const isPast = day < new Date(new Date().setHours(0,0,0,0))

                                                            return (
                                                                <button
                                                                    key={day.toISOString()}
                                                                    disabled={isPast}
                                                                    onClick={() => setBookingDate(day)}
                                                                    className={`
                                                                        relative h-12 w-full rounded-xl flex flex-col items-center justify-center text-sm font-bold transition-all
                                                                        ${!isCurMonth ? 'opacity-20' : ''}
                                                                        ${isSelected 
                                                                            ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)] z-10 scale-105' 
                                                                            : isPast 
                                                                                ? 'text-zinc-700 cursor-not-allowed' 
                                                                                : 'text-zinc-400 hover:bg-zinc-800/80 hover:text-white'
                                                                        }
                                                                    `}
                                                                >
                                                                    {format(day, 'd')}
                                                                    {isToday(day) && !isSelected && (
                                                                        <div className="absolute bottom-1.5 h-1 w-1 rounded-full bg-indigo-500" />
                                                                    )}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="lg:col-span-2 space-y-8">
                                                <div className="space-y-6">
                                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest italic">2. Resumen Tarifario</p>
                                                    <div className="bg-zinc-950/40 border border-zinc-800/50 rounded-3xl p-8 space-y-6">
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-zinc-500 font-bold">Cuota de uso</span>
                                                                <span className="text-white font-black">${selectedAmenity.base_price} MXN</span>
                                                            </div>
                                                            {selectedAmenity.deposit_required && (
                                                                <div className="flex justify-between text-xs">
                                                                    <span className="text-zinc-500 font-bold">Depósito en garantía</span>
                                                                    <span className="text-amber-500 font-black">${selectedAmenity.deposit_amount} MXN</span>
                                                                </div>
                                                            )}
                                                            <div className="pt-4 border-t border-zinc-800 flex justify-between items-end">
                                                                <div>
                                                                    <p className="text-[10px] text-zinc-500 uppercase font-black tracking-tighter">Total</p>
                                                                    <p className="text-2xl font-black text-white italic leading-none pt-1">
                                                                        ${selectedAmenity.base_price + (selectedAmenity.deposit_required ? selectedAmenity.deposit_amount : 0)} <span className="text-[10px] not-italic text-zinc-600 uppercase">MXN</span>
                                                                    </p>
                                                                </div>
                                                                <CreditCard size={24} className="text-zinc-700 mb-1" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 space-y-4 relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                                        <Info size={40} />
                                                    </div>
                                                    <div className="flex items-center gap-2 text-indigo-400">
                                                        <ShieldCheck size={16} />
                                                        <span className="text-[11px] font-black uppercase tracking-wider">Reglamento Interno</span>
                                                    </div>
                                                    <div className="text-[11px] text-zinc-400 leading-relaxed font-medium relative z-10 max-h-32 overflow-y-auto custom-scrollbar pr-2 whitespace-pre-wrap">
                                                        {selectedAmenity.rules || 'No se han especificado reglas de uso resumidas.'}
                                                    </div>

                                                    {selectedAmenity.rules_pdf_url && (
                                                        <div className="pt-2 relative z-10">
                                                            <a href={selectedAmenity.rules_pdf_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-zinc-950/50 hover:bg-indigo-500/10 border border-zinc-800 hover:border-indigo-500/30 rounded-xl transition-all group/pdf">
                                                                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg group-hover/pdf:scale-110 group-hover/pdf:bg-indigo-500/20 transition-all">
                                                                    <FileText size={18} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className="text-xs font-bold text-white">Reglamento Oficial Autorizado</p>
                                                                    <p className="text-[10px] text-indigo-400">Ver documento PDF completo</p>
                                                                </div>
                                                                <DownloadCloud size={16} className="text-zinc-500 group-hover/pdf:text-white transition-colors animate-pulse mr-2" />
                                                            </a>
                                                        </div>
                                                    )}

                                                    <div className="mt-4 pt-4 border-t border-indigo-500/20 flex items-center gap-3 relative z-10">
                                                        <Switch checked={acceptedRules} onCheckedChange={setAcceptedRules} className="data-[state=checked]:bg-indigo-500" />
                                                        <span className="text-xs font-bold text-white tracking-tight cursor-pointer select-none" onClick={() => setAcceptedRules(!acceptedRules)}>
                                                            He leído y acepto el reglamento interno para hacer uso de este espacio.
                                                        </span>
                                                    </div>
                                                </div>

                                                <Button 
                                                    onClick={handleBooking}
                                                    disabled={loading || !acceptedRules}
                                                    className={`w-full ${acceptedRules ? 'bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)]' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed shadow-none'} text-white font-black h-16 rounded-2xl text-[11px] uppercase tracking-[0.2em] group transition-all`}
                                                >
                                                    {loading ? (
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                                                            Procesando...
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-3">
                                                            Reservar
                                                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                                        </div>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-16 text-center space-y-8">
                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-24 w-24 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                                        <CheckCircle2 size={48} />
                                    </motion.div>
                                    <div className="space-y-3">
                                        <h3 className="text-3xl font-black text-white italic">¡Solicitud Enviada!</h3>
                                        <p className="text-zinc-500 font-medium max-w-md mx-auto">
                                            Tu reservación para el **{format(bookingDate, 'd MMMM', { locale: es })}** ha sido registrada y está siendo revisada por la administración.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                                        <Link href="/dashboard/amenidades/reservas">
                                            <Button variant="outline" className="h-12 border-indigo-500/30 bg-indigo-500/5 text-indigo-400 font-bold px-8 rounded-2xl text-xs uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all">
                                                Ver Mis Reservas
                                            </Button>
                                        </Link>
                                        <Button variant="ghost" onClick={() => { setShowSuccess(false); setSelectedAmenity(null); }} className="h-12 text-zinc-500 hover:text-white font-bold px-8 rounded-2xl text-xs uppercase tracking-widest">
                                            Cerrar
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
