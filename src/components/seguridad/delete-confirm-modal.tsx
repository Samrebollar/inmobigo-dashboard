'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    itemName?: string
    isLoading?: boolean
}

export function DeleteConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    itemName,
    isLoading
}: DeleteConfirmModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="w-full max-w-md overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl"
                    >
                        {/* Header with gradient line */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-rose-600 to-rose-700" />
                        
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="h-12 w-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]">
                                    <AlertTriangle size={24} />
                                </div>
                                <button 
                                    onClick={onClose}
                                    className="p-2 text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-2 mb-8">
                                <h3 className="text-xl font-black text-white tracking-tight uppercase italic">
                                    {title}
                                </h3>
                                <p className="text-zinc-400 text-sm leading-relaxed">
                                    {description}
                                    {itemName && (
                                        <span className="block mt-2 text-rose-400 font-bold bg-rose-500/5 py-1 px-3 rounded-lg border border-rose-500/10 inline-block">
                                            {itemName}
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Button
                                    variant="ghost"
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 rounded-xl h-12 font-bold text-zinc-500 hover:text-white hover:bg-zinc-800 border border-zinc-800 uppercase tracking-widest text-[10px]"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={onConfirm}
                                    disabled={isLoading}
                                    className="flex-1 rounded-xl h-12 font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/10 border-none uppercase tracking-widest text-[10px]"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-3 w-3 text-white" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            Eliminando...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Trash2 size={14} />
                                            Confirmar Eliminación
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

