'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VisitorPassesModule } from './visitor-passes-module'
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
import { createPackageAlertAction } from '@/app/actions/service-actions'

export default function ServiciosClient({ resident }: { resident: any }) {
    const supabase = createClient()
    
    // ESTADOS: Paquetería
    const [courier, setCourier] = useState('Mercado Libre')
    const [trackingNumber, setTrackingNumber] = useState('')
    const [instructions, setInstructions] = useState('')
    const [isSendingNotice, setIsSendingNotice] = useState(false)
    const [showNoticeSuccess, setShowNoticeSuccess] = useState(false)

    const handleSendNotice = async () => {
        if (!courier) return
        
        setIsSendingNotice(true)
        
        try {
            // Recopilar nombres para visualización inmediata en administración sin Joins pesados
            const fullName = `${resident.first_name} ${resident.last_name || ''}`.trim()
            const unitName = resident.units?.unit_number || 'N/A'
            const orgId = resident.condominiums?.organization_id || resident.organization_id

            // VALIDACIÓN PREVIA
            if (!orgId || !resident.unit_id || !resident.user_id) {
                console.error('Datos del residente incompletos:', { orgId, unit_id: resident.unit_id, user_id: resident.user_id })
                toast.error('Tu perfil de residente está incompleto. Por favor contacta a administración.')
                return
            }

            const result = await createPackageAlertAction({
                organization_id: orgId,
                unit_id: resident.unit_id,
                resident_id: resident.user_id,
                resident_name: fullName,
                unit_name: unitName,
                carrier: courier,
                notes: instructions,
                status: 'pending'
            })
            
            if (!result.success) {
                throw new Error(result.error)
            }
            
            setShowNoticeSuccess(true)
            toast.success('Aviso de paquetería enviado a caseta')
            
            setTimeout(() => {
                setShowNoticeSuccess(false)
                setInstructions('')
            }, 5000)
        } catch (error: any) {
            console.error('Error al enviar aviso de paquetería:', error)
            toast.error(`Error: ${error.message || 'No se pudo registrar el aviso'}`)
        } finally {
            setIsSendingNotice(false)
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

                {/* 2. TARJETA: Aviso de Paquetería */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden flex flex-col group"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-amber-500/20 transition-all duration-700" />
                    
                    <div className="flex items-start gap-4 mb-8 relative z-10">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 flex items-center justify-center shadow-inner shrink-0">
                            <Package className="h-7 w-7 text-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Aviso de Paquetería</h2>
                            <p className="text-sm text-zinc-400 font-medium mt-1">Notifica a seguridad que esperas recibir un envío importante el día de hoy.</p>
                        </div>
                    </div>

                    <div className="space-y-6 flex-1 relative z-10">
                        
                        <div className="space-y-3">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-2">
                                Paquetería / Marketplace
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Truck className="h-5 w-5 text-amber-500/50" />
                                </div>
                                <select
                                    value={courier}
                                    onChange={(e) => setCourier(e.target.value)}
                                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-amber-500/50 rounded-2xl h-14 pl-12 pr-10 text-white outline-none transition-all duration-300 font-medium appearance-none cursor-pointer"
                                >
                                    <option value="Mercado Libre">Mercado Libre</option>
                                    <option value="Amazon">Amazon</option>
                                    <option value="DHL">DHL Express</option>
                                    <option value="FedEx">FedEx</option>
                                    <option value="Estafeta">Estafeta</option>
                                    <option value="Servicio de Comida (App)">Servicio de Comida (App)</option>
                                    <option value="Otro">Otro / Repartidor Independiente</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-black text-zinc-500 uppercase tracking-widest pl-2">
                                Clave rastreo / Info. Adicional (Opcional)
                            </label>
                            <div className="relative">
                                <div className="absolute top-4 left-0 pl-4 flex items-start pointer-events-none">
                                    <MessageSquare className="h-5 w-5 text-zinc-500" />
                                </div>
                                <textarea
                                    value={instructions}
                                    onChange={(e) => setInstructions(e.target.value)}
                                    placeholder="Ej. Si no estoy, autorizo que seguridad reciba el paquete bajo mi responsabilidad."
                                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-amber-500/50 rounded-2xl p-4 pl-12 text-white placeholder-zinc-600 outline-none transition-all duration-300 font-medium font-sans min-h-[100px] resize-none"
                                />
                            </div>
                        </div>

                    </div>

                    <AnimatePresence>
                        {showNoticeSuccess && (
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
                        onClick={handleSendNotice}
                        disabled={isSendingNotice || showNoticeSuccess}
                        className="w-full h-14 mt-6 bg-amber-600 hover:bg-amber-500 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl shadow-[0_0_20px_rgba(217,119,6,0.2)] disabled:opacity-50 transition-all duration-300 relative z-10"
                    >
                        {isSendingNotice ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando Aviso</>
                        ) : (
                            showNoticeSuccess ? 'Aviso Confirmado' : <><AlertCircle className="w-4 h-4 mr-2" /> Alertar Llegada a Caseta</>
                        )}
                    </Button>
                </motion.div>

            </div>
        </div>
    )
}
