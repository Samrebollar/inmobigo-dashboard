'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Zap, ShieldAlert, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PlanExpirationBannerProps {
    daysRemaining?: number
    nextPaymentDate?: string
    onClose?: () => void
    collapsed?: boolean
}

export function PlanExpirationBanner({ 
    daysRemaining: initialDays, 
    nextPaymentDate, 
    onClose,
    collapsed = false 
}: PlanExpirationBannerProps) {
    const [isVisible, setIsVisible] = useState(true)
    const [dias, setDias] = useState<number>(initialDays ?? 0)
    const [mounted, setMounted] = useState(false)

    // Handle hydration
    useEffect(() => {
        setMounted(true)
    }, [])

    // Dynamic Logic: Update days based on nextPaymentDate
    useEffect(() => {
        if (!nextPaymentDate) return

        const calculateDays = () => {
            const nextPayment = new Date(nextPaymentDate)
            if (isNaN(nextPayment.getTime())) return

            const now = new Date()
            const diffTime = nextPayment.getTime() - now.getTime()
            const remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            
            setDias(Math.max(0, remaining))
        }

        calculateDays()
        const timer = setInterval(calculateDays, 3600000) // Update every hour
        return () => clearInterval(timer)
    }, [nextPaymentDate])

    // Premium SaaS Styles based on urgency
    const s = useMemo(() => {
        const currentDias = isNaN(dias) ? 0 : dias;
        if (currentDias <= 3) {
            return {
                bg: "bg-zinc-950/60",
                border: "border-rose-500/40",
                accent: "text-rose-500",
                shadow: "shadow-[0_0_50px_-12px_rgba(225,29,72,0.5)]",
                gradient: "from-rose-600/20 via-rose-600/5 to-transparent",
                button: "bg-rose-600 hover:bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)]",
                icon: <ShieldAlert className="h-6 w-6 text-rose-500 animate-pulse" />,
                progressColor: "bg-gradient-to-r from-rose-600 to-rose-400",
                glow: "bg-rose-500/10"
            }
        }
        if (currentDias <= 10) {
            return {
                bg: "bg-zinc-950/60",
                border: "border-amber-500/40",
                accent: "text-amber-500",
                shadow: "shadow-[0_0_50px_-12px_rgba(245,158,11,0.4)]",
                gradient: "from-amber-600/15 via-amber-600/5 to-transparent",
                button: "bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]",
                icon: <Zap className="h-6 w-6 text-amber-500 animate-bounce-slow" />,
                progressColor: "bg-gradient-to-r from-amber-600 to-amber-400",
                glow: "bg-amber-500/5"
            }
        }
        return {
            bg: "bg-zinc-950/60",
            border: "border-indigo-500/40",
            accent: "text-indigo-400",
            shadow: "shadow-[0_0_50px_-12px_rgba(79,70,229,0.3)]",
            gradient: "from-indigo-600/15 via-indigo-600/5 to-transparent",
            button: "bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)]",
            icon: <Sparkles className="h-6 w-6 text-indigo-400 animate-pulse" />,
            progressColor: "bg-gradient-to-r from-indigo-600 to-indigo-400",
            glow: "bg-indigo-500/5"
        }
    }, [dias])

    if (!isVisible || !mounted || isNaN(dias) || dias > 31) return null

    const handleClose = () => {
        setIsVisible(false)
        if (onClose) onClose()
    }

    const progress = Math.max(0, Math.min(100, (dias / 30) * 100))

    if (collapsed) {
        return (
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                    "group relative flex items-center justify-between p-3 rounded-xl border backdrop-blur-2xl transition-all duration-500",
                    s.bg, s.border, s.shadow
                )}
            >
                <div className="flex items-center gap-3">
                    <div className={cn("p-1.5 rounded-lg bg-zinc-900/50 border", s.border)}>
                        {s.icon}
                    </div>
                    <p className="text-xs font-bold text-white">
                        <span className={cn("font-black", s.accent)}>{dias}</span> días restantes
                    </p>
                </div>
                <Link href="/seguridad/configuracion?tab=billing" className={cn("p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors", s.accent)}>
                    <ChevronRight size={16} />
                </Link>
            </motion.div>
        )
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                className="mb-8 w-full group"
            >
                <div className={cn(
                    "relative overflow-hidden rounded-[1.5rem] border p-0.5 backdrop-blur-3xl transition-all duration-700",
                    s.border, s.bg, s.shadow
                )}>
                    {/* Animated Background Elements */}
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-10 transition-all duration-700", s.gradient)} />
                    
                    <div className="relative z-10 p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5 flex-1 w-full">
                            {/* Premium Icon Box */}
                            <div className={cn(
                                "h-12 w-12 rounded-xl border flex items-center justify-center flex-shrink-0 shadow-xl transition-all duration-700 group-hover:scale-105 group-hover:rotate-3",
                                s.border, "bg-zinc-900/80 backdrop-blur-xl"
                            )}>
                                {s.icon}
                            </div>

                            <div className="flex flex-col gap-0.5">
                                <h3 className="text-lg font-black text-white tracking-tight">
                                    Estado de Membresía
                                </h3>
                                <p className="text-sm text-zinc-400 font-medium">
                                    Tu acceso premium expira en <span className={cn("font-black text-base mx-0.5 tabular-nums", s.accent)}>{dias} días</span>. 
                                    Renueva para mantener tu operación activa.
                                </p>
                            </div>
                        </div>

                        {/* Action Section */}
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <Link href="/seguridad/configuracion?tab=billing" className="flex-1 md:flex-none">
                                <motion.button
                                    whileHover={{ scale: 1.02, x: 2 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                        "w-full md:w-auto px-6 py-3 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-xl transition-all duration-300 flex items-center justify-center gap-2 relative overflow-hidden group/btn",
                                        s.button
                                    )}
                                >
                                    <span>Renovar</span>
                                    <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-1 transition-transform" />
                                </motion.button>
                            </Link>
                            
                            <button 
                                onClick={handleClose}
                                className="p-2 hover:bg-white/5 rounded-xl transition-all text-zinc-700 hover:text-zinc-400 group/close"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Dynamic Progress Bar */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-950/50">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={cn("h-full relative", s.progressColor)}
                        >
                            <div className="absolute top-0 right-0 h-full w-10 bg-white/10 blur-sm" />
                        </motion.div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
