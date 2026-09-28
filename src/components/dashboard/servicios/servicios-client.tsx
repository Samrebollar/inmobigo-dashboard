'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VisitorPassesModule } from './visitor-passes-module'
import { ServiceNoticesHistory } from './service-notices-history'
import { ServiceNoticeCard } from './service-notice-card'
import QRCode from 'react-qr-code'
import { 
    QrCode, 
    Package, 
    Share2, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    Loader2,
    Truck,
    Smartphone,
    UserPlus,
    X,
    Calendar,
    MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { createTransportNoticeAction } from '@/app/actions/service-actions'
import { Car } from 'lucide-react'

export default function ServiciosClient({ resident }: { resident: any }) {
    const supabase = createClient()

    useEffect(() => {
        console.log("🔥 SERVICIOS MONTADO")
        console.log("🔥 MONITOR RESIDENTE PAQUETERIA ACTIVO")

        const channel = supabase.channel('package-alerts-resident')

        channel
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'package_alerts'
                },
                (payload) => {
                    console.log('🔥 CAMBIO DETECTADO:', payload)
                    console.log('🔥 EVENTO:', payload.eventType)
                    console.log('🔥 STATUS:', (payload.new as any)?.status)
                    
                    // Lógica para mostrar la notificación visual (Toast) al residente
                    const newRow = payload.new as any;
                    const oldRow = payload.old as any;

                    if (payload.eventType === 'UPDATE' && newRow.resident_id === resident?.user_id) {
                        const carrier = newRow.carrier || 'Un paquete';
                        const orgName = resident.condominiums?.name || 'la administración';

                        if (newRow.status === 'received' && (!oldRow || oldRow.status !== 'received')) {
                            toast.success(`📦 ¡Tu paquete de ${carrier} ha llegado!`, {
                                description: `El personal de seguridad dio ingreso a ${orgName}.`,
                                duration: 20000,
                                position: 'top-center'
                            });
                        } else if (newRow.status === 'rejected' && (!oldRow || oldRow.status !== 'rejected')) {
                            toast.error(`📦 Tu aviso de ${carrier} fue rechazado`, {
                                description: newRow.rejection_reason
                                    ? `Motivo: ${newRow.rejection_reason}`
                                    : `La administración de ${orgName} no autorizó el acceso.`,
                                duration: 20000,
                                position: 'top-center'
                            });
                        }
                    }
                }
            )
            .subscribe((status) => {
                console.log("🔥 ESTADO REALTIME:", status)
            })

        return () => {
            console.log("🧹 LIMPIANDO CANAL PAQUETERIA")
            supabase.removeChannel(channel)
        }
    }, [resident?.user_id, resident?.condominiums?.name])
    
    // Refresca "Mis avisos recientes" al enviar un aviso nuevo
    const [historyKey, setHistoryKey] = useState(0)

    // ESTADOS: Aviso de Transporte (Uber/DiDi/Taxi) — separado de paquetería:
    // un auto que va a recoger o dejar a alguien no es un paquete, y antes no
    // había ninguna forma clara de avisarle esto a seguridad.
    const [transportDirection, setTransportDirection] = useState<'pickup' | 'dropoff'>('pickup')
    const [transportPlatform, setTransportPlatform] = useState('Uber')
    const [vehicleInfo, setVehicleInfo] = useState('')
    const [transportNotes, setTransportNotes] = useState('')
    const [isSendingTransport, setIsSendingTransport] = useState(false)
    const [showTransportSuccess, setShowTransportSuccess] = useState(false)

    const handleSendTransportNotice = async () => {
        setIsSendingTransport(true)
        try {
            const fullName = `${resident.first_name} ${resident.last_name || ''}`.trim()
            const unitName = resident.units?.unit_number || 'N/A'
            const orgId = resident.condominiums?.organization_id || resident.organization_id

            if (!orgId || !resident.unit_id || !resident.id) {
                toast.error('Tu perfil de residente está incompleto. Por favor contacta a administración.')
                return
            }

            const result = await createTransportNoticeAction({
                organization_id: orgId,
                unit_id: resident.unit_id,
                resident_id: resident.id,
                resident_name: fullName,
                unit_name: unitName,
                direction: transportDirection,
                platform: transportPlatform,
                vehicle_info: vehicleInfo || null,
                notes: transportNotes || null,
                status: 'pending',
            })

            if (!result.success) throw new Error(result.error)

            setShowTransportSuccess(true)
            toast.success('Seguridad fue notificada de tu transporte')
            setHistoryKey(k => k + 1)

            setTimeout(() => {
                setShowTransportSuccess(false)
                setVehicleInfo('')
                setTransportNotes('')
            }, 5000)
        } catch (error: any) {
            console.error('Error al enviar aviso de transporte:', error)
            toast.error(`Error: ${error.message || 'No se pudo registrar el aviso'}`)
        } finally {
            setIsSendingTransport(false)
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6 md:p-10 min-h-screen">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-white tracking-tight italic flex items-center gap-4">
                        <Smartphone className="h-8 w-8 text-indigo-500" /> Servicios
                    </h1>
                    <p className="text-zinc-500 font-medium">
                        Genera pases peatonales/vehiculares temporales y gestiona tu paquetería de forma inteligente.
                    </p>
                </div>
            </div>

            {/* BENTO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                
                {/* 1. MÓDULO: Pases de Visita Profesionales */}
                <VisitorPassesModule resident={resident} />

                {/* 2. TARJETA: Avisos Paquetería / Repartidor / Proveedor */}
                <ServiceNoticeCard resident={resident} onSent={() => setHistoryKey(k => k + 1)} />

                {/* 3. TARJETA: Aviso de Transporte (Uber/DiDi/Taxi) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden flex flex-col group md:col-span-2"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-sky-500/20 transition-all duration-700" />

                    <div className="flex items-start gap-4 mb-8 relative z-10">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-600/10 border border-sky-500/20 flex items-center justify-center shadow-inner shrink-0">
                            <Car className="h-7 w-7 text-sky-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Aviso de Transporte</h2>
                            <p className="text-sm text-zinc-400 font-medium mt-1">Avisa a seguridad que te va a recoger o que estás llegando en Uber, DiDi o taxi.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 relative z-10">
                        <div className="space-y-3">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-2">¿Qué va a pasar?</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setTransportDirection('pickup')}
                                    className={`h-14 rounded-2xl border font-bold text-sm transition-all ${transportDirection === 'pickup' ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'bg-zinc-950/50 border-zinc-800 text-zinc-400'}`}
                                >
                                    Me van a recoger
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTransportDirection('dropoff')}
                                    className={`h-14 rounded-2xl border font-bold text-sm transition-all ${transportDirection === 'dropoff' ? 'bg-sky-500/20 border-sky-500/50 text-sky-300' : 'bg-zinc-950/50 border-zinc-800 text-zinc-400'}`}
                                >
                                    Estoy llegando
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-2">Plataforma</label>
                            <select
                                value={transportPlatform}
                                onChange={(e) => setTransportPlatform(e.target.value)}
                                className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-sky-500/50 rounded-2xl h-14 px-4 text-white outline-none transition-all duration-300 font-medium appearance-none cursor-pointer"
                            >
                                <option value="Uber">Uber</option>
                                <option value="DiDi">DiDi</option>
                                <option value="Taxi">Taxi</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-2">Placas / Color del auto (Opcional)</label>
                            <input
                                value={vehicleInfo}
                                onChange={(e) => setVehicleInfo(e.target.value)}
                                placeholder="Ej. Nissan gris, placas ABC-123"
                                className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-sky-500/50 rounded-2xl h-14 px-4 text-white placeholder-zinc-600 outline-none transition-all duration-300 font-medium"
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-2">Notas (Opcional)</label>
                            <input
                                value={transportNotes}
                                onChange={(e) => setTransportNotes(e.target.value)}
                                placeholder="Ej. Es para mi hijo, tiene autorización"
                                className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-sky-500/50 rounded-2xl h-14 px-4 text-white placeholder-zinc-600 outline-none transition-all duration-300 font-medium"
                            />
                        </div>
                    </div>

                    <AnimatePresence>
                        {showTransportSuccess && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mt-6 flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-bold text-sm tracking-tight">¡Seguridad ha sido notificada exitosamente!</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <Button
                        onClick={handleSendTransportNotice}
                        disabled={isSendingTransport || showTransportSuccess}
                        className="w-full h-14 mt-6 bg-sky-600 hover:bg-sky-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_0_20px_rgba(2,132,199,0.2)] disabled:opacity-50 transition-all duration-300 relative z-10"
                    >
                        {isSendingTransport ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando Aviso</>
                        ) : (
                            showTransportSuccess ? 'Aviso Confirmado' : <><Car className="w-4 h-4 mr-2" /> Avisar a Seguridad</>
                        )}
                    </Button>
                </motion.div>

            </div>

            {/* Historial de avisos con hora de acceso/salida y motivo de rechazo */}
            <ServiceNoticesHistory refreshKey={historyKey} />
        </div>
    )
}
