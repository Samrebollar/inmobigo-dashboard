'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PlanExpirationBannerProps {
    daysRemaining: number
    onClose?: () => void
}

export function PlanExpirationBanner({ daysRemaining, onClose }: PlanExpirationBannerProps) {
    const [isVisible, setIsVisible] = useState(true)

    if (!isVisible || daysRemaining > 30) return null

    const handleClose = () => {
        setIsVisible(false)
        if (onClose) onClose()
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
            >
                <div className="relative bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                            <Calendar className="h-6 w-6 text-amber-500" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                Tu plan de negocios caducará pronto.
                                {daysRemaining <= 7 && (
                                    <span className="bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                                        Crítico
                                    </span>
                                )}
                            </h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Tienes <span className="font-bold text-zinc-900 dark:text-white">{daysRemaining} días</span> para renovarlo y mantener tu(s) sitio(s) web en línea.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Button 
                            asChild
                            className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold px-6 shadow-lg shadow-indigo-500/20"
                        >
                            <Link href="/dashboard/configuracion?tab=billing">
                                Renovar <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <button 
                            onClick={handleClose}
                            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Subtle glow effect for premium feel */}
                    <div className="absolute -z-10 top-0 left-0 w-full h-full bg-gradient-to-r from-indigo-500/5 to-transparent opacity-50" />
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
