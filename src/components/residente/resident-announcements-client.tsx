'use client'

import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { Bell, Calendar, MapPin, ArrowLeft, File, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ResidentAnnouncementsClientProps {
    initialAnnouncements: any[]
}

export function ResidentAnnouncementsClient({ initialAnnouncements }: ResidentAnnouncementsClientProps) {
    return (
        <div className="min-h-screen bg-zinc-950 p-4 md:p-8 space-y-12 max-w-4xl mx-auto font-sans">
            <header className="flex flex-col space-y-6">
                <Link href="/residente">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white transition-all p-0 gap-2 w-fit hover:bg-transparent">
                        <ArrowLeft size={16} /> Volver al Tablero
                    </Button>
                </Link>
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-amber-500/10 rounded-3xl ring-1 ring-amber-500/20 shadow-2xl shadow-amber-500/5">
                        <Bell className="text-amber-500" size={32} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold text-white tracking-tight">
                            Avisos y Comunicados
                        </h1>
                        <p className="text-zinc-500 font-medium">Mantente al tanto de lo que sucede en tu comunidad</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-8 pb-20">
                {initialAnnouncements.length > 0 ? (
                    initialAnnouncements.map((ann, idx) => {
                        const lowerType = (ann.type || '').toLowerCase();
                        let cat = ann.type || '📢 Informativo';
                        let catClass = "bg-indigo-500/20 text-indigo-400";
                        
                        if (lowerType.includes('mantenimiento')) {
                            cat = '🚧 ' + (ann.type || 'Mantenimiento');
                            catClass = "bg-amber-500/20 text-amber-500";
                        } else if (lowerType.includes('urgente')) {
                            cat = '⚠️ ' + (ann.type || 'Urgente');
                            catClass = "bg-rose-500/20 text-rose-400";
                        } else if (lowerType.includes('evento')) {
                            cat = '🎉 ' + (ann.type || 'Evento');
                            catClass = "bg-emerald-500/20 text-emerald-400";
                        } else if (!cat.includes('📢') && !cat.includes('📌')) {
                            cat = '📌 ' + cat;
                        }

                        const dateStr = ann.created_at ? formatDistanceToNow(new Date(ann.created_at.toString().includes('Z') || ann.created_at.toString().includes('+') ? ann.created_at : `${ann.created_at}Z`), { addSuffix: true, locale: es }) : 'Recién publicado';

                        return (
                            <motion.div 
                                key={ann.id}
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 80, delay: idx * 0.05 }}
                                className="saas-card-glow bg-gradient-to-b from-zinc-900/40 to-zinc-950/20 backdrop-blur-xl border border-white/5 p-8 md:p-10 rounded-[2rem] space-y-8 shadow-2xl hover:border-indigo-500/25 transition-all duration-500 group ring-1 ring-white/5 relative overflow-hidden"
                            >
                                {/* Background ambient gradient per card priority / type */}
                                {ann.priority === 'high' ? (
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/[0.02] blur-[80px] rounded-full pointer-events-none" />
                                ) : lowerType.includes('mantenimiento') ? (
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/[0.02] blur-[80px] rounded-full pointer-events-none" />
                                ) : lowerType.includes('evento') ? (
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/[0.02] blur-[80px] rounded-full pointer-events-none" />
                                ) : (
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/[0.02] blur-[80px] rounded-full pointer-events-none" />
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 border border-white/5", catClass)}>
                                                <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", 
                                                    lowerType.includes('mantenimiento') ? 'bg-amber-500' : 
                                                    lowerType.includes('urgente') ? 'bg-rose-455' : 
                                                    lowerType.includes('evento') ? 'bg-emerald-500' : 'bg-indigo-400'
                                                )} />
                                                {cat}
                                            </span>
                                            {ann.priority === 'high' && (
                                                <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
                                                    Prioridad Máxima
                                                </span>
                                            )}
                                        </div>
                                        <span suppressHydrationWarning className="text-[11px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                                            {dateStr}
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-extrabold text-white leading-tight group-hover:text-indigo-400 transition-colors">
                                        {ann.title}
                                    </h2>
                                </div>
                                
                                <p className="text-zinc-300 text-lg leading-relaxed font-medium">
                                    {ann.message || ann.description}
                                </p>

                                {(ann.image_url || (ann as any).imageUrl) && (() => {
                                    const url = ann.image_url || (ann as any).imageUrl;
                                    const isPdf = url && url.toLowerCase().includes('.pdf');

                                    if (isPdf) {
                                        return (
                                            <a 
                                                href={url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="block p-6 bg-zinc-950/50 border border-white/5 rounded-2xl hover:border-rose-500/30 transition-all duration-300 group/file relative overflow-hidden shadow-inner ring-1 ring-white/5"
                                            >
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/[0.01] blur-2xl rounded-full pointer-events-none" />
                                                <div className="flex items-center justify-between gap-6">
                                                    <div className="flex items-center gap-4 min-w-0">
                                                        <div className="h-12 w-12 bg-rose-500/10 text-rose-450 rounded-xl flex items-center justify-center shrink-0 ring-1 ring-rose-500/25 group-hover/file:scale-105 transition-transform duration-300">
                                                            <File size={24} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-base font-black text-white leading-tight">Documento Adjunto (PDF)</p>
                                                            <p className="text-xs text-zinc-500 font-semibold truncate mt-0.5">Haga clic para ver o descargar el archivo</p>
                                                        </div>
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500 group-hover/file:text-rose-450 group-hover/file:border-rose-500/30 group-hover/file:translate-x-0.5 transition-all duration-300 shrink-0">
                                                        <ArrowRight size={14} />
                                                    </div>
                                                </div>
                                            </a>
                                        )
                                    }

                                    return (
                                        <div className="relative w-full max-h-[600px] rounded-2xl overflow-hidden border border-white/5 shadow-2xl bg-zinc-950/40 z-10 group/img">
                                            <img 
                                                src={url} 
                                                alt={ann.title}
                                                className="w-full h-full object-contain group-hover/img:scale-[1.01] transition-transform duration-[1000ms] pointer-events-none"
                                                onError={(e) => {
                                                    (e.target as any).style.display = 'none';
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent pointer-events-none" />
                                        </div>
                                    )
                                })()}

                                {(ann.location || ann.event_date) && (
                                    <div className="p-5 bg-zinc-950/30 rounded-2xl border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 ring-1 ring-white/5 shadow-inner">
                                       {ann.event_date && (
                                           <div className="flex items-center gap-3.5 text-xs text-zinc-300 font-bold">
                                               <div className="p-2.5 bg-indigo-500/10 rounded-xl ring-1 ring-indigo-500/20">
                                                   <Calendar size={18} className="text-indigo-400" />
                                               </div>
                                               <div className="flex flex-col">
                                                   <span className="text-[9px] text-zinc-550 uppercase tracking-wider mb-0.5">Fecha y Hora</span>
                                                   <span className="text-sm font-black text-white">
                                                       {(() => {
                                                           try {
                                                               return format(new Date(ann.event_date), 'd MMM, yyyy', { locale: es });
                                                           } catch {
                                                               return ann.event_date;
                                                           }
                                                       })()} {ann.start_time && `• ${ann.start_time}`}
                                                   </span>
                                               </div>
                                           </div>
                                       )}
                                       {ann.location && (
                                           <div className="flex items-center gap-3.5 text-xs text-zinc-300 font-bold">
                                               <div className="p-2.5 bg-amber-500/10 rounded-xl ring-1 ring-amber-500/20">
                                                   <MapPin size={18} className="text-amber-400" />
                                               </div>
                                               <div className="flex flex-col">
                                                   <span className="text-[9px] text-zinc-550 uppercase tracking-wider mb-0.5">Ubicación</span>
                                                   <span className="text-sm font-black text-white">{ann.location}</span>
                                               </div>
                                           </div>
                                       )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                        <div className="p-8 bg-zinc-900 rounded-full">
                            <Bell size={64} className="text-zinc-600" />
                        </div>
                        <p className="text-xl font-bold text-zinc-500 uppercase tracking-widest italic">No hay avisos registrados</p>
                    </div>
                )}
            </div>
        </div>
    );
}
