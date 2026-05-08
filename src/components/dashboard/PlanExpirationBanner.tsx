'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, Zap, ShieldAlert, Sparkles, Clock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface PlanExpirationBannerProps {
    dias?: number
    nextPaymentDate?: string
    collapsed?: boolean
}

export function PlanExpirationBanner({ dias: initialDias, nextPaymentDate, collapsed = false }: PlanExpirationBannerProps) {
    const [isVisible, setIsVisible] = useState(true)
    const [dias, setDias] = useState<number>(initialDias ?? 30)
    const [mounted, setMounted] = useState(false)
    
    // Set mounted to true to handle client-side only rendering for dynamic dates
    useEffect(() => {
        setMounted(true)
    }, [])

    // Calculate days dynamically if nextPaymentDate is provided
    useEffect(() => {
        if (nextPaymentDate) {
            const calculateDays = () => {
                const nextPayment = new Date(nextPaymentDate)
                if (isNaN(nextPayment.getTime())) return

                const now = new Date()
                const diffTime = nextPayment.getTime() - now.getTime()
                const remaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (!isNaN(remaining)) {
                    setDias(remaining)
                }
            }
            calculateDays()
            const timer = setInterval(calculateDays, 3600000)
            return () => clearInterval(timer)
        }
    }, [nextPaymentDate])

    if (!isVisible || !mounted || isNaN(dias) || dias > 31) return null

    // Premium SaaS Styles based on urgency
    const getPremiumStyles = () => {
        const currentDias = isNaN(dias) ? 30 : dias;
        if (currentDias <= 5) {
            return {
                bg: "bg-zinc-950/40",
                border: "border-rose-500/30",
                accent: "text-rose-500",
                gradient: "from-rose-600/20 via-transparent to-transparent",
                button: "bg-rose-600 hover:bg-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)]",
                icon: <ShieldAlert className="h-6 w-6 text-rose-500 animate-pulse" />,
                progressColor: "bg-rose-600"
            }
        }
        if (currentDias <= 14) {
            return {
                bg: "bg-zinc-950/40",
                border: "border-amber-500/30",
                accent: "text-amber-500",
                gradient: "from-amber-600/10 via-transparent to-transparent",
                button: "bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]",
                icon: <Zap className="h-6 w-6 text-amber-500 animate-bounce-slow" />,
                progressColor: "bg-amber-600"
            }
        }
        return {
            bg: "bg-zinc-950/40",
            border: "border-indigo-500/30",
            accent: "text-indigo-400",
            gradient: "from-indigo-600/10 via-transparent to-transparent",
            button: "bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.2)]",
            icon: <Sparkles className="h-6 w-6 text-indigo-400 animate-pulse" />,
            progressColor: "bg-indigo-600"
        }
    }

    const s = getPremiumStyles()
    const progress = Math.max(0, Math.min(100, (dias / 30) * 100))

    if (collapsed) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "mb-6 flex items-center justify-between p-3 rounded-2xl border backdrop-blur-xl group transition-all duration-500",
                    s.bg, s.border
                )}
            >
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className={cn("absolute inset-0 blur-md opacity-50", s.accent.replace('text-', 'bg-'))} />
                        <Zap className={cn("h-4 w-4 relative z-10 fill-current", s.accent)} />
                    </div>
                    <p className="text-[11px] font-bold tracking-tight text-zinc-300">
                        Suscripción: <span className={cn("font-black", s.accent)}>{dias} días</span> restantes
                    </p>
                </div>
                <Link href="/dashboard/configuracion?tab=billing" className={cn("text-[10px] font-black uppercase tracking-widest hover:brightness-125 transition-all", s.accent)}>
                    Gestionar
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
                className="mb-10 w-full group"
            >
                {/* Main Glass Container */}
                <div className={cn(
                    "relative overflow-hidden rounded-[2rem] border p-1 backdrop-blur-3xl transition-all duration-700 shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
                    s.border, s.bg
                )}>
                    
                    {/* Animated Background Gradients */}
                    <div className={cn("absolute inset-0 bg-gradient-to-br opacity-[0.08] transition-all duration-700", s.gradient)} />
                    <div className="absolute -right-24 -top-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-1000" />
                    
                    <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                        
                        {/* Content Section */}
                        <div className="flex items-center gap-8 flex-1 w-full">
                            {/* Icon Box */}
                            <div className={cn(
                                "h-16 w-16 rounded-[1.5rem] border flex items-center justify-center flex-shrink-0 shadow-2xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3",
                                s.border, "bg-zinc-900/50"
                            )}>
                                {s.icon}
                            </div>

                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">
                                        Mantén InmobiGo activo
                                    </h3>
                                    <div className={cn("hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/5 bg-white/5", s.accent)}>
                                        <Clock size={10} />
                                        Estado de Plan
                                    </div>
                                </div>
                                <p className="text-sm md:text-lg text-zinc-400 font-medium leading-relaxed max-w-xl">
                                    Tu suscripción premium vence en <span className={cn("font-black text-2xl mx-1 tabular-nums", s.accent)}>{dias} días</span>. 
                                    Renueva ahora para evitar interrupciones en tu operación.
                                </p>
                            </div>
                        </div>

                        {/* Action Section */}
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                            <Link href="/dashboard/configuracion?tab=billing" className="flex-1 md:flex-none">
                                <motion.button
                                    whileHover={{ scale: 1.05, x: 5 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        "w-full md:w-auto px-10 py-5 text-white font-black text-[11px] uppercase tracking-[0.25em] rounded-2xl transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group/btn",
                                        s.button
                                    )}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700" />
                                    <span>Renovar</span>
                                    <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                                </motion.button>
                            </Link>
                            
                            <button 
                                onClick={() => setIsVisible(false)}
                                className="p-3 hover:bg-white/5 rounded-2xl transition-all text-zinc-700 hover:text-zinc-400 border border-transparent hover:border-zinc-800"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar (SaaS Style) */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-900/50">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className={cn("h-full", s.progressColor)}
                        />
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
