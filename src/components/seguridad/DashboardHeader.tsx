'use client'

import { motion } from 'framer-motion'
import { Calendar, Clock, ShieldCheck, MapPin, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'

interface DashboardHeaderProps {
    userEmail?: string
    userName?: string
    condoName?: string
}

export function DashboardHeader({ userEmail, userName, condoName = 'Condominio Central' }: DashboardHeaderProps) {
    const [mounted, setMounted] = useState(false)
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        setMounted(true)
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    if (!mounted) {
        return (
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-8 bg-black">
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-zinc-900 animate-pulse rounded-full" />
                    <div className="h-10 w-64 bg-zinc-900 animate-pulse rounded-lg" />
                </div>
                <div className="h-16 w-48 bg-zinc-900 animate-pulse rounded-2xl" />
            </div>
        )
    }

    const dateStr = currentTime.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    const timeStr = currentTime.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    })

    const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Oficial de Seguridad')

    return (
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-zinc-900 pb-8 bg-black">
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-2"
            >
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500 ring-1 ring-emerald-500/20">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                        Sistema Activo
                    </div>
                </div>
                
                <h1 className="text-3xl font-bold tracking-tight text-white">
                    Panel de Control, <span className="text-indigo-400">{displayName}</span>
                </h1>
                <p className="text-zinc-500 text-sm md:text-base max-w-lg">
                    Supervisión y gestión de accesos en tiempo real para la seguridad del condominio.
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto"
            >
                <div className="text-left md:text-right w-full">
                    <div className="flex items-center gap-2 md:justify-end mb-1">
                        <Calendar className="h-4 w-4 text-indigo-400" />
                        <span className="text-lg md:text-xl font-bold text-white capitalize tracking-tight">{dateStr}</span>
                    </div>
                    <div className="flex items-center gap-2 md:justify-end text-zinc-400 font-mono text-[10px] md:text-sm bg-zinc-900/30 py-1 px-3 rounded-full border border-zinc-900/50 w-fit md:ml-auto">
                        <Clock size={14} className="text-zinc-600" />
                        <span>{timeStr}</span>
                    </div>
                </div>

                <div className="relative group w-full md:w-auto">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 group-hover:text-indigo-400 transition-colors">
                        <MapPin size={14} />
                    </div>
                    <select className="appearance-none bg-zinc-900/50 border border-zinc-800 text-zinc-300 text-[10px] font-black uppercase tracking-[0.15em] py-2.5 pl-10 pr-10 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/50 cursor-pointer hover:border-zinc-700 hover:bg-zinc-900 transition-all w-full md:w-60">
                        <option className="bg-zinc-950">Todas las propiedades</option>
                        <option className="bg-zinc-950">Las palmas</option>
                        <option className="bg-zinc-950">Zacil</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
                        <ChevronDown size={14} />
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

