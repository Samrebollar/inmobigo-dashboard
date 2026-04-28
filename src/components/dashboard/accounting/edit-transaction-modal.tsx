'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Pencil, DollarSign, FileText, ArrowUpCircle, ArrowDownCircle, Save } from 'lucide-react'
import { ReserveFundTransaction } from '@/types/accounting'
import { updateFundTransaction } from '@/app/actions/reserve-fund-actions'
import { toast } from 'sonner'

interface EditTransactionModalProps {
    isOpen: boolean
    onClose: () => void
    transaction: ReserveFundTransaction | null
}

export function EditTransactionModal({ isOpen, onClose, transaction }: EditTransactionModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        type: 'deposit' as 'deposit' | 'withdrawal',
        amount: 0,
        reason: '',
        description: ''
    })

    useEffect(() => {
        if (transaction) {
            setFormData({
                type: transaction.type,
                amount: Number(transaction.amount),
                reason: transaction.reason,
                description: transaction.description || ''
            })
        }
    }, [transaction])

    if (!transaction) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        
        try {
            const res = await updateFundTransaction(transaction.id, formData)
            if (res.success) {
                toast.success('Operación actualizada correctamente')
                onClose()
            } else {
                toast.error(res.error || 'Error al actualizar')
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
                        className="relative bg-zinc-900 border border-white/10 rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                    <Pencil size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">Editar Operación</h3>
                                    <p className="text-zinc-500 text-xs">Modifica los detalles del movimiento.</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    Tipo de Movimiento
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, type: 'deposit'})}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-bold text-xs ${formData.type === 'deposit' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:border-white/10'}`}
                                    >
                                        <ArrowUpCircle size={16} />
                                        <span>Aportación</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, type: 'withdrawal'})}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all font-bold text-xs ${formData.type === 'withdrawal' ? 'bg-rose-500/20 border-rose-500/50 text-rose-400' : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:border-white/10'}`}
                                    >
                                        <ArrowDownCircle size={16} />
                                        <span>Retiro</span>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign size={14} />
                                    Monto ($)
                                </label>
                                <input 
                                    type="number" 
                                    value={formData.amount}
                                    onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all text-sm"
                                    placeholder="Ej: 1000"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={14} />
                                    Motivo
                                </label>
                                <input 
                                    type="text" 
                                    value={formData.reason}
                                    onChange={(e) => setFormData({...formData, reason: e.target.value})}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all text-sm"
                                    placeholder="Ej: Ajuste de Saldo"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    Descripción
                                </label>
                                <textarea 
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:outline-none focus:border-indigo-500 transition-all text-sm h-20 resize-none"
                                    placeholder="Opcional..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button 
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-6 py-3.5 rounded-2xl bg-white/[0.03] text-white font-bold hover:bg-white/[0.08] transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    disabled={isSubmitting}
                                    className="flex-1 px-6 py-3.5 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                                >
                                    {isSubmitting ? 'Guardando...' : (
                                        <>
                                            <Save size={18} />
                                            <span>Guardar</span>
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
