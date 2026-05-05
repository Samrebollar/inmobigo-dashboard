'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { 
    Users, 
    Activity, 
    Wrench, 
    AlertTriangle, 
    QrCode, 
    Package, 
    UserPlus, 
    ChevronRight,
    Search,
    Filter,
    Bell,
    CheckCircle2,
    XCircle,
    Clock
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DashboardHeader } from '@/components/seguridad/DashboardHeader'

interface SecurityDashboardClientProps {
    userEmail?: string
    userName?: string
    stats?: {
        incidenciasPendientes: number
        anuncios: number
    }
    recentActivity?: any[]
    condoName?: string
}

export default function SecurityDashboardAdminClient({ 
    userEmail, 
    userName, 
    stats = { incidenciasPendientes: 0, anuncios: 0 }, 
    recentActivity = [],
    condoName
}: SecurityDashboardClientProps) {
    const [activeTab, setActiveTab] = useState<'visitas' | 'paqueteria' | 'alertas'>('visitas')
    
    // Mocks para KPIs operativos en tiempo real
    const operationalStats = [
        { label: 'Accesos Hoy', value: '124', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'hover:border-emerald-500/50' },
        { label: 'Visitas Activas', value: '12', icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'hover:border-indigo-500/50' },
        { label: 'Paquetes Pendientes', value: '08', icon: Package, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'hover:border-amber-500/50' },
        { label: 'Incidencias', value: stats.incidenciasPendientes.toString(), icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'hover:border-rose-500/50' },
    ]

    // Mocks para el Feed de Actividad
    const activityFeed = [
        { id: 1, type: 'qr', title: 'QR Aprobado', house: 'Casa 45', details: 'Visitante: Juan Pérez', time: 'Hace 2 min', status: 'success' },
        { id: 2, type: 'package', title: 'Paquete Recibido', house: 'Depto 203', details: 'Amazon - Tracking: 456X', time: 'Hace 5 min', status: 'pending' },
        { id: 3, type: 'access', title: 'Acceso Denegado', house: 'Casa 12', details: 'QR Expirado', time: 'Hace 15 min', status: 'error' },
        { id: 4, type: 'incident', title: 'Falla Eléctrica', house: 'Área Común', details: 'Reportado por Guardia', time: 'Hace 30 min', status: 'warning' },
    ]

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8 bg-black min-h-screen">
            <DashboardHeader userEmail={userEmail} userName={userName} condoName={condoName} />

            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-10"
            >
                {/* 1. KPIs Operativos */}
                <div className="grid gap-6 grid-cols-2 lg:grid-cols-4">
                    {operationalStats.map((stat, idx) => (
                        <motion.div key={idx} variants={item} whileHover={{ y: -5 }}>
                            <Card className={cn("bg-zinc-950 border-zinc-900 transition-all duration-300 h-40 flex flex-col justify-between overflow-hidden", stat.border)}>
                                <CardContent className="p-8 pt-10 flex flex-col justify-between h-full">
                                    <div className="flex items-center justify-between">
                                        <div className={cn("p-3 rounded-xl", stat.bg)}>
                                            <stat.icon className={cn("h-6 w-6", stat.color)} />
                                        </div>
                                        <p className="text-4xl font-bold text-white tracking-tight tabular-nums">
                                            {stat.value}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] leading-none">
                                            {stat.label}
                                        </p>
                                        <div className={cn("h-1 w-6 rounded-full", stat.bg.replace('/10', '/30'))} />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="grid gap-8 lg:grid-cols-12">
                    {/* 2. Sección Principal: Feed de Actividad */}
                    <motion.div variants={item} className="lg:col-span-4 space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Activity className="h-5 w-5 text-indigo-500" />
                                Actividad Real
                            </h2>
                            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest animate-pulse">
                                En Vivo
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            {activityFeed.map((event) => (
                                <motion.div 
                                    key={event.id}
                                    whileHover={{ x: 5 }}
                                    className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110",
                                            event.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' :
                                            event.status === 'error' ? 'bg-rose-500/10 text-rose-500' :
                                            event.status === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                        )}>
                                            {event.type === 'qr' && <QrCode className="h-5 w-5" />}
                                            {event.type === 'package' && <Package className="h-5 w-5" />}
                                            {event.type === 'access' && <XCircle className="h-5 w-5" />}
                                            {event.type === 'incident' && <AlertTriangle className="h-5 w-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-bold text-white">{event.title}</p>
                                                <span className="text-[10px] text-zinc-600 font-mono italic">{event.time}</span>
                                            </div>
                                            <p className="text-xs text-zinc-400 font-medium mb-1">{event.house}</p>
                                            <p className="text-[11px] text-zinc-500 truncate">{event.details}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full text-zinc-500 hover:text-white hover:bg-zinc-900 text-xs">
                            Ver historial completo
                        </Button>
                    </motion.div>

                    {/* 3. Panel de Control & Tabla */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Acciones Rápidas */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Escanear QR', icon: QrCode, color: 'bg-indigo-600 hover:bg-indigo-500', desc: 'Acceso rápido' },
                                { label: 'Visita', icon: UserPlus, color: 'bg-emerald-600 hover:bg-emerald-500', desc: 'Registro manual' },
                                { label: 'Paquete', icon: Package, color: 'bg-amber-600 hover:bg-amber-500', desc: 'Recepción' },
                                { label: 'Incidente', icon: AlertTriangle, color: 'bg-rose-600 hover:bg-rose-500', desc: 'Reportar falla' },
                            ].map((action, i) => (
                                <motion.button
                                    key={i}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-6 rounded-2xl transition-all shadow-xl gap-3 text-white group",
                                        action.color
                                    )}
                                >
                                    <action.icon className="h-8 w-8 transition-transform group-hover:scale-110" />
                                    <div className="text-center">
                                        <p className="text-sm font-bold">{action.label}</p>
                                        <p className="text-[10px] opacity-70 font-medium uppercase tracking-tighter">{action.desc}</p>
                                    </div>
                                </motion.button>
                            ))}
                        </div>

                        {/* Tabla de Gestión */}
                        <Card className="bg-zinc-950 border-zinc-900 shadow-2xl overflow-hidden rounded-2xl">
                            <CardHeader className="border-b border-zinc-900 pb-0">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl">
                                        {(['visitas', 'paqueteria', 'alertas'] as const).map((tab) => (
                                            <button
                                                key={tab}
                                                onClick={() => setActiveTab(tab)}
                                                className={cn(
                                                    "px-6 py-2 text-xs font-bold rounded-lg transition-all capitalize",
                                                    activeTab === tab ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-300"
                                                )}
                                            >
                                                {tab}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                            <input 
                                                type="text" 
                                                placeholder="Buscar por casa..." 
                                                className="bg-zinc-900 border-none rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder:text-zinc-600 outline-none focus:ring-1 focus:ring-indigo-500/50 w-48"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-zinc-900 bg-zinc-900/20">
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nombre</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Casa</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Estado</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Hora</th>
                                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500 text-right">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-900/50">
                                            {[...Array(5)].map((_, i) => (
                                                <tr key={i} className="hover:bg-zinc-900/30 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-xs">
                                                                {String.fromCharCode(65 + i)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-zinc-200">Visitante Ejemplo {i+1}</p>
                                                                <p className="text-[10px] text-zinc-600">ID: 4567-{i}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-medium text-zinc-400">Casa 1{i+1}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter",
                                                            i % 3 === 0 ? "bg-emerald-500/10 text-emerald-500" :
                                                            i % 3 === 1 ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                                                        )}>
                                                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                                            {i % 3 === 0 ? "Aprobado" : i % 3 === 1 ? "Pendiente" : "Problema"}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-xs font-mono text-zinc-500">14:2{i} PM</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-indigo-500/10 hover:text-indigo-400">
                                                            <ChevronRight className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Footer Section - Links preserving module structure */}
                <div className="pt-8 border-t border-zinc-900 flex items-center justify-between">
                    <p className="text-xs text-zinc-600 font-medium italic">InmobiGo v2.4 Security Sentinel Edition</p>
                    <div className="flex items-center gap-6">
                        <Link href="/seguridad/avisos" className="text-xs text-zinc-500 hover:text-indigo-400 transition-colors font-bold uppercase tracking-widest">
                            Panel de Avisos
                        </Link>
                        <Link href="/seguridad/configuracion" className="text-xs text-zinc-500 hover:text-white transition-colors">
                            Configuración
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

