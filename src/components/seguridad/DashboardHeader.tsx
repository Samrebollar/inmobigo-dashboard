'use client'

import { motion } from 'framer-motion'
import { Calendar } from 'lucide-react'

interface DashboardHeaderProps {
    userEmail?: string
    userName?: string
}

export function DashboardHeader({ userEmail, userName }: DashboardHeaderProps) {
    const date = new Date().toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    // Use provided name or extract from email, or fallback
    const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Administrador')

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
            >
                <h1 className="text-3xl font-bold tracking-tight text-white capitalize">
                    Hola, {displayName}
                </h1>
                <p className="text-zinc-400">
                    Aquí está el resumen general
                </p>
            </motion.div>
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-400"
            >
                <Calendar className="h-4 w-4" />
                <span className="capitalize">{date}</span>
            </motion.div>
        </div>
    )
}

