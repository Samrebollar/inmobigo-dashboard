'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/utils/supabase/client'
import { PremiumCard } from '@/components/ui/PremiumCard'
import {
    CheckCircle2, Bell, X, ShieldAlert, Zap, Radio, Eye, 
    ChevronRight, Activity, TrendingUp, Download, Maximize2,
    ChevronDown, ChevronUp, Users
} from 'lucide-react'



interface Incident {
    id: string
    title: string
    description: string
    priority: string
    status: string
    location: string
    guard: string
    condominium?: string
    created_at: string
    isNew?: boolean
    images?: string[]
}

const PRIORITY_THEMES: Record<string, { color: string, glow: string, label: string }> = {
    urgent: { color: 'text-rose-400', glow: 'rose', label: '🚨 Urgente' },
    high: { color: 'text-orange-400', glow: 'amber', label: '🟠 Alta' },
    medium: { color: 'text-amber-400', glow: 'amber', label: '🟡 Media' },
    low: { color: 'text-zinc-400', glow: 'zinc', label: '⚪ Baja' },
}



function parseIncident(t: any): Incident {
    const guardMatch = t.description?.match(/\[OFICIAL: (.*?)\]/)
    const locMatch = t.description?.match(/\[UBICACIÓN: (.*?)\]/)
    const cleanDesc = t.description?.replace(/\[OFICIAL: .*?\] \[UBICACIÓN: .*?\]\n\n/, '') || t.description
    return {
        id: t.id,
        title: t.title,
        description: cleanDesc,
        priority: t.priority || 'low',
        status: t.status,
        location: locMatch ? locMatch[1] : 'No especificada',
        guard: guardMatch ? guardMatch[1] : 'Oficial',
        condominium: t.condominiums?.name,
        created_at: t.created_at,
        isNew: false,
        images: t.images || [],
    }
}

export function ControlOperativoClient() {
    const [incidents, setIncidents] = useState<Incident[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedIncident, setExpandedIncident] = useState<string | null>(null)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [newIncidentToast, setNewIncidentToast] = useState<Incident | null>(null)
    const toastTimer = useRef<any>(null)

    useEffect(() => {
        const supabase = createClient()
        let channel: any = null

        const fetchData = async () => {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('organization_id')
                .eq('user_id', user.id)
                .maybeSingle()

            const oid = orgUser?.organization_id
            if (!oid) return

            // Initial Fetch
            const { data: incidentData } = await supabase
                .from('tickets')
                .select('*, condominiums(name)')
                .eq('organization_id', oid)
                .eq('category', 'security')
                .order('created_at', { ascending: false })
                .limit(20)

            setIncidents((incidentData || []).map(parseIncident))
            setLoading(false)

            // Realtime
            channel = supabase
                .channel(`ops-center-${oid}`)
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tickets',
                    filter: `organization_id=eq.${oid}`,
                }, (payload: any) => {
                    if (payload.new?.category !== 'security') return
                    const inc = { ...parseIncident(payload.new), isNew: true }
                    setIncidents(prev => [inc, ...prev])
                    setNewIncidentToast(inc)
                    if (toastTimer.current) clearTimeout(toastTimer.current)
                    toastTimer.current = setTimeout(() => setNewIncidentToast(null), 6000)
                    try { new Audio('/notification.mp3').play().catch(() => {}) } catch {}
                })
                .subscribe()
        }

        fetchData()
        return () => { if (channel) channel.unsubscribe() }
    }, [])



    const markSeen = (id: string) => setIncidents(prev => prev.map(i => i.id === id ? { ...i, isNew: false } : i))

    const downloadImage = (url: string) => {
        const link = document.createElement('a')
        link.href = url
        link.download = `evidencia-${Date.now()}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 p-8 space-y-8 font-sans">
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-2"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 shadow-xl shadow-indigo-500/5">
                            <Activity size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">Control Operativo</h1>
                            <div className="flex items-center gap-2">
                                <div className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </div>
                                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Monitoreo operativo en tiempo real</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <div className="flex items-center gap-4">
                    <div className="hidden lg:flex flex-col items-end mr-4">
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">Estado de Red</span>
                        <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Equipo operando</span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 px-1.5 py-4">
                <div className="flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-black bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <ShieldAlert size={18} />
                    <span className="uppercase tracking-widest">Panel de Incidencias</span>
                    {incidents.filter(i => i.isNew).length > 0 && (
                        <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping ml-1" />
                    )}
                </div>
            </div>

            {/* Main Content Area */}
                <motion.div 
                    key="incidents"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-8"
                >
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <PremiumCard glowColor="indigo" delay={0.1}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">Incidencias del día</p>
                                    <h3 className="text-4xl font-black text-white tracking-tighter">{incidents.length}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                                    <TrendingUp size={24} />
                                </div>
                            </div>
                        </PremiumCard>

                        <PremiumCard glowColor="rose" delay={0.2}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-[0.2em]">Requieren Atención</p>
                                    <h3 className="text-4xl font-black text-white tracking-tighter">{incidents.filter(i => i.status === 'open').length}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400">
                                    <Bell size={24} className="animate-bounce" />
                                </div>
                            </div>
                        </PremiumCard>

                        <PremiumCard glowColor="amber" delay={0.3}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Alertas Críticas</p>
                                    <h3 className="text-4xl font-black text-white tracking-tighter">{incidents.filter(i => i.priority === 'urgent').length}</h3>
                                </div>
                                <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
                                    <Zap size={24} />
                                </div>
                            </div>
                        </PremiumCard>
                    </div>

                    {/* List View */}
                    <div className="grid grid-cols-1 gap-4">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.3em]">Cifrando Datos...</p>
                            </div>
                        ) : (
                            incidents.map((inc, i) => {
                                const theme = PRIORITY_THEMES[inc.priority] || PRIORITY_THEMES.low
                                return (
                                    <PremiumCard 
                                        key={inc.id} 
                                        glowColor={theme.glow}
                                        delay={0.1 + i * 0.05}
                                        className={`transition-all duration-500 ${inc.isNew ? 'ring-2 ring-rose-500/50' : ''} ${expandedIncident === inc.id ? 'z-20 scale-[1.02]' : ''}`}
                                    >
                                        <div className="flex flex-col gap-6">
                                            <div 
                                                className="flex flex-col lg:flex-row gap-6 cursor-pointer"
                                                onClick={() => setExpandedIncident(expandedIncident === inc.id ? null : inc.id)}
                                            >
                                                <div className="flex-1 space-y-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${theme.color} border-current/20 bg-current/5`}>
                                                                {theme.label}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                                {new Date(inc.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                                                            </span>
                                                        </div>
                                                        {inc.isNew && (
                                                            <span className="px-2 py-0.5 bg-rose-500 text-[10px] font-black text-white rounded uppercase animate-pulse">Critical</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <h4 className="text-lg font-black text-white uppercase italic tracking-tight">{inc.title}</h4>
                                                        <p className="text-sm text-zinc-400 font-medium leading-relaxed max-w-3xl">{inc.description}</p>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-4 pt-2">
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                            <div className="p-1 rounded bg-indigo-500/20 text-indigo-400"><Users size={12}/></div>
                                                            <span className="text-[10px] font-black uppercase text-zinc-400">{inc.guard}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                            <div className="p-1 rounded bg-emerald-500/20 text-emerald-400"><Radio size={12}/></div>
                                                            <span className="text-[10px] font-black uppercase text-zinc-400">{inc.location}</span>
                                                        </div>
                                                        {inc.condominium && (
                                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                                                                <div className="p-1 rounded bg-amber-500/20 text-amber-400"><Users size={12}/></div>
                                                                <span className="text-[10px] font-black uppercase text-zinc-400">{inc.condominium}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Expandable Evidence Section */}
                                            <AnimatePresence>
                                                {expandedIncident === inc.id && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden border-t border-white/5 pt-6 space-y-6"
                                                    >
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <h5 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Evidencia Recolectada</h5>
                                                                <span className="text-[10px] font-bold text-zinc-600">{inc.images?.length || 0} Archivos</span>
                                                            </div>
                                                            
                                                            {inc.images && inc.images.length > 0 ? (
                                                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                                                    {inc.images.map((img, idx) => (
                                                                        <motion.div
                                                                            key={idx}
                                                                            whileHover={{ scale: 1.05, y: -5 }}
                                                                            onClick={() => setSelectedImage(img)}
                                                                            className="relative aspect-square group cursor-zoom-in"
                                                                        >
                                                                            <div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl z-10 flex items-center justify-center">
                                                                                <Maximize2 size={24} className="text-white" />
                                                                            </div>
                                                                            <img 
                                                                                src={img} 
                                                                                alt={`Evidencia ${idx + 1}`}
                                                                                className="w-full h-full object-cover rounded-2xl border border-white/10 shadow-2xl"
                                                                            />
                                                                        </motion.div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="py-10 bg-white/[0.02] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                                                                    <Eye size={20} className="text-zinc-700" />
                                                                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Sin Archivos Visuales</p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                                                            <div className="flex items-center gap-4">
                                                                <div className="text-center">
                                                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Status</p>
                                                                    <p className="text-[10px] font-black text-indigo-400 uppercase italic">{inc.status}</p>
                                                                </div>
                                                                <div className="w-px h-8 bg-white/10" />
                                                                <div className="text-center">
                                                                    <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">Guardia ID</p>
                                                                    <p className="text-[10px] font-black text-white uppercase">{inc.guard}</p>
                                                                </div>
                                                            </div>
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); markSeen(inc.id); }}
                                                                className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border border-emerald-500/20"
                                                            >
                                                                <CheckCircle2 size={14} />
                                                                Finalizar Revisión
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            <div 
                                                className="flex lg:flex-row items-center justify-between border-t border-white/[0.03] pt-4 cursor-pointer"
                                                onClick={() => setExpandedIncident(expandedIncident === inc.id ? null : inc.id)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{expandedIncident === inc.id ? 'Contraer Detalles' : 'Expandir Operación'}</span>
                                                    {expandedIncident === inc.id ? <ChevronUp size={14} className="text-zinc-600" /> : <ChevronDown size={14} className="text-zinc-600" />}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {inc.isNew && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); markSeen(inc.id); }}
                                                            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white border border-white/10 rounded-xl transition-all"
                                                        >
                                                            Visto
                                                        </button>
                                                    )}
                                                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                                                        <ChevronRight size={16} className={`transition-transform duration-300 ${expandedIncident === inc.id ? 'rotate-90' : ''}`} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </PremiumCard>
                                )
                            })
                        )}
                    </div>
                </motion.div>

            {/* Notification Toast */}
            <AnimatePresence>
                {newIncidentToast && (
                    <motion.div
                        initial={{ opacity: 0, x: 100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed bottom-10 right-10 z-50"
                    >
                        <PremiumCard glowColor="rose" className="w-[400px] !p-6 shadow-2xl shadow-rose-950/40 border-rose-500/30">
                            <div className="flex gap-4">
                                <div className="p-3 rounded-2xl bg-rose-500 text-white shadow-lg shadow-rose-500/20">
                                    <ShieldAlert size={24} />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest animate-pulse">Brecha de Seguridad</p>
                                        <button onClick={() => setNewIncidentToast(null)} className="text-zinc-600 hover:text-white transition-colors">
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <h4 className="text-lg font-black text-white uppercase italic tracking-tight">{newIncidentToast.title}</h4>
                                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{newIncidentToast.location}</p>
                                </div>
                            </div>
                        </PremiumCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Lightbox Viewer */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 md:p-20"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center gap-6"
                        >
                            <div className="absolute top-0 right-0 md:-top-10 md:-right-10 flex items-center gap-4">
                                <button 
                                    onClick={() => downloadImage(selectedImage)}
                                    className="p-3 bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-110 transition-transform flex items-center gap-2 px-6"
                                >
                                    <Download size={20} />
                                    <span className="font-black text-[10px] uppercase tracking-widest">Descargar</span>
                                </button>
                                <button 
                                    onClick={() => setSelectedImage(null)}
                                    className="p-3 bg-white/10 text-white rounded-2xl hover:bg-rose-500 transition-colors"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            
                            <div className="relative group overflow-hidden rounded-[32px] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                                <img 
                                    src={selectedImage} 
                                    alt="Vista ampliada"
                                    className="max-w-full max-h-[70vh] object-contain rounded-[32px]"
                                />
                            </div>

                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">Visor de Evidencia Gráfica</p>
                                <h6 className="text-xl font-black text-white italic tracking-tight uppercase">Control de Seguridad InmobiGo</h6>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    )
}
