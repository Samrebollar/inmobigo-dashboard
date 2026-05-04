'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Settings, Target, Percent, DollarSign, Zap, Save } from 'lucide-react'
import { ReserveFund } from '@/types/accounting'
import { configureReserveFund } from '@/app/actions/reserve-fund-actions'
import { toast } from 'sonner'

interface ConfigureFundModalProps {
    isOpen: boolean
    onClose: () => void
    condominiumId: string
    currentConfig?: ReserveFund | null
}

export function ConfigureFundModal({ isOpen, onClose, condominiumId, currentConfig }: ConfigureFundModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        target_amount: currentConfig?.target_amount || 0,
        balance: currentConfig?.balance || 0,
        contribution_type: currentConfig?.contribution_type || 'percentage',
        contribution_value: currentConfig?.contribution_value || 0,
        is_automated: currentConfig?.is_automated || false
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        
        try {
            const res = await configureReserveFund(condominiumId, formData)
            if (res.success) {
                toast.success('Configuración guardada correctamente')
                onClose()
            } else {
                toast.error(res.error || 'Error al guardar')
            }
        } catch (error) {
            toast.error('Error de conexión')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-zinc-900 border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]"
                        >
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                    <Settings size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">Configurar Fondo</h3>
                                    <p className="text-zinc-500 text-xs">Ajusta las metas y automatización del ahorro.</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <DollarSign size={14} className="text-cyan-400" />
                                        Saldo Actual ($)
                                    </label>
                                    <input 
                                        type="number" 
                                        value={formData.balance}
                                        onChange={(e) => setFormData({...formData, balance: Number(e.target.value)})}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-white font-bold focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
                                        placeholder="Ej: 15000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        <Target size={14} className="text-purple-400" />
                                        Meta Recomendada
                                    </label>
                                    <input 
                                        type="number" 
                                        value={formData.target_amount}
                                        onChange={(e) => setFormData({...formData, target_amount: Number(e.target.value)})}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-white font-bold focus:outline-none focus:border-purple-500 transition-all shadow-inner"
                                        placeholder="Ej: 50000"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={14} />
                                    Aportación Mensual
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, contribution_type: 'percentage'})}
                                        className={`flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all font-bold text-sm ${formData.contribution_type === 'percentage' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:border-white/10'}`}
                                    >
                                        <Percent size={16} />
                                        <span>Porcentaje</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, contribution_type: 'fixed'})}
                                        className={`flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all font-bold text-sm ${formData.contribution_type === 'fixed' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:border-white/10'}`}
                                    >
                                        <DollarSign size={16} />
                                        <span>Monto Fijo</span>
                                    </button>
                                </div>
                                <input 
                                    type="number" 
                                    value={formData.contribution_value}
                                    onChange={(e) => setFormData({...formData, contribution_value: Number(e.target.value)})}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                                    placeholder={formData.contribution_type === 'percentage' ? "Ej: 5 (%)" : "Ej: 1000 ($)"}
                                    required
                                />
                            </div>

                            <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-white">Activar automatización</p>
                                    <p className="text-[10px] text-zinc-500 max-w-[200px]">El fondo se alimentará automáticamente con cada ingreso pagado.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer" 
                                        checked={formData.is_automated}
                                        onChange={(e) => setFormData({...formData, is_automated: e.target.checked})}
                                    />
                                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 peer-checked:after:bg-white"></div>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/[0.03] text-white font-bold hover:bg-white/[0.08] transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                >
                                    {isSubmitting ? 'Guardando...' : (
                                        <>
                                            <Save size={18} />
                                            <span>Guardar Cambios</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

