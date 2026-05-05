'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertCircle, Bell, Info, ChevronRight, Zap } from 'lucide-react'
import Link from 'next/link'

interface PlanExpirationBannerProps {
    dias: number
    collapsed?: boolean
}

export function PlanExpirationBanner({ dias, collapsed = false }: PlanExpirationBannerProps) {
    const [isVisible, setIsVisible] = useState(true)
    
    // El banner se muestra durante todo el ciclo mensual (<= 31 días)
    if (!isVisible || dias > 31) return null

    // Estados visuales según la urgencia (días)
    const getStyles = () => {
        if (dias <= 3) {
            return {
                bg: "bg-red-500/10",
                border: "border-red-500/20",
                text: "text-red-500",
                button: "bg-red-600 hover:bg-red-700 shadow-red-900/20",
                icon: <AlertCircle className="h-6 w-6 text-red-500" />,
                accent: "text-red-400"
            }
        }
        if (dias <= 10) {
            return {
                bg: "bg-amber-500/10",
                border: "border-amber-500/20",
                text: "text-amber-500",
                button: "bg-amber-600 hover:bg-amber-700 shadow-amber-900/20",
                icon: <Bell className="h-6 w-6 text-amber-500" />,
                accent: "text-amber-400"
            }
        }
        return {
            bg: "bg-zinc-900/80",
            border: "border-white/10",
            text: "text-indigo-400",
            button: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20",
            icon: <Info className="h-6 w-6 text-indigo-400" />,
            accent: "text-indigo-400"
        }
    }

    const s = getStyles()

    // Renderizado Variante Compacta (Collapsed)
    if (collapsed) {
        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mb-6 flex items-center justify-between p-3 rounded-xl border ${s.bg} ${s.border} backdrop-blur-sm`}
            >
                <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-indigo-500 fill-current" />
                    <p className="text-xs font-medium text-zinc-300">
                        Tu plan vence en <span className={`font-bold ${s.accent}`}>{dias} días</span>.
                    </p>
                </div>
                <Link href="/dashboard/configuracion?tab=billing" className={`text-xs font-bold ${s.text} hover:underline`}>
                    Renovar ahora
                </Link>
            </motion.div>
        )
    }

    // Renderizado Variante Full (Premium SaaS)
    // Definimos la variante para que coincida con las tarjetas
    const item = {
        hidden: { y: 20, opacity: 0 },
        show: {
            y: 0,
            opacity: 1,
            transition: {
                type: "spring",
                stiffness: 260,
                damping: 20
            }
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                variants={item}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-10 w-full relative"
            >
                <div className={`relative overflow-hidden ${s.bg} backdrop-blur-2xl rounded-2xl p-6 md:p-8 border ${s.border} shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 transition-all duration-300`}>
                    
                    {/* Elementos decorativos de fondo */}
                    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <div className={`absolute -right-20 -top-20 w-64 h-64 ${dias <= 10 ? 'bg-amber-500/5' : 'bg-indigo-500/5'} blur-[100px] rounded-full`} />

                    {/* Contenido Izquierdo: Icono + Texto */}
                    <div className="flex items-center gap-6 flex-1 w-full relative z-10">
                        <div className={`h-14 w-14 rounded-2xl ${s.bg} border ${s.border} flex items-center justify-center flex-shrink-0 shadow-inner`}>
                            {s.icon}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <h3 className="text-2xl font-bold text-white tracking-tight">
                                Mantén InmobiGo activo sin interrupciones
                            </h3>
                            <p className="text-sm md:text-base text-zinc-400 font-medium">
                                Tu plan vence en <span className={`text-lg font-black ${s.accent} mx-1`}>{dias} días</span>. 
                                Renueva ahora para seguir automatizando tu operación.
                            </p>
                        </div>
                    </div>

                    {/* Lado Derecho: Acción + Cierre */}
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end relative z-10">
                        <Link href="/dashboard/configuracion?tab=billing" className="flex-1 md:flex-none">
                            <motion.button
                                whileHover={{ scale: 1.03, x: 5 }}
                                whileTap={{ scale: 0.97 }}
                                className={`w-full md:w-auto px-8 py-4 ${s.button} text-white font-black text-xs uppercase tracking-[0.2em] rounded-xl shadow-2xl transition-all flex items-center justify-center gap-3`}
                            >
                                Renovar
                                <ChevronRight className="h-4 w-4" />
                            </motion.button>
                        </Link>
                        
                        <button 
                            onClick={() => setIsVisible(false)}
                            className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-700 hover:text-zinc-500"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                </div>
            </motion.div>
        </AnimatePresence>
    )
}
