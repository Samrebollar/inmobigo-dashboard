'use client'

import { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface PremiumCardProps {
    children: ReactNode
    className?: string
    glowColor?: string
    hover?: boolean
    delay?: number
}

export function PremiumCard({ 
    children, 
    className = '', 
    glowColor = 'indigo', 
    hover = true,
    delay = 0
}: PremiumCardProps) {
    const glows: Record<string, string> = {
        indigo: 'shadow-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/40',
        rose: 'shadow-rose-500/10 border-rose-500/20 hover:border-rose-500/40',
        amber: 'shadow-amber-500/10 border-amber-500/20 hover:border-amber-500/40',
        emerald: 'shadow-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/40',
        blue: 'shadow-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
        zinc: 'shadow-zinc-500/5 border-zinc-800 hover:border-zinc-700',
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
                duration: 0.5, 
                delay,
                type: 'spring',
                stiffness: 260,
                damping: 20 
            }}
            whileHover={hover ? { y: -5, scale: 1.01 } : {}}
            className={`
                relative overflow-hidden
                bg-[#0d0d12]/80 backdrop-blur-xl
                border rounded-2xl p-5
                shadow-2xl transition-all duration-300
                ${glows[glowColor] || glows.zinc}
                ${className}
            `}
        >
            {/* Subtle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
            
            {/* Glossy Reflection */}
            <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] bg-gradient-to-br from-white/[0.05] via-transparent to-transparent rotate-12 pointer-events-none transition-transform duration-1000 group-hover:translate-x-[10%] group-hover:translate-y-[10%]" />
            
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    )
}
