'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
    DollarSign, 
    CheckCircle2, 
    Wrench, 
    Receipt, 
    ChevronRight,
    Bell,
    MessageSquare,
    Calendar,
    ArrowRight,
    CreditCard,
    Zap,
    TrendingUp,
    ShieldCheck,
    Home,
    MapPin,
    File
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { getAnnouncementsAction, acknowledgeAnnouncementAction } from '@/app/actions/announcement-actions'
import { toast } from 'sonner'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface ResidentDashboardClientProps {
    resident: any
    userName: string
}

export default function ResidentDashboardClient({ resident, userName }: ResidentDashboardClientProps) {
    const supabase = createClient()
    const [announcements, setAnnouncements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [acknowledgingIds, setAcknowledgingIds] = useState<Set<string>>(new Set())
    const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set())

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    useEffect(() => {
        let isMounted = true;
        
        async function fetchAnnouncements() {
            const orgId = resident?.organization_id || resident?.condominiums?.organization_id;
            console.log("🔍 [Resident Dashboard] BUSCANDO AVISOS PARA ORG:", orgId);
            
            if (!orgId) {
                console.warn("⚠️ [Resident Dashboard] No se encontró organization_id para el residente");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const result = await getAnnouncementsAction(orgId);

                if (isMounted) {
                    if (result.success) {
                        setAnnouncements(result.data || []);
                    } else {
                        console.error('❌ [Resident Dashboard] Error fetching announcements:', result.error);
                    }
                }
            } catch (err) {
                console.error('❌ [Resident Dashboard] Exception fetching announcements:', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        fetchAnnouncements();

        return () => {
            isMounted = false;
        };
    }, [resident?.organization_id, resident?.condominiums?.organization_id, supabase]);

    const handleAcknowledge = async (ann: any) => {
        if (confirmedIds.has(ann.id) || acknowledgingIds.has(ann.id)) return;

        // PRIORIDAD: resident.user_id es el UUID de auth.users que espera la FK
        const userId = resident?.user_id || resident?.id;
        
        if (!userId) {
            toast.error("No se pudo identificar tu usuario. Por favor, reintenta.");
            return;
        }

        try {
            setAcknowledgingIds(prev => new Set(prev).add(ann.id));
            
            // 🔍 EXTRACCIÓN EXHAUSTIVA DE UNIDAD
            // Probamos todas las rutas posibles que Supabase/Next.js podrían usar
            const unitsObj = resident?.units || (resident as any)?.unit;
            const unitValue = resident?.unit_number || 
                              resident?.unit_name || 
                              (Array.isArray(unitsObj) ? unitsObj[0]?.unit_number : unitsObj?.unit_number) || 
                              (Array.isArray(unitsObj) ? unitsObj[0]?.name : unitsObj?.name) ||
                              'N/A';

            // 🔍 EXTRACCIÓN EXHAUSTIVA DE PROPIEDAD
            const condosObj = resident?.condominiums || (resident as any)?.condominium;
            const propertyValue = resident?.property_name || 
                                  (Array.isArray(condosObj) ? condosObj[0]?.name : condosObj?.name) || 
                                  'N/A';

            const result = await acknowledgeAnnouncementAction({
                announcement_id: ann.id,
                user_id: userId,
                announcement_title: ann.title,
                resident_name: userName || 'Residente',
                unit_name: unitValue,
                property_name: propertyValue
            });

            if (result.success) {
                setConfirmedIds(prev => new Set(prev).add(ann.id));
                toast.success("¡Gracias! Tu lectura ha sido confirmada.", {
                    style: { background: '#064e3b', color: '#fff', border: '1px solid #059669' }
                });
            } else {
                toast.error("Error al confirmar: " + result.error);
            }
        } catch (err) {
            console.error("Error acknowledging announcement:", err);
            toast.error("Error inesperado al confirmar.");
        } finally {
            setAcknowledgingIds(prev => {
                const next = new Set(prev);
                next.delete(ann.id);
                return next;
            });
        }
    };

    // El monitor de paquetería en tiempo real se ha movido a ServiciosClient
    // para centralizar la lógica en el módulo correspondiente.

    const stats = [
        {
            label: 'Saldo Pendiente',
            value: `$${(resident?.debt_amount || 2500).toLocaleString()}`,
            subtext: 'Vence: 5 Abr',
            icon: CreditCard,
            color: 'rose',
            accent: 'rose-500'
        },
        {
            label: 'Último Pago',
            value: `$${(resident?.last_payment_amount || 2500).toLocaleString()}`,
            subtext: '3 Mar',
            icon: CheckCircle2,
            color: 'emerald',
            accent: 'emerald-500'
        },
        {
            label: 'Incidencias',
            value: resident?.active_tickets_count || '1',
            subtext: 'Activo',
            icon: Wrench,
            color: 'amber',
            accent: 'amber-500'
        },
        {
            label: 'Historial',
            value: resident?.paid_installments_count || '12',
            subtext: 'Este año',
            icon: Receipt,
            color: 'indigo',
            accent: 'indigo-500'
        }
    ]

    const containers = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="relative min-h-screen p-4 md:p-6 overflow-hidden bg-zinc-950 font-sans">
            {/* Ambient Background Elements */}
            <div className="absolute top-0 left-1/4 w-[300px] h-[300px] bg-indigo-600/5 rounded-full blur-[100px] -z-10" />
            
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-1"
                    >
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-bold px-2 py-0.5 rounded-full uppercase tracking-widest text-[9px]">
                                Mi Propiedad
                            </Badge>
                            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                            Hola, <span className="text-zinc-400">{userName}</span>
                        </h1>
                        <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
                             <Home className="h-4 w-4 text-indigo-500/30" />
                            {resident?.units?.unit_number || 'A-101'} <span className="text-zinc-800">•</span> {resident?.condominiums?.name || 'Torre Reforma'}
                        </p>
                    </motion.div>

                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900/40 backdrop-blur-md border border-white/5 px-5 py-3 rounded-2xl flex items-center gap-4 shadow-xl ring-1 ring-white/5"
                    >
                        <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Próximo vencimiento</p>
                            <p className="text-xl font-bold text-white tracking-tight">5 Días</p>
                        </div>
                        <div className="h-8 w-8 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                            <Zap className="h-4 w-4 text-indigo-400 fill-indigo-400/20" />
                        </div>
                    </motion.div>
                </header>

                {/* Dynamic Payment Status Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                        "w-full p-6 rounded-2xl border backdrop-blur-md shadow-xl ring-1 ring-white/5 flex flex-col md:flex-row items-center justify-between gap-4",
                        (resident?.debt_amount > 0 || !resident?.debt_amount) 
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400" 
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    )}
                >
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-12 w-12 rounded-full flex items-center justify-center shadow-lg",
                            (resident?.debt_amount > 0 || !resident?.debt_amount) ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                        )}>
                            {(resident?.debt_amount > 0 || !resident?.debt_amount) ? <Bell className="h-6 w-6" /> : <ShieldCheck className="h-6 w-6" />}
                        </div>
                        <div className="space-y-0.5 text-center md:text-left">
                            <h2 className="text-xl font-bold tracking-tight text-white">
                                {(resident?.debt_amount > 0 || !resident?.debt_amount) 
                                    ? "Debes ponerte al corriente con tus pagos" 
                                    : "¡Estás al día con tus pagos!"}
                            </h2>
                            <p className="text-sm font-medium opacity-80">
                                {(resident?.debt_amount > 0 || !resident?.debt_amount)
                                    ? "Tu último pago fue hace 20 días"
                                    : "Gracias por tu puntualidad y compromiso."}
                            </p>
                        </div>
                    </div>
                    {resident?.debt_amount > 0 && (
                         <Button variant="outline" className="bg-white/5 border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all rounded-xl font-bold text-xs uppercase tracking-widest px-6 h-10">
                            Revisar Detalles
                         </Button>
                    )}
                </motion.div>

                {/* Grid Stats */}
                <motion.div 
                    variants={containers}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                    {stats.map((stat, i) => (
                        <motion.div
                            key={i}
                            variants={item}
                            whileHover={{ y: -4 }}
                            className="group relative"
                        >
                            <div className="h-full bg-zinc-900/40 backdrop-blur-md border border-white/5 p-5 rounded-2xl transition-all duration-300 hover:bg-zinc-900/60 ring-1 ring-white/5 shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={cn(
                                        "h-10 w-10 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                                        stat.color === 'rose' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                        stat.color === 'emerald' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                        stat.color === 'amber' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                                        "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                                    )}>
                                        <stat.icon size={20} />
                                    </div>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</p>
                                </div>
                                <div className="space-y-0.5">
                                    <h3 className="text-2xl font-bold text-white tracking-tight">{stat.value}</h3>
                                    <p className={cn(
                                        "text-[10px] font-bold uppercase tracking-wide opacity-80",
                                        stat.color === 'rose' ? 'text-rose-400' : 
                                        stat.color === 'emerald' ? 'text-emerald-400' : 
                                        stat.color === 'amber' ? 'text-amber-400' : 'text-indigo-400'
                                    )}>
                                        {stat.subtext}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Main Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Activity Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Action Card */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 ring-1 ring-white/5"
                        >
                            <div className="space-y-2 text-center md:text-left">
                                <div className="flex items-center gap-2 justify-center md:justify-start">
                                    <ShieldCheck className="h-4 w-4 text-indigo-400" />
                                    <span className="text-[9px] font-bold uppercase text-indigo-400 tracking-widest">Servicios Seguros</span>
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Realiza tus pagos en segundos</h2>
                                <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">Administra las cuotas de tu propiedad de forma rápida y confiable.</p>
                            </div>
                            
                            <Button className="h-14 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 border border-white/10 font-bold tracking-wide transition-all active:scale-95">
                                <DollarSign className="h-5 w-5 mr-2" />
                                PAGAR AHORA
                            </Button>
                        </motion.div>

                        {/* Recent Activity */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                                    <TrendingUp size={18} className="text-indigo-500" />
                                    Actividad Reciente
                                </h2>
                                <Button variant="ghost" size="sm" className="text-indigo-400 text-xs font-bold hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg">
                                    Ver historial
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { title: 'Pago Verificado', desc: 'Cuota de Abril confirmada', date: 'Hoy', icon: CheckCircle2, color: 'emerald' },
                                    { title: 'Incidencia Reportada', desc: 'Fuga en el área común', date: 'Ayer', icon: MessageSquare, color: 'amber' },
                                    { title: 'Aviso Importante', desc: 'Mantenimiento preventivo', date: '24 Mar', icon: Bell, color: 'indigo' }
                                ].map((act, i) => (
                                    <div 
                                        key={i}
                                        className="bg-zinc-900/20 border border-white/5 p-4 rounded-xl flex items-center justify-between group hover:bg-zinc-900/40 transition-all border-l-2"
                                        style={{ borderLeftColor: `var(--${act.color}-500)` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-lg flex items-center justify-center shadow-sm",
                                                act.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-400' :
                                                act.color === 'amber' ? 'bg-amber-500/10 text-amber-400' :
                                                'bg-indigo-500/10 text-indigo-400'
                                            )}>
                                                <act.icon size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm">{act.title}</h4>
                                                <p className="text-xs text-zinc-500">{act.desc}</p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-zinc-600">{act.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Alerts Card - Now Main Focus */}
                        <div className="bg-zinc-900/40 backdrop-blur-md border border-white/5 p-6 rounded-3xl space-y-6 ring-1 ring-white/5 shadow-2xl relative overflow-hidden h-full flex flex-col">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full" />
                            
                            <div className="flex items-center justify-between px-1">
                                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                        <Bell size={20} className="text-amber-500" />
                                    </div>
                                    Avisos
                                </h2>
                                {announcements.length > 0 && (
                                    <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-400 text-[10px] border-none font-bold py-1 px-2 uppercase tracking-tight">Reciente</Badge>
                                )}
                            </div>

                            <div className="flex-grow space-y-5">
                                {loading ? (
                                    <div className="space-y-4">
                                        {[1, 2].map((i) => (
                                            <div key={i} className="animate-pulse space-y-3">
                                                <div className="h-4 bg-white/5 rounded w-1/4" />
                                                <div className="h-6 bg-white/5 rounded w-3/4" />
                                                <div className="h-4 bg-white/5 rounded w-full" />
                                            </div>
                                        ))}
                                    </div>
                                ) : announcements.length > 0 ? (
                                    announcements.slice(0, 2).map((ann, idx) => {
                                        const lowerType = (ann.type || '').toLowerCase();
                                        let cat = ann.type || '📢 Informativo';
                                        let catClass = "bg-indigo-500/20 text-indigo-400";
                                        
                                        // Matching admin's category logic
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
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className={cn(
                                                    "space-y-4",
                                                    idx < Math.min(announcements.length, 2) - 1 && "pb-6 border-b border-white/5"
                                                )}
                                            >
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-2">
                                                            <Badge className={cn("px-2.5 py-1 rounded-lg border-0 shadow-sm uppercase text-[9px] font-bold tracking-wider", catClass)}>
                                                                {cat}
                                                            </Badge>
                                                            {ann.priority === 'high' && (
                                                                <Badge className="bg-rose-500/10 text-rose-400 border-0 text-[10px] font-bold uppercase tracking-wider">
                                                                    Alta Prioridad
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span suppressHydrationWarning className="text-[10px] text-zinc-500 font-bold uppercase">
                                                            {dateStr}
                                                        </span>
                                                    </div>
                                                    <h3 className="text-xl font-extrabold text-white leading-tight">
                                                        {ann.title}
                                                    </h3>
                                                </div>
                                                
                                                <p className={cn(
                                                    "text-zinc-400 text-sm leading-relaxed font-medium transition-all duration-500",
                                                    !expandedIds.has(ann.id) && "line-clamp-3"
                                                )}>
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
                                                                className="block p-4 bg-zinc-900/50 border border-white/10 rounded-2xl hover:border-indigo-500/50 transition-all group/file relative overflow-hidden"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-10 w-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center shrink-0">
                                                                        <File size={20} />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-white truncate">Documento (PDF)</p>
                                                                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Toca para abrir</p>
                                                                    </div>
                                                                </div>
                                                            </a>
                                                        )
                                                    }

                                                    return (
                                                        <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 z-10">
                                                            <img 
                                                                src={url} 
                                                                alt={ann.title}
                                                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-700 pointer-events-none"
                                                                onError={(e) => {
                                                                    (e.target as any).style.display = 'none';
                                                                }}
                                                            />
                                                        </div>
                                                    )
                                                })()}

                                                {(ann.location || ann.event_date) && (
                                                    <div className="p-3 bg-zinc-800/30 rounded-2xl border border-white/5 space-y-2">
                                                       {ann.event_date && (
                                                           <div className="flex items-center gap-2 text-[10px] text-zinc-300 font-bold">
                                                               <Calendar size={12} className="text-indigo-400" />
                                                               {(() => {
                                                                   try {
                                                                       return format(new Date(ann.event_date), 'd MMM, yyyy', { locale: es });
                                                                   } catch {
                                                                       return ann.event_date;
                                                                   }
                                                               })()} {ann.start_time && `• ${ann.start_time}`}
                                                           </div>
                                                       )}
                                                       {ann.location && (
                                                           <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                                                               <MapPin size={12} className="text-amber-400" />
                                                               {ann.location}
                                                           </div>
                                                       )}
                                                    </div>
                                                )}

                                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                                    <motion.button 
                                                        whileHover={{ x: 5 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => toggleExpand(ann.id)}
                                                        className={cn(
                                                            "flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] transition-all",
                                                            expandedIds.has(ann.id) ? "text-indigo-400" : "text-zinc-500 hover:text-white"
                                                        )}
                                                    >
                                                        {expandedIds.has(ann.id) ? 'Ver menos' : 'Leer más'} 
                                                        <ArrowRight size={14} className={cn("transition-transform duration-300", expandedIds.has(ann.id) && "rotate-90")} />
                                                    </motion.button>
                                                    
                                                    <motion.button 
                                                        whileHover={!(confirmedIds.has(ann.id) || acknowledgingIds.has(ann.id)) ? { scale: 1.05, backgroundColor: '#2563eb' } : {}}
                                                        whileTap={!(confirmedIds.has(ann.id) || acknowledgingIds.has(ann.id)) ? { scale: 0.95 } : {}}
                                                        onClick={() => handleAcknowledge(ann)}
                                                        disabled={confirmedIds.has(ann.id) || acknowledgingIds.has(ann.id)}
                                                        className={cn(
                                                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2",
                                                            confirmedIds.has(ann.id) 
                                                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default" 
                                                                : "bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30",
                                                            acknowledgingIds.has(ann.id) && "opacity-50 cursor-wait"
                                                        )}
                                                    >
                                                        {acknowledgingIds.has(ann.id) ? (
                                                            <motion.div 
                                                                animate={{ rotate: 360 }} 
                                                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                                                className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
                                                            />
                                                        ) : confirmedIds.has(ann.id) ? (
                                                            <CheckCircle2 size={12} />
                                                        ) : null}
                                                        {confirmedIds.has(ann.id) ? 'Confirmado' : acknowledgingIds.has(ann.id) ? 'Enviando...' : 'Enterado'}
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                ) : (
                                    <div className="h-40 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                                        <Bell size={40} className="text-zinc-600" />
                                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest italic">Sin avisos activos</p>
                                    </div>
                                )}
                            </div>

                                <Link href="/dashboard/avisos" className="w-full">
                                    <Button 
                                        variant="ghost" 
                                        className="w-full text-zinc-500 hover:text-white hover:bg-white/5 transition-all py-6 group rounded-2xl border border-dashed border-white/5 mt-4"
                                    >
                                        <span className="flex items-center gap-2 text-xs font-bold">
                                            Ver historial completo
                                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </span>
                                    </Button>
                                </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
