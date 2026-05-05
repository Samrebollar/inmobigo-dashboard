'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, X, Home, MapPin, User, Clock, ShieldCheck, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ManualVisitModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ManualVisitModal({ isOpen, onClose }: ManualVisitModalProps) {
    const [isLoading, setIsLoading] = useState(false)

    if (!isOpen) return null

    const handleSave = () => {
        setIsLoading(true)
        setTimeout(() => {
            setIsLoading(false)
            onClose()
        }, 1500)
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />
                
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-3xl md:rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {/* Header - Fixed */}
                    <div className="p-6 md:p-8 pb-4 flex items-center justify-between border-b border-zinc-900/50">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-2xl">
                                <UserPlus className="h-6 w-6 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Registro Manual de Visitas</h2>
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Nueva Entrada</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 bg-zinc-900 text-zinc-500 hover:text-white rounded-2xl transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 md:p-8 overflow-y-auto">
                        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Propiedad */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Propiedad</label>
                                    <div className="relative group">
                                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <select className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all appearance-none">
                                            <option>Las Palmas</option>
                                            <option>Zacil</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Unidad */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Unidad / Casa</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Ej. Casa 45"
                                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Nombre Visitante */}
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Nombre del Visitante</label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Nombre completo"
                                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Autorizado Por */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Autorizado Por</label>
                                    <div className="relative group">
                                        <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <input 
                                            type="text" 
                                            placeholder="Nombre del residente"
                                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Hora Entrada */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-1">Hora de Entrada</label>
                                    <div className="relative group">
                                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 transition-colors group-focus-within:text-emerald-500" />
                                        <input 
                                            type="time" 
                                            className="w-full h-14 bg-zinc-900 border border-zinc-800 rounded-2xl pl-12 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button 
                                    onClick={handleSave}
                                    disabled={isLoading}
                                    className="w-full h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-950/20 gap-3 transition-all"
                                >
                                    {isLoading ? (
                                        <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="h-5 w-5" /> Guardar Registro
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
