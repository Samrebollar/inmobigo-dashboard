'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Trash2, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeletePropertyModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    propertyName: string
}

export function DeletePropertyModal({ isOpen, onClose, onConfirm, propertyName }: DeletePropertyModalProps) {
    const [step, setStep] = useState<'info' | 'verify'>('info')
    const [verificationText, setVerificationText] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep('info')
            setVerificationText('')
            setError(null)
            setLoading(false)
        }
    }, [isOpen])

    const handleConfirm = async () => {
        if (step === 'info') {
            setStep('verify')
            return
        }

        if (verificationText !== propertyName) {
            setError('El nombre no coincide. Por favor, escríbelo exactamente igual.')
            return
        }

        setLoading(true)
        setError(null)
        try {
            await onConfirm()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Error al eliminar la propiedad')
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={loading ? undefined : onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-rose-500/20 bg-zinc-950 shadow-[0_0_50px_-12px_rgba(244,63,94,0.3)]"
                    >
                        {/* Status Bar */}
                        <div className="h-1.5 w-full bg-zinc-900">
                            <motion.div
                                className="h-full bg-rose-500"
                                initial={{ width: '50%' }}
                                animate={{ width: step === 'info' ? '50%' : '100%' }}
                            />
                        </div>

                        <div className="p-8">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="absolute right-6 top-6 text-zinc-500 hover:text-white disabled:opacity-0 transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>

                            <div className="flex flex-col items-center text-center">
                                {/* Icon with glow */}
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 animate-pulse rounded-full bg-rose-500/20 blur-xl px-6 py-6" />
                                    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500">
                                        <AlertTriangle className="h-8 w-8" />
                                    </div>
                                </div>

                                <AnimatePresence mode="wait">
                                    {step === 'info' ? (
                                        <motion.div
                                            key="info"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="space-y-4"
                                        >
                                            <h2 className="text-2xl font-bold text-white tracking-tight">¿Eliminar Propiedad?</h2>
                                            <p className="text-zinc-400 leading-relaxed">
                                                Estás a punto de eliminar <span className="text-white font-bold">"{propertyName}"</span>. 
                                                Esta acción es irreversible y resultará en la pérdida total de:
                                            </p>
                                            <div className="grid grid-cols-2 gap-3 py-2">
                                                <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                                                    <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500">Unidades</span>
                                                    <span className="text-lg font-bold text-white">Todas</span>
                                                </div>
                                                <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center">
                                                    <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500">Residentes</span>
                                                    <span className="text-lg font-bold text-white">Todos</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="verify"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="w-full space-y-6"
                                        >
                                            <div className="space-y-2">
                                                <h2 className="text-2xl font-bold text-white tracking-tight">Confirmar Nombre</h2>
                                                <p className="text-sm text-zinc-400">
                                                    Para continuar, escribe el nombre del condominio tal cual aparece abajo:
                                                </p>
                                                <div className="rounded-lg bg-zinc-900 px-4 py-2 font-mono text-sm text-rose-400 border border-rose-500/10 select-none">
                                                    {propertyName}
                                                </div>
                                            </div>

                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={verificationText}
                                                    onChange={(e) => setVerificationText(e.target.value)}
                                                    placeholder="Escribe el nombre aquí..."
                                                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                                                    autoFocus
                                                />
                                                {error && (
                                                    <motion.p
                                                        initial={{ opacity: 0, y: -10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="mt-2 text-xs font-medium text-rose-400"
                                                    >
                                                        {error}
                                                    </motion.p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Footer Actions */}
                                <div className="mt-8 flex w-full flex-col gap-3">
                                    <Button
                                        onClick={handleConfirm}
                                        disabled={loading || (step === 'verify' && verificationText !== propertyName)}
                                        className={`h-14 w-full text-lg font-bold transition-all duration-300 ${
                                            step === 'info' 
                                                ? 'bg-zinc-800 hover:bg-zinc-700 text-white' 
                                                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.4)]'
                                        }`}
                                    >
                                        {loading ? (
                                            <Loader2 className="h-6 w-6 animate-spin" />
                                        ) : step === 'info' ? (
                                            <>Entiendo el riesgo <ArrowRight className="ml-2 h-5 w-5" /></>
                                        ) : (
                                            <>Eliminar definitivamente <Trash2 className="ml-2 h-5 w-5" /></>
                                        )}
                                    </Button>
                                    
                                    {!loading && (
                                        <button
                                            onClick={step === 'info' ? onClose : () => setStep('info')}
                                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/5 text-sm font-medium text-zinc-500 hover:bg-white/5 hover:text-white transition-colors"
                                        >
                                            {step === 'verify' && <ArrowLeft className="h-4 w-4" />}
                                            {step === 'info' ? 'Cancelar / Mantener Propiedad' : 'Volver'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
