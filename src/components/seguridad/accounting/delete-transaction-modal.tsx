'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { ReserveFundTransaction } from '@/types/accounting'
import { deleteFundTransaction } from '@/app/actions/reserve-fund-actions'
import { toast } from 'sonner'

interface DeleteTransactionModalProps {
    isOpen: boolean
    onClose: () => void
    transaction: ReserveFundTransaction | null
}

export function DeleteTransactionModal({ isOpen, onClose, transaction }: DeleteTransactionModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false)

    if (!transaction) return null

    const handleDelete = async () => {
        setIsSubmitting(true)
        try {
            const res = await deleteFundTransaction(transaction.id)
            if (res.success) {
                toast.success('Operación eliminada y saldo revertido con éxito')
                onClose()
            } else {
                toast.error(res.error || 'Error al eliminar')
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
                        className="relative bg-zinc-900 border border-red-500/20 rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-500/10 rounded-2xl text-red-400">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">Eliminar Operación</h3>
                                    <p className="text-zinc-500 text-xs">Esta acción revertirá el saldo del fondo.</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 mb-6 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500 font-bold uppercase tracking-wider">Motivo</span>
                                <span className="text-white font-bold capitalize">{transaction.reason}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-zinc-500 font-bold uppercase tracking-wider">Monto</span>
                                <span className={`font-black ${transaction.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {transaction.type === 'deposit' ? '+' : '-'}${Number(transaction.amount).toLocaleString()}
                                </span>
                            </div>
                            {transaction.description && (
                                <div className="pt-2 border-t border-white/5 text-[11px] text-zinc-400 italic">
                                    "{transaction.description}"
                                </div>
                            )}
                        </div>

                        <p className="text-xs text-zinc-400 text-center mb-6 leading-relaxed">
                            ¿Estás seguro de que deseas eliminar este registro? El saldo del fondo de reserva se ajustará automáticamente.
                        </p>

                        <div className="flex gap-3">
                            <button 
                                type="button"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1 px-6 py-3.5 rounded-2xl bg-white/[0.03] text-white font-bold hover:bg-white/[0.08] transition-all text-sm disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                className="flex-1 px-6 py-3.5 rounded-2xl bg-red-500 text-white font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                            >
                                {isSubmitting ? 'Eliminando...' : (
                                    <>
                                        <Trash2 size={16} />
                                        <span>Eliminar</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

