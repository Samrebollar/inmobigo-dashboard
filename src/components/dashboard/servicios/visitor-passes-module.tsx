'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'react-qr-code'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import {
    QrCode, UserPlus, Clock, X, CheckCircle2, History,
    ShieldAlert, Calendar, FileText, ChevronRight, Share2, 
    Download, AlertTriangle, ShieldCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function VisitorPassesModule({ resident }: { resident: any }) {
    const supabase = createClient()
    
    // UI State
    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [loading, setLoading] = useState(true)

    // Data State
    const [passes, setPasses] = useState<any[]>([])
    const [selectedPass, setSelectedPass] = useState<any | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        visitorName: '',
        visitDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '08:00',
        endTime: '',
        notes: ''
    })

    useEffect(() => {
        fetchPasses()
    }, [])

    const fetchPasses = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('visitor_passes')
                .select('*')
                .eq('resident_id', resident.user_id)
                .order('created_at', { ascending: false })

            if (error) {
                // Si la tabla no existe aún, ignoramos el error para no romper la app en dev
                if (error.code === '42P01') {
                    console.log('La tabla visitor_passes no ha sido creada.')
                } else {
                    console.error('Error fetching passes:', error)
                }
                return
            }
            if (data) setPasses(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleCreatePass = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.visitorName || !formData.visitDate || !formData.startTime) {
            toast.error('Nombre, Fecha y Hora de inicio son obligatorios')
            return
        }

        setIsGenerating(true)
        try {
            const orgId = resident.condominiums?.organization_id || resident.organization_id
            if (!orgId) throw new Error('Organization ID not found')

            const newPass = {
                organization_id: orgId,
                unit_id: resident.unit_id,
                resident_id: resident.user_id,
                visitor_name: formData.visitorName,
                visit_date: formData.visitDate,
                start_time: formData.startTime,
                end_time: formData.endTime || null,
                notes: formData.notes || null,
                status: 'pending' // Asegura que quede pending
            }

            const { data, error } = await supabase
                .from('visitor_passes')
                .insert(newPass)
                .select()
                .single()

            if (error) throw error

            toast.success('Pase de visitante creado exitosamente')
            setIsCreateModalOpen(false)
            setFormData({
                visitorName: '', visitDate: format(new Date(), 'yyyy-MM-dd'), startTime: '08:00', endTime: '', notes: ''
            })
            fetchPasses()
            setSelectedPass(data) // Abre el modal del ticket generado
        } catch (error: any) {
            console.error(error)
            toast.error('Hubo un error al generar el pase.')
        } finally {
            setIsGenerating(false)
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
            fetchPasses()
            if (selectedPass?.id === id) setSelectedPass(null)
        } catch (err) {
            toast.error('Error al cancelar el pase')
        }
    }

    const activePasses = passes.filter(p => p.status === 'pending')
    const historyPasses = passes.filter(p => p.status !== 'pending')

    const getStatusStyle = (status: string) => {
        switch(status) {
            case 'pending': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            case 'used': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            case 'expired': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
            case 'cancelled': return 'bg-red-500/10 text-red-400 border-red-500/20'
            default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
        }
    }
    const getStatusText = (status: string) => {
        switch(status) {
            case 'pending': return 'ACTIVO'
            case 'used': return 'UTILIZADO'
            case 'expired': return 'EXPIRADO'
            case 'cancelled': return 'CANCELADO'
            default: return status
        }
    }

    const downloadQR = () => {
        toast.info("Descarga iniciada...")
        // Logica para canvas... (opcional)
    }

    return (
        <div className="w-full bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-6 lg:p-8 shadow-2xl flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Encabezado */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-600/10 border border-indigo-500/20 flex items-center justify-center shadow-inner shrink-0">
                        <QrCode className="h-7 w-7 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">Accesos QR</h2>
                        <p className="text-sm text-zinc-400 font-medium mt-1">Gestiona los permisos de entrada de tus visitantes.</p>
                    </div>
                </div>
                <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg border-none"
                >
                    <UserPlus className="w-4 h-4 mr-2" /> Nuevo Pase QR
                </Button>
            </div>

            {/* Tab Nav */}
            <div className="flex items-center gap-2 mb-6 border-b border-zinc-800 pb-2 relative z-10 w-full overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'active' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Pases Activos ({activePasses.length})
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                >
                    Historial
                </button>
            </div>

            {/* Lista Principal */}
            <div className="flex-1 relative z-10 min-h-[300px]">
                {loading ? (
                    <div className="h-full flex items-center justify-center animate-pulse">
                        <p className="text-zinc-500 font-medium mt-20">Cargando datos seguros...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {activeTab === 'active' ? (
                            activePasses.length === 0 ? (
                                <div className="text-center py-12 px-4 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/30">
                                    <ShieldCheck className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-400 font-medium">No tienes pases de visita generados actualmente.</p>
                                </div>
                            ) : (
                                activePasses.map(pass => (
                                    <div 
                                        key={pass.id} 
                                        onClick={() => setSelectedPass(pass)}
                                        className="bg-zinc-950/40 hover:bg-zinc-800/80 transition-all border border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 font-bold group-hover:bg-indigo-500/20 group-hover:scale-105 transition-all">
                                                {pass.visitor_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold">{pass.visitor_name}</h4>
                                                <p className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                                                    <Calendar className="w-3 h-3" /> {format(parseISO(pass.visit_date), 'd MMM yyyy', {locale:es})} a las {pass.start_time.substring(0,5)} hs
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border ${getStatusStyle(pass.status)}`}>
                                                {getStatusText(pass.status)}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                                        </div>
                                    </div>
                                ))
                            )
                        ) : (
                            historyPasses.length === 0 ? (
                                <div className="text-center py-12 px-4 border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-900/30">
                                    <History className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
                                    <p className="text-zinc-400 font-medium">Tu historial está limpio.</p>
                                </div>
                            ) : (
                                historyPasses.map(pass => (
                                    <div 
                                        key={pass.id}
                                        onClick={() => setSelectedPass(pass)}
                                        className="bg-zinc-950/20 hover:bg-zinc-900/50 transition-all border border-zinc-800/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer opacity-80 hover:opacity-100"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 font-bold">
                                                {pass.visitor_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h4 className="text-zinc-300 font-semibold">{pass.visitor_name}</h4>
                                                <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" /> {format(parseISO(pass.visit_date), 'd MMM yyyy', {locale:es})}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded border ${getStatusStyle(pass.status)}`}>
                                            {getStatusText(pass.status)}
                                        </span>
                                    </div>
                                ))
                            )
                        )}
                    </div>
                )}
            </div>

            {/* Modal: CREAR NUEVO PASE */}
            <AnimatePresence>
                {isCreateModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: -20 }}
                            className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative my-8"
                        >
                            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-white bg-zinc-800 rounded-full p-1 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                            <h2 className="text-2xl font-black text-white mb-6">Autorizar Visita</h2>
                            
                            <form onSubmit={handleCreatePass} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Nombre Completo de la Visita</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><UserPlus className="h-4 w-4 text-zinc-500" /></div>
                                        <input
                                            required
                                            type="text"
                                            value={formData.visitorName}
                                            onChange={e => setFormData({...formData, visitorName: e.target.value})}
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl h-12 pl-10 pr-4 text-white text-sm outline-none"
                                            placeholder="Ingresa nombre y apellido"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Día Autorizado</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><Calendar className="h-4 w-4 text-zinc-500" /></div>
                                        <input
                                            required
                                            type="date"
                                            value={formData.visitDate}
                                            onChange={e => setFormData({...formData, visitDate: e.target.value})}
                                            min={format(new Date(), 'yyyy-MM-dd')}
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl h-12 pl-10 pr-4 text-white text-sm outline-none [color-scheme:dark]"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Hora Llegada</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><Clock className="h-4 w-4 text-emerald-500" /></div>
                                            <input
                                                required
                                                type="time"
                                                value={formData.startTime}
                                                onChange={e => setFormData({...formData, startTime: e.target.value})}
                                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl h-12 pl-9 pr-2 text-white text-sm outline-none [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Hora Salida (Opcional)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center"><Clock className="h-4 w-4 text-red-500" /></div>
                                            <input
                                                type="time"
                                                value={formData.endTime}
                                                onChange={e => setFormData({...formData, endTime: e.target.value})}
                                                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl h-12 pl-9 pr-2 text-white text-sm outline-none [color-scheme:dark]"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1">Notas para Seguridad</label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-0 pl-3"><FileText className="h-4 w-4 text-zinc-500" /></div>
                                        <textarea
                                            value={formData.notes}
                                            onChange={e => setFormData({...formData, notes: e.target.value})}
                                            className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-xl py-3 pl-10 pr-4 text-white text-sm outline-none min-h-[80px] resize-none"
                                            placeholder="Ej. Viene en auto azul Nissan Versa"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="flex-1 text-zinc-400 hover:text-white">Cancelar</Button>
                                    <Button type="submit" disabled={isGenerating} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                                        {isGenerating ? 'Generando...' : 'Autorizar'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal: TICKET DIGITAL (Selected Pass) */}
            <AnimatePresence>
                {selectedPass && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: -20 }}
                            className="w-full max-w-sm relative my-8"
                        >
                            <button onClick={() => setSelectedPass(null)} className="absolute -top-12 right-0 text-white bg-zinc-800 hover:bg-zinc-700 rounded-full p-2 transition-colors z-10">
                                <X className="w-6 h-6" />
                            </button>

                            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl relative">
                                {selectedPass.status === 'pending' ? (
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-[50px] rounded-full pointer-events-none" />
                                ) : (
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-zinc-500/10 blur-[50px] rounded-full pointer-events-none" />
                                )}

                                {/* Header Ticket */}
                                <div className="px-6 py-8 flex flex-col items-center border-b border-zinc-800/80 relative">
                                    <h3 className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Pase Oficial</h3>
                                    <h2 className="text-2xl font-black text-white text-center mb-1 leading-tight">{selectedPass.visitor_name}</h2>
                                    <p className="text-zinc-400 text-sm font-medium">Destino: Unidad {resident.units?.unit_number || 'S/D'}</p>
                                </div>

                                {/* QR Section */}
                                <div className="p-8 flex flex-col items-center bg-black/20">
                                    <div className={`p-4 rounded-3xl shadow-xl relative ${selectedPass.status === 'pending' ? 'bg-white' : 'bg-zinc-800 opacity-50 grayscale'}`}>
                                        <QRCode value={`https://app.inmobigo.net/visit/${selectedPass.qr_token}`} size={180} fgColor="#09090b" bgColor="transparent" />
                                        
                                        {/* Overlay for non-pending */}
                                        {selectedPass.status !== 'pending' && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="bg-black/80 backdrop-blur-sm p-3 rounded-2xl border border-zinc-700 shadow-2xl rotate-12">
                                                    <span className="text-xl font-black text-white px-2 py-1 uppercase tracking-widest">{getStatusText(selectedPass.status)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="w-full mt-8 space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Fecha autorizada</span>
                                            <span className="text-white font-medium">{format(parseISO(selectedPass.visit_date), 'EEEE, d MMM yyyy', {locale:es})}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm border-t border-zinc-800/50 pt-3">
                                            <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Horario</span>
                                            <span className="text-white font-medium">{selectedPass.start_time.substring(0,5)} {selectedPass.end_time ? `- ${selectedPass.end_time.substring(0,5)}` : ''}</span>
                                        </div>
                                        {selectedPass.notes && (
                                            <div className="pt-3 border-t border-zinc-800/50">
                                                 <span className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest block mb-1">Notas</span>
                                                 <p className="text-zinc-300 text-sm">{selectedPass.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions Ticket */}
                            {selectedPass.status === 'pending' && (
                                <div className="mt-4 flex gap-3">
                                    <Button onClick={downloadQR} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl shadow-lg border-zinc-700">
                                        <Download className="w-4 h-4 mr-2" /> Guardar
                                    </Button>
                                    <Button onClick={() => handleCancelPass(selectedPass.id)} variant="destructive" className="flex-1 rounded-xl shadow-lg border border-red-500/20 bg-red-500/10 hover:bg-red-500/20 text-red-400">
                                        <ShieldAlert className="w-4 h-4 mr-2" /> Revocar
                                    </Button>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
