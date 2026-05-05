'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, X, Camera, ShieldCheck, AlertCircle, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QRScannerModalProps {
    isOpen: boolean
    onClose: () => void
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
    const [isScanning, setIsScanning] = useState(true)
    const [result, setResult] = useState<'success' | 'error' | null>(null)

    // Simulación de escaneo para demo
    useEffect(() => {
        if (isOpen) {
            setIsScanning(true)
            setResult(null)
        }
    }, [isOpen])

    useEffect(() => {
        if (isOpen && isScanning) {
            const timer = setTimeout(() => {
                setIsScanning(false)
                setResult('success')
            }, 3000)
            return () => clearTimeout(timer)
        }
    }, [isOpen, isScanning])

    if (!isOpen) return null

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
                    className="relative w-full max-w-lg bg-zinc-950 border border-zinc-900 rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-8 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                <QrCode className="h-6 w-6 text-indigo-500" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white tracking-tight">Escáner de Acceso</h2>
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">Cámara Activa</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-3 bg-zinc-900 text-zinc-500 hover:text-white rounded-2xl transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Camera Area */}
                        <div className="relative aspect-square w-full bg-zinc-900 rounded-[2rem] overflow-hidden border border-zinc-800 shadow-inner group">
                            {isScanning ? (
                                <>
                                    {/* Laser Animation */}
                                    <motion.div 
                                        initial={{ top: '0%' }}
                                        animate={{ top: '100%' }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.8)] z-10"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Camera className="h-16 w-16 text-zinc-800 animate-pulse" />
                                    </div>
                                    <div className="absolute inset-10 border-2 border-indigo-500/20 rounded-3xl border-dashed" />
                                </>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
                                >
                                    {result === 'success' ? (
                                        <>
                                            <div className="h-24 w-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-500/5">
                                                <ShieldCheck className="h-12 w-12" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Pase Validado</h3>
                                            <p className="text-sm text-zinc-400 font-medium max-w-[200px]">Bienvenido, Juan Pérez. El acceso ha sido registrado.</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-24 w-24 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-rose-500/5">
                                                <AlertCircle className="h-12 w-12" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Acceso Denegado</h3>
                                            <p className="text-sm text-zinc-400 font-medium">El código QR ya fue utilizado o ha expirado.</p>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {/* Controls */}
                        {!isScanning && (
                            <div className="grid grid-cols-2 gap-4">
                                <Button 
                                    onClick={() => setIsScanning(true)}
                                    className="h-14 rounded-2xl bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white font-bold gap-2"
                                >
                                    <RefreshCcw className="h-4 w-4" /> Reintentar
                                </Button>
                                <Button 
                                    onClick={onClose}
                                    className="h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                                >
                                    Finalizar
                                </Button>
                            </div>
                        )}

                        {isScanning && (
                            <p className="text-center text-xs text-zinc-500 font-bold uppercase tracking-[0.2em] animate-pulse">
                                Alinea el código QR dentro del recuadro
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
