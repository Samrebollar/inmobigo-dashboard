'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfirmDeleteModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    visitorName: string
    isLoading?: boolean
}

export function ConfirmDeleteModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    visitorName,
    isLoading = false 
}: ConfirmDeleteModalProps) {
    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal Card */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
                >
                    {/* Upper decorative area */}
                    <div className="bg-red-500/10 p-8 flex flex-col items-center border-b border-red-500/20">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/30">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-white mb-2">¿Eliminar Acceso?</h2>
                        <p className="text-zinc-400 text-center text-sm">
                            Esta acción es <span className="text-red-400 font-bold uppercase">irreversible</span>. 
                            Se borrará permanentemente de la base de datos.
                        </p>
                    </div>

                    {/* Content area */}
                    <div className="p-8 space-y-6">
                        <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 flex items-center gap-4">
                            <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 font-bold">
                                {visitorName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-0.5">Visitante a eliminar</p>
                                <p className="font-bold text-white tracking-tight text-lg">{visitorName}</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button 
                                variant="secondary" 
                                onClick={onClose}
                                className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs"
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button 
                                variant="danger" 
                                onClick={onConfirm}
                                isLoading={isLoading}
                                className="flex-1 h-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white border-none font-black uppercase tracking-widest text-xs shadow-xl shadow-red-500/20"
                            >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                            </Button>
                        </div>
                    </div>

                    {/* Close top button */}
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
