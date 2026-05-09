'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QrCode, X, Camera, ShieldCheck, AlertCircle, RefreshCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Html5Qrcode } from 'html5-qrcode'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface QRScannerModalProps {
    isOpen: boolean
    onClose: () => void
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
    const [isScanning, setIsScanning] = useState(false)
    const [isInitializing, setIsInitializing] = useState(false)
    const [result, setResult] = useState<'success' | 'error' | null>(null)
    const [scanData, setScanData] = useState<string | null>(null)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    
    const scannerRef = useRef<Html5Qrcode | null>(null)
    const isTransitioning = useRef(false)
    const containerId = "qr-reader-container"

    // Definir funciones antes del useEffect para evitar ReferenceErrors
    const stopScanner = async () => {
        if (!scannerRef.current || isTransitioning.current) return
        
        // Si no está escaneando, no hay nada que detener
        if (!scannerRef.current.isScanning) {
            scannerRef.current = null
            return
        }

        isTransitioning.current = true
        try {
            await scannerRef.current.stop()
            scannerRef.current = null
            
            const container = document.getElementById(containerId)
            if (container) container.innerHTML = ""
        } catch (err) {
            // Solo loguear si no es el error de transición esperado
            if (!err?.toString()?.includes("transition")) {
                console.error("Error al detener el escáner:", err)
            }
        } finally {
            setIsScanning(false)
            isTransitioning.current = false
        }
    }

    const handleScanSuccess = async (decodedText: string) => {
        // Detenemos el escáner inmediatamente
        await stopScanner()
        
        setScanData(decodedText)
        setIsScanning(false)
        
        if (decodedText) {
            setResult('success')
            toast.success("Código QR detectado correctamente")
        } else {
            setResult('error')
            toast.error("Código QR inválido o expirado")
        }
    }

    const startScanner = async () => {
        if (isTransitioning.current) return
        isTransitioning.current = true

        setIsInitializing(true)
        setIsScanning(false)
        setResult(null)
        setScanData(null)
        setErrorMsg(null)

        try {
            // Pequeño delay para asegurar que el DOM esté listo
            await new Promise(resolve => setTimeout(resolve, 300))
            
            const container = document.getElementById(containerId)
            if (!container) throw new Error("Contenedor no encontrado")

            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(containerId)
            }

            const config = { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            }

            await scannerRef.current.start(
                { facingMode: "environment" },
                config,
                (decodedText) => {
                    handleScanSuccess(decodedText)
                },
                () => {}
            )
            
            setIsScanning(true)
        } catch (err: any) {
            console.error("Error al iniciar el escáner:", err)
            if (!err?.toString()?.includes("transition")) {
                setErrorMsg("No se pudo acceder a la cámara. Por favor verifica los permisos.")
                toast.error("Error de acceso a la cámara")
            }
        } finally {
            setIsInitializing(false)
            isTransitioning.current = false
        }
    }

    // Inicializar / Detener escáner con el ciclo de vida
    useEffect(() => {
        if (isOpen) {
            startScanner()
        } else {
            stopScanner()
        }

        return () => {
            stopScanner()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
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
                                <p className="text-xs text-zinc-500 font-medium uppercase tracking-widest">
                                    {isScanning ? "Cámara Activa" : "Validación de Código"}
                                </p>
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
                            
                            <div 
                                id={containerId} 
                                className={cn(
                                    "absolute inset-0 w-full h-full object-cover",
                                    !isScanning && "hidden"
                                )}
                            />

                            {isInitializing && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/50 z-20">
                                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
                                    <p className="text-zinc-400 text-sm font-medium">Iniciando cámara...</p>
                                </div>
                            )}

                            {errorMsg && !isScanning && !isInitializing && !result && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950/80 z-30">
                                    <div className="h-20 w-20 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-6">
                                        <AlertCircle className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">Error de Cámara</h3>
                                    <p className="text-sm text-zinc-400 mb-6">{errorMsg}</p>
                                    <Button 
                                        onClick={startScanner}
                                        className="rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white"
                                    >
                                        Intentar de nuevo
                                    </Button>
                                </div>
                            )}

                            {isScanning && (
                                <>
                                    <motion.div 
                                        initial={{ top: '0%' }}
                                        animate={{ top: '100%' }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                        className="absolute left-0 right-0 h-1 bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.8)] z-10 pointer-events-none"
                                    />
                                    <div className="absolute inset-10 border-2 border-white/20 rounded-3xl border-dashed pointer-events-none z-10" />
                                    <div className="absolute inset-0 bg-black/20 pointer-events-none" />
                                </>
                            )}

                            {!isScanning && result && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-zinc-950 z-40"
                                >
                                    {result === 'success' ? (
                                        <>
                                            <div className="h-24 w-24 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-emerald-500/5">
                                                <ShieldCheck className="h-12 w-12" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Acceso Permitido</h3>
                                            <div className="space-y-1 mb-6">
                                                <p className="text-sm text-zinc-400 font-medium italic">Datos del Código:</p>
                                                <p className="text-indigo-400 font-mono text-xs break-all px-4">{scanData}</p>
                                            </div>
                                            <p className="text-sm text-zinc-500">Pase validado correctamente a las {new Date().toLocaleTimeString()}</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-24 w-24 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-6 ring-8 ring-rose-500/5">
                                                <AlertCircle className="h-12 w-12" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Acceso Denegado</h3>
                                            <p className="text-sm text-zinc-400 font-medium">El código QR no es válido, ha sido utilizado previamente o ha expirado.</p>
                                        </>
                                    )}
                                </motion.div>
                            )}
                        </div>

                        {!isScanning && !isInitializing && (
                            <div className="grid grid-cols-2 gap-4">
                                <Button 
                                    onClick={startScanner}
                                    className="h-14 rounded-2xl bg-zinc-900 border-zinc-800 hover:bg-zinc-800 text-white font-bold gap-2"
                                >
                                    <RefreshCcw className="h-4 w-4" /> {result ? "Escanear otro" : "Reintentar"}
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
