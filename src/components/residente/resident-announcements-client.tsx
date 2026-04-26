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
                <Link href="/dashboard">
                    <Button variant="ghost" className="text-zinc-500 hover:text-white p-0 gap-2 w-fit">
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
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="bg-zinc-900/30 backdrop-blur-md border border-white/5 p-8 md:p-10 rounded-[2.5rem] space-y-8 shadow-2xl hover:bg-zinc-900/50 transition-all group ring-1 ring-white/5"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-3">
                                            <Badge className={cn("px-3.5 py-1.5 rounded-xl border-0 shadow-sm uppercase text-[10px] font-bold tracking-widest", catClass)}>
                                                {cat}
                                            </Badge>
                                            {ann.priority === 'high' && (
                                                <Badge className="bg-rose-500/10 text-rose-400 border-0 text-[10px] font-bold uppercase tracking-widest">
                                                    Prioridad Máxima
                                                </Badge>
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
                                                className="block p-8 bg-zinc-950/40 border border-white/10 rounded-[2rem] hover:border-indigo-500/50 transition-all group/file relative overflow-hidden shadow-2xl ring-1 ring-white/5"
                                            >
                                                <div className="flex items-center gap-6">
                                                    <div className="h-16 w-16 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ring-1 ring-rose-500/20">
                                                        <File size={32} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xl font-bold text-white mb-1">Documento Adjunto (PDF)</p>
                                                        <p className="text-sm text-zinc-500 font-medium flex items-center gap-2">
                                                            Haga clic para ver el archivo completo <ArrowRight size={14} />
                                                        </p>
                                                    </div>
                                                </div>
                                            </a>
                                        )
                                    }

                                    return (
                                        <div className="relative w-full max-h-[600px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 z-10">
                                            <img 
                                                src={url} 
                                                alt={ann.title}
                                                className="w-full h-full object-contain hover:scale-[1.02] transition-transform duration-700 pointer-events-none"
                                                onError={(e) => {
                                                    (e.target as any).style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )
                                })()}

                                {(ann.location || ann.event_date) && (
                                    <div className="p-8 bg-zinc-950/40 rounded-[2rem] border border-white/5 grid grid-cols-1 md:grid-cols-2 gap-6 ring-1 ring-white/5">
                                       {ann.event_date && (
                                           <div className="flex items-center gap-4 text-sm text-zinc-300 font-bold">
                                               <div className="p-3 bg-indigo-500/10 rounded-2xl ring-1 ring-indigo-500/20">
                                                   <Calendar size={24} className="text-indigo-400" />
                                               </div>
                                               <div className="flex flex-col">
                                                   <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Fecha y Hora</span>
                                                   <span className="text-base">
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
                                           <div className="flex items-center gap-4 text-sm text-zinc-300 font-bold">
                                               <div className="p-3 bg-amber-500/10 rounded-2xl ring-1 ring-amber-500/20">
                                                   <MapPin size={24} className="text-amber-400" />
                                               </div>
                                               <div className="flex flex-col">
                                                   <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Ubicación</span>
                                                   <span className="text-base">{ann.location}</span>
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
