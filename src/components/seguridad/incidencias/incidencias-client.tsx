'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity,
  ShieldAlert,
  Volume2,
  LifeBuoy,
  PhoneCall,
  Video,
  Camera,
  MapPin,
  X,
  Send,
  Zap,
  Building,
  Trash2,
  Loader2
} from 'lucide-react'
import { DashboardHeader } from '@/components/seguridad/DashboardHeader'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/utils/supabase/client'
import { 
  createSecurityIncidentAction, 
  getSecurityIncidentsAction, 
  deleteSecurityIncidentAction 
} from '@/app/actions/security-incident-actions'
import { toast } from 'sonner'

interface IncidenciasClientProps {
  userEmail?: string
  userName?: string
  condoName?: string
  organizationId?: string
  availableCondos?: any[]
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .018 5.396.015 12.03c0 2.12.54 4.19 1.563 6.04L0 24l6.15-1.612a11.77 11.77 0 005.9 1.532h.005c6.634 0 12.032-5.396 12.035-12.03a11.85 11.85 0 00-3.527-8.508z"/>
  </svg>
)

export default function IncidenciasClient({
  userEmail,
  userName,
  condoName,
  organizationId,
  availableCondos
}: IncidenciasClientProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedCondoId, setSelectedCondoId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalType, setModalType] = useState('Seguridad')
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null)
  const [fullScreenMedia, setFullScreenMedia] = useState<{url: string, type: 'photo' | 'video'} | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClient()
  const [formData, setFormData] = useState<{
    priority: string;
    location: string;
    description: string;
    condoId: string;
    photos: File[];
    videos: File[];
  }>({ priority: 'Baja', location: '', description: '', condoId: '', photos: [], videos: [] })

  const [timeline, setTimeline] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    if (organizationId) {
      fetchIncidents()
    }
  }, [organizationId, selectedCondoId])

  const fetchIncidents = async () => {
    setLoading(true)
    try {
      const result = await getSecurityIncidentsAction(organizationId || '', selectedCondoId || undefined)
      if (result.success && result.data) {
        // Resolve condo names for each incident
        const enrichedData = result.data.map(incident => {
          const condo = availableCondos?.find(c => c.id === incident.condoId)
          return {
            ...incident,
            condoName: condo ? condo.name : 'General'
          }
        })
        setTimeline(enrichedData)
      }
    } catch (error) {
      console.error('Error fetching incidents:', error)
      toast.error('Error al cargar las incidencias.')
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    { id: 'seguridad', label: 'Reportar Incidencia', icon: AlertTriangle, color: 'bg-rose-600', hover: 'hover:bg-rose-500', shadow: 'hover:shadow-[0_0_20px_rgba(225,29,72,0.4)]' },
    { id: 'sospechoso', label: 'Acceso Sospechoso', icon: ShieldAlert, color: 'bg-amber-600', hover: 'hover:bg-amber-500', shadow: 'hover:shadow-[0_0_20px_rgba(217,119,6,0.4)]' },
    { id: 'ruido', label: 'Ruido Excesivo', icon: Volume2, color: 'bg-orange-600', hover: 'hover:bg-orange-500', shadow: 'hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]' },
    { id: 'emergencia', label: 'Emergencia Médica', icon: LifeBuoy, color: 'bg-blue-600', hover: 'hover:bg-blue-500', shadow: 'hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]' },
    { id: 'porton', label: 'Falla en Portón', icon: MapPin, color: 'bg-zinc-700', hover: 'hover:bg-zinc-600', shadow: 'hover:shadow-[0_0_20px_rgba(82,82,91,0.4)]' },
  ]

  const handleSubmit = async () => {
    if (!formData.description || !organizationId) return
    
    setIsSubmitting(true)
    try {
      const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
        Urgente: 'urgent',
        Alta: 'high',
        Media: 'medium',
        Baja: 'low'
      }

      // 1. Upload files to Supabase Storage
      const uploadedUrls: string[] = []
      const allFiles = [...formData.photos, ...formData.videos]

      for (const file of allFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${organizationId}-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `security/${fileName}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('accounting_receipts')
          .upload(filePath, file, { cacheControl: '3600', upsert: false })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('accounting_receipts')
          .getPublicUrl(filePath)
        
        uploadedUrls.push(publicUrl)
      }

      // 2. Save to database
      const result = await createSecurityIncidentAction({
        organization_id: organizationId,
        condominium_id: formData.condoId || selectedCondoId || (availableCondos?.[0]?.id || ''),
        title: modalType,
        description: formData.description,
        priority: priorityMap[formData.priority] || 'low',
        location: formData.location || 'No especificada',
        guard_name: userName || 'En turno',
        images: uploadedUrls
      })

      if (result.success) {
        toast.success('Incidencia reportada con éxito.')
        fetchIncidents() // Refresh list
        setIsModalOpen(false)
        setFormData({ priority: 'Baja', location: '', description: '', condoId: '', photos: [], videos: [] })
      } else {
        toast.error(result.error || 'Error al guardar reporte.')
      }
    } catch (error) {
      console.error('Error submitting incident:', error)
      toast.error('Error crítico al procesar el reporte.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteIncident = async (id: string | number) => {
    try {
      const result = await deleteSecurityIncidentAction(id.toString())
      if (result.success) {
        toast.success('Registro eliminado.')
        setTimeline(prev => prev.filter(t => t.id !== id))
        if (selectedIncident?.id === id) {
          setSelectedIncident(null)
        }
      } else {
        toast.error('Error al eliminar.')
      }
    } catch (error) {
      console.error('Error deleting incident:', error)
      toast.error('Error al intentar eliminar.')
    }
  }

  const selectedCondoName = availableCondos?.find(c => c.id === selectedCondoId)?.name
  const filteredTimeline = selectedCondoId 
    ? timeline.filter(event => event.condoId === selectedCondoId || event.condoName === selectedCondoName)
    : timeline

  const urgentes = filteredTimeline.filter(t => t.priority === 'Urgente' || t.priority === 'Alta').length;
  const enRevision = filteredTimeline.filter(t => t.status === 'En revisión').length;
  const resueltas = filteredTimeline.filter(t => t.status === 'Cerrado' || t.status === 'Atendido').length;

  const kpis = [
    { label: 'Incidencias Hoy', value: filteredTimeline.length.toString().padStart(2, '0'), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Urgentes', value: urgentes.toString().padStart(2, '0'), icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'En Revisión', value: enRevision.toString().padStart(2, '0'), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Resueltas', value: resueltas.toString().padStart(2, '0'), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  ]

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }

  if (!mounted) return null

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8 bg-black min-h-screen relative pb-24">
      {/* 1. Header Modular */}
      <DashboardHeader
        userEmail={userEmail}
        userName={userName}
        condoName={condoName}
        availableCondos={availableCondos}
        selectedCondo={selectedCondoId}
        onCondoChange={setSelectedCondoId}
      />

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
        
        {/* Título de Sección */}
        <motion.div variants={item} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-rose-500" />
                    Centro de Incidencias
                </h2>
                <p className="text-zinc-500 mt-1">Monitoreo y reporte operativo en tiempo real.</p>
            </div>
            
            {/* Alerta Automática Banner */}
            <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 px-4 py-2 rounded-full">
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500"></span>
                </span>
                <p className="text-xs text-indigo-400 font-medium">Las incidencias urgentes notifican automáticamente al administrador.</p>
                <div className="flex gap-1">
                    <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-md font-bold">PUSH</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-bold">WAPP</span>
                </div>
            </div>
        </motion.div>

        {/* 2. KPIs Superiores */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => (
            <motion.div key={idx} variants={item} whileHover={{ y: -5 }}>
              <Card className="bg-zinc-950/50 backdrop-blur border-zinc-900 transition-all duration-300 h-32 flex flex-col justify-between overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardContent className="p-6 flex flex-col justify-between h-full z-10">
                  <div className="flex items-center justify-between">
                    <div className={cn("p-2 rounded-lg", kpi.bg)}>
                      <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                    </div>
                    <p className="text-3xl font-bold text-white tracking-tight tabular-nums">{kpi.value}</p>
                  </div>
                  <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 3. Botones Rápidos Operativos */}
        <motion.div variants={item}>
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Acciones Rápidas</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {quickActions.map((action, idx) => (
                <motion.button
                key={idx}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                    setModalType(action.label)
                    setIsModalOpen(true)
                }}
                className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-2xl transition-all gap-4 text-white group relative overflow-hidden",
                    action.color, action.hover, action.shadow
                )}
                >
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <action.icon className="h-8 w-8 transition-transform group-hover:scale-110 relative z-10" />
                <span className="text-xs font-bold text-center leading-tight relative z-10">{action.label}</span>
                </motion.button>
            ))}
            </div>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8">
            {/* 5. Timeline en Tiempo Real */}
            <motion.div variants={item} className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-500" />
                        Actividad Reciente
                    </h3>
                    <span className="text-xs text-zinc-500 font-medium">Últimas 24 horas</span>
                </div>
                
                <div className="space-y-4">
                    {loading ? (
                        <div className="p-20 text-center bg-zinc-950/50 border border-zinc-900 rounded-3xl flex flex-col items-center gap-4">
                            <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                            <p className="text-sm font-medium text-zinc-500 tracking-wide uppercase">Cargando incidencias reales...</p>
                        </div>
                    ) : filteredTimeline.length === 0 ? (
                        <div className="p-12 text-center bg-zinc-950 border border-zinc-900 rounded-3xl flex flex-col items-center gap-4">
                            <div className="bg-zinc-900/50 p-4 rounded-full">
                                <Activity className="h-8 w-8 text-zinc-700" />
                            </div>
                            <div>
                                <p className="text-base font-bold text-zinc-400">Sin actividad registrada</p>
                                <p className="text-sm text-zinc-600 mt-1">Los reportes que generes aparecerán aquí permanentemente.</p>
                            </div>
                        </div>
                    ) : (
                        filteredTimeline.map((event) => (
                            <motion.div 
                            key={event.id}
                            whileHover={{ x: 5 }}
                            onClick={() => setSelectedIncident(event)}
                            className={cn(
                                "group p-5 rounded-2xl bg-zinc-950 border transition-all flex gap-4 cursor-pointer",
                                selectedIncident?.id === event.id ? "border-indigo-500/50 bg-indigo-500/5 shadow-lg shadow-indigo-500/5" : "border-zinc-900 hover:border-zinc-800"
                            )}
                        >
                            <div className="flex flex-col items-center gap-2 pt-1">
                                <div className={cn(
                                    "h-3 w-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                                    event.color === 'rose' ? 'bg-rose-500 shadow-rose-500/50' :
                                    event.color === 'amber' ? 'bg-amber-500 shadow-amber-500/50' :
                                    event.color === 'blue' ? 'bg-blue-500 shadow-blue-500/50' : 'bg-zinc-500'
                                )} />
                                <div className="w-px h-full bg-zinc-800" />
                            </div>
                            
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                            event.color === 'rose' ? 'bg-rose-500/10 text-rose-500' :
                                            event.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                                            event.color === 'blue' ? 'bg-blue-500/10 text-blue-500' : 'bg-zinc-500/10 text-zinc-400'
                                        )}>
                                            {event.priority}
                                        </span>
                                        <span className="text-xs text-zinc-500 font-mono">{event.time}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-zinc-400 bg-zinc-900 px-2 py-1 rounded-md border border-zinc-800">{event.status}</span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteIncident(event.id as number);
                                            }}
                                            className="p-1.5 rounded-md text-zinc-500 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                                            title="Eliminar incidencia"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <h4 className="text-base font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{event.title}</h4>
                                <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{event.desc}</p>
                                
                                <div className="flex flex-wrap items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-widest bg-zinc-900/50 p-2 px-3 rounded-full inline-flex mt-1 border border-zinc-800/50">
                                    {event.condoName && (
                                        <span className="flex items-center gap-1.5 text-indigo-400">
                                            <Building className="h-3 w-3" /> {event.condoName}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {event.loc}</span>
                                    <span className="flex items-center gap-1.5"><ShieldAlert className="h-3 w-3" /> {event.guard}</span>
                                </div>
                            </div>
                        </motion.div>
                        ))
                    )}
                </div>
            </motion.div>

            {/* 6. Panel de Evidencias */}
            <motion.div variants={item} className="lg:col-span-4 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Camera className="h-5 w-5 text-zinc-400" />
                        Evidencia Gráfica
                    </h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                    {[0, 1].map((i) => {
                        const photoUrl = selectedIncident?.photoUrls?.[i];
                        return (
                            <div key={`photo-${i}`} className="aspect-square bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center group relative overflow-hidden">
                                {photoUrl ? (
                                    <>
                                        <img src={photoUrl} alt={`Evidencia Foto ${i + 1}`} className="w-full h-full object-cover" />
                                        <div 
                                            onClick={() => setFullScreenMedia({url: photoUrl, type: 'photo'})}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer"
                                        >
                                            <span className="text-xs text-white font-bold bg-black/60 px-2 py-1 rounded-md">Ver Foto</span>
                                        </div>
                                    </>
                                ) : (
                                    <Camera className="h-8 w-8 text-zinc-800" />
                                )}
                            </div>
                        );
                    })}
                    {[0, 1].map((i) => {
                        const videoUrl = selectedIncident?.videoUrls?.[i];
                        return (
                            <div key={`video-${i}`} className="aspect-square bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center group relative overflow-hidden">
                                {videoUrl ? (
                                    <>
                                        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
                                            <Video className="h-12 w-12 text-indigo-500/50" />
                                        </div>
                                        <div 
                                            onClick={() => setFullScreenMedia({url: videoUrl, type: 'video'})}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 cursor-pointer"
                                        >
                                            <span className="text-xs text-white font-bold bg-black/60 px-2 py-1 rounded-md">Ver Video</span>
                                        </div>
                                    </>
                                ) : (
                                    <Video className="h-8 w-8 text-zinc-800" />
                                )}
                            </div>
                        );
                    })}
                </div>
                {selectedIncident && (
                    <div className="pt-2">
                        <p className="text-xs text-zinc-500 text-center">Evidencia de: <span className="font-bold text-zinc-300">{selectedIncident.title}</span></p>
                    </div>
                )}
            </motion.div>
        </div>
      </motion.div>

      {/* 8. Botón Flotante WhatsApp */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fixed bottom-6 right-6 h-16 w-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)] z-40 group"
        onClick={() => alert('Esto conectará con el webhook de n8n para enviar alerta por WhatsApp')}
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40"></span>
        <WhatsAppIcon className="h-8 w-8 text-white relative z-10" />
      </motion.button>

      {/* 4. Modal Premium de Reporte */}
      <AnimatePresence>
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    onClick={() => setIsModalOpen(false)}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
                        <div className="flex items-center gap-3">
                            <div className="bg-rose-500/20 p-2 rounded-lg text-rose-500">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{modalType}</h2>
                                <p className="text-xs text-zinc-500">Completar reporte de incidencia</p>
                            </div>
                        </div>
                        <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white bg-zinc-900 p-2 rounded-full transition-colors">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Propiedad</label>
                            <select 
                                value={formData.condoId}
                                onChange={(e) => setFormData({ ...formData, condoId: e.target.value })}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer"
                            >
                                <option value="" className="bg-zinc-950">Selecciona una propiedad</option>
                                {availableCondos?.map((condo) => (
                                    <option key={condo.id} value={condo.id} className="bg-zinc-950">
                                        {condo.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Prioridad</label>
                                <select 
                                    value={formData.priority}
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none cursor-pointer"
                                >
                                    <option value="Baja">Baja</option>
                                    <option value="Media">Media</option>
                                    <option value="Alta">Alta</option>
                                    <option value="Urgente" className="text-rose-500 font-bold">Urgente</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Ubicación</label>
                                <input 
                                    type="text" 
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    placeholder="Ej. Caseta, Torre A..." 
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Descripción Rápida</label>
                            <textarea 
                                rows={3} 
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Detalles de la incidencia..." 
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-indigo-500/50 transition-colors text-zinc-400 hover:text-indigo-400 group cursor-pointer relative overflow-hidden">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    multiple
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setFormData({ ...formData, photos: Array.from(e.target.files).slice(0, 2) })
                                        }
                                    }}
                                />
                                {formData.photos.length > 0 ? (
                                    <>
                                        <div className="absolute inset-0 bg-indigo-500/10 flex flex-col items-center justify-center z-10 border border-indigo-500/50 rounded-xl p-2">
                                            <CheckCircle2 className="h-6 w-6 text-indigo-500 mb-1" />
                                            <span className="text-[10px] font-bold text-indigo-400 text-center">{formData.photos.length} Foto(s) adjunta(s)</span>
                                            <span className="text-[9px] text-zinc-400 text-center mt-1">(Clic para reemplazar)</span>
                                        </div>
                                        <Camera className="h-6 w-6 opacity-0" />
                                        <span className="text-xs font-medium opacity-0">Adjuntar Foto</span>
                                    </>
                                ) : (
                                    <>
                                        <Camera className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-medium text-center">Adjuntar Foto<br/><span className="text-[10px] text-zinc-500 font-normal">(Máx. 2)</span></span>
                                    </>
                                )}
                            </label>
                            <label className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-indigo-500/50 transition-colors text-zinc-400 hover:text-indigo-400 group cursor-pointer relative overflow-hidden">
                                <input 
                                    type="file" 
                                    accept="video/*" 
                                    multiple
                                    className="hidden" 
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setFormData({ ...formData, videos: Array.from(e.target.files).slice(0, 2) })
                                        }
                                    }}
                                />
                                {formData.videos.length > 0 ? (
                                    <>
                                        <div className="absolute inset-0 bg-indigo-500/10 flex flex-col items-center justify-center z-10 border border-indigo-500/50 rounded-xl p-2">
                                            <CheckCircle2 className="h-6 w-6 text-indigo-500 mb-1" />
                                            <span className="text-[10px] font-bold text-indigo-400 text-center">{formData.videos.length} Video(s) adjunto(s)</span>
                                            <span className="text-[9px] text-zinc-400 text-center mt-1">(Clic para reemplazar)</span>
                                        </div>
                                        <Video className="h-6 w-6 opacity-0" />
                                        <span className="text-xs font-medium opacity-0">Adjuntar Video</span>
                                    </>
                                ) : (
                                    <>
                                        <Video className="h-6 w-6 group-hover:scale-110 transition-transform" />
                                        <span className="text-xs font-medium text-center">Adjuntar Video<br/><span className="text-[10px] text-zinc-500 font-normal">(Máx. 2)</span></span>
                                    </>
                                )}
                            </label>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <ShieldAlert className="h-4 w-4" />
                                Oficial: {userName || 'En turno'}
                            </div>
                            <button 
                                onClick={handleSubmit}
                                disabled={!formData.description || isSubmitting}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                                    formData.description && !isSubmitting ? "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]" : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                )}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Enviar Reporte Real
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )}


        {/* Modal de Visor de Medios a Pantalla Completa */}
        {fullScreenMedia && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/95 backdrop-blur-xl"
                    onClick={() => setFullScreenMedia(null)}
                />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center"
                >
                    <button 
                        onClick={() => setFullScreenMedia(null)} 
                        className="absolute -top-12 right-0 text-zinc-500 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 p-2 rounded-full transition-colors z-10"
                    >
                        <X className="h-6 w-6" />
                    </button>
                    
                    {fullScreenMedia.type === 'photo' ? (
                        <img 
                            src={fullScreenMedia.url} 
                            alt="Evidencia Ampliada" 
                            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                        />
                    ) : (
                        <div className="w-full h-full bg-black rounded-lg flex items-center justify-center shadow-2xl overflow-hidden border border-zinc-800">
                            <video 
                                src={fullScreenMedia.url} 
                                controls 
                                autoPlay 
                                className="max-w-full max-h-full"
                            >
                                Tu navegador no soporta el elemento de video.
                            </video>
                        </div>
                    )}
                </motion.div>
            </div>
        )}

      </AnimatePresence>
    </div>
  )
}
