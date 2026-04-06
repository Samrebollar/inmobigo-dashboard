'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    ShieldCheck, 
    Search, 
    Filter, 
    CheckCircle2, 
    XCircle, 
    Calendar as CalendarIcon,
    ArrowLeft,
    Building2,
    Users,
    TrendingUp,
    FileText,
    ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface ControlLecturaClientProps {
    initialViews: any[]
    announcements: any[]
    organizationId: string
    totalResidents: number
}

export function ControlLecturaClient({ 
    initialViews, 
    announcements, 
    organizationId,
    totalResidents 
}: ControlLecturaClientProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [propertyFilter, setPropertyFilter] = useState('all')
    const [announcementFilter, setAnnouncementFilter] = useState('all')

    // Extraer propiedades únicas de los registros
    const properties = useMemo(() => {
        const unique = new Set(initialViews.map(v => v.property_name).filter(Boolean))
        return Array.from(unique)
    }, [initialViews])

    // Filtrado de datos
    const filteredViews = useMemo(() => {
        return initialViews.filter(view => {
            const matchesSearch = (view.resident_name || '').toLowerCase().includes(searchTerm.toLowerCase())
            const matchesProperty = propertyFilter === 'all' || view.property_name === propertyFilter
            const matchesAnnouncement = announcementFilter === 'all' || view.announcement_id === announcementFilter
            return matchesSearch && matchesProperty && matchesAnnouncement
        })
    }, [initialViews, searchTerm, propertyFilter, announcementFilter])

    // Estadísticas
    const totalConfirmed = initialViews.filter(v => v.acknowledged).length
    const readingRate = totalResidents > 0 ? Math.round((totalConfirmed / totalResidents) * 100) : 0

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <Link href="/dashboard/avisos">
                        <Button variant="ghost" className="mb-4 -ml-4 text-zinc-500 hover:text-white hover:bg-white/5 gap-2">
                            <ArrowLeft size={16} /> Volver a Avisos
                        </Button>
                    </Link>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-zinc-400 to-zinc-500 bg-clip-text text-transparent">
                        Control de Lectura
                    </h1>
                    <p className="text-zinc-500 font-medium">
                        Monitoreo en tiempo real de la recepción y confirmación de anuncios oficiales.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-4">
                        <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 shadow-lg">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/70">Confirmaciones</p>
                            <p className="text-2xl font-black text-white">{totalConfirmed}</p>
                        </div>
                    </div>

                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 shadow-2xl">
                        <div className="h-10 w-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shadow-lg">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400/70">Alcance Total</p>
                            <div className="flex items-center gap-2">
                                <p className="text-2xl font-black text-white">{readingRate}%</p>
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-none text-[10px] font-black uppercase">Leído</Badge>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 backdrop-blur-xl">
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <Input 
                        placeholder="Buscar por residente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-zinc-950/50 border-white/5 pl-12 h-14 rounded-2xl focus:ring-indigo-500/20 focus:border-indigo-500/40 text-sm transition-all"
                    />
                </div>

                <div className="relative group">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <select 
                        value={propertyFilter}
                        onChange={(e) => setPropertyFilter(e.target.value)}
                        className="w-full bg-zinc-950/50 border border-white/5 pl-12 pr-4 h-14 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 text-sm text-zinc-300 appearance-none transition-all"
                    >
                        <option value="all">Todas las Propiedades</option>
                        {properties.map(p => (
                            <option key={p} value={p}>{p}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                </div>

                <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <select 
                        value={announcementFilter}
                        onChange={(e) => setAnnouncementFilter(e.target.value)}
                        className="w-full bg-zinc-950/50 border border-white/5 pl-12 pr-4 h-14 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/40 text-sm text-zinc-300 appearance-none transition-all"
                    >
                        <option value="all">Todos los Anuncios</option>
                        {announcements.map(a => (
                            <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                </div>
            </div>

            {/* Table */}
            <div className="bg-zinc-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-3xl shadow-2xl ring-1 ring-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Anuncio</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Residente</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Unidad</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Propiedad</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Estado</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 text-center">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence mode='popLayout'>
                                {filteredViews.length > 0 ? (
                                    filteredViews.map((view, idx) => (
                                        <motion.tr 
                                            key={view.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            className="group hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="h-8 w-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-400 group-hover:text-indigo-400 transition-colors shrink-0">
                                                        <FileText size={14} />
                                                    </div>
                                                    <p className="text-sm font-bold text-white group-hover:text-indigo-100 transition-colors line-clamp-1">{view.announcement_title || 'N/A'}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="flex items-center justify-center gap-3">
                                                    <div className="h-8 w-8 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 font-bold text-[10px] shadow-inner shrink-0">
                                                        {(view.resident_name || 'R').charAt(0)}
                                                    </div>
                                                    <p className="text-sm font-semibold text-zinc-300 group-hover:text-white transition-colors truncate">{view.resident_name || 'Desconocido'}</p>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <Badge variant="outline" className="bg-zinc-800/50 border-white/5 text-zinc-300 font-bold px-3 py-1 rounded-lg">
                                                        {view.unit_name || 'N/A'}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center justify-center gap-2 text-zinc-500 group-hover:text-zinc-300">
                                                    <Building2 size={14} />
                                                    <span className="text-xs font-medium">{view.property_name || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    {view.acknowledged ? (
                                                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full w-fit ring-1 ring-emerald-500/20">
                                                            <CheckCircle2 size={14} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider">Enterado</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full w-fit ring-1 ring-amber-500/20">
                                                            <XCircle size={14} />
                                                            <span className="text-[10px] font-black uppercase tracking-wider">Pendiente</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <p className="text-xs font-black text-white/50 group-hover:text-white transition-colors mb-1">
                                                    {view.acknowledged_at ? format(new Date(view.acknowledged_at), 'HH:mm') : '--:--'}
                                                </p>
                                                <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest whitespace-nowrap">
                                                    {view.acknowledged_at ? format(new Date(view.acknowledged_at), 'd MMM yyyy', { locale: es }) : 'N/A'}
                                                </p>
                                            </td>
                                        </motion.tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30 grayscale scale-110">
                                                <ShieldCheck size={64} className="text-zinc-600" />
                                                <p className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500">Sin registros de lectura</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
