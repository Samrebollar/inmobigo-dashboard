'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createAnnouncement, deleteAnnouncementAction } from '@/app/actions/announcement-actions'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import { 
    Bell, 
    Package, 
    QrCode, 
    Plus, 
    Search, 
    Filter, 
    Clock, 
    CheckCircle2, 
    ChevronRight, 
    X,
    Calendar,
    MapPin,
    ShieldCheck,
    ArrowRight,
    Users,
    Upload,
    File,
    ImageIcon,
    Edit2,
    Trash2,
    Dumbbell,
    PartyPopper,
    Waves,
    Check,
    AlertCircle,
    Flame
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'
import { VisitorPassesAdmin } from './servicios/visitor-passes-admin'
import { PackageAlertsAdmin } from './servicios/package-alerts-admin'
import { propertiesService } from '@/services/properties-service'

type TabType = 'announcements' | 'packages' | 'access' | 'amenities'

interface Announcement {
    id: string
    title: string
    description: string
    date: string
    eventDate?: string
    startTime?: string
    endTime?: string
    location?: string
    category: string
    status: 'Leído' | 'Nuevo'
    priority: 'Normal' | 'Alta' | 'Urgente'
    visibility: string
    targetUnit?: string
    imageUrl?: string
}

interface AmenityReservation {
    id: string
    resident: string
    unit: string
    amenity: string
    date: string
    time: string
    status: 'Confirmado' | 'Pendiente' | 'Finalizado'
    price?: string
}


export function AvisosClient({ 
    admin,
    initialPasses = [], 
    initialAlerts = [],
    initialAnnouncements = [] 
}: { 
    admin: any
    initialPasses: any[]
    initialAlerts: any[]
    initialAnnouncements: any[]
}) {
    const router = useRouter()
    const supabase = createClient()

    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    // Helper para mapear anuncios de DB a UI
    const mapDbToUI = (ann: any): Announcement => {
        let categoryWithEmoji = ann.type || '📢 Informativo'
        if (!categoryWithEmoji.includes('📢') && !categoryWithEmoji.includes('🚧') && !categoryWithEmoji.includes('⚠️') && !categoryWithEmoji.includes('🎉') && !categoryWithEmoji.includes('📌')) {
            const lowerType = categoryWithEmoji.toLowerCase()
            if (lowerType.includes('mantenimiento')) categoryWithEmoji = '🚧 ' + ann.type
            else if (lowerType.includes('urgente')) categoryWithEmoji = '⚠️ ' + ann.type
            else if (lowerType.includes('evento')) categoryWithEmoji = '🎉 ' + ann.type
            else if (lowerType.includes('aviso')) categoryWithEmoji = '📌 ' + ann.type
            else categoryWithEmoji = '📢 ' + ann.type
        }

        return {
            id: ann.id,
            title: ann.title,
            description: ann.message,
            date: ann.created_at ? formatDistanceToNow(new Date(ann.created_at.toString().includes('Z') || ann.created_at.toString().includes('+') ? ann.created_at : `${ann.created_at}Z`), { addSuffix: true, locale: es }) : 'hace un momento',
            category: categoryWithEmoji,
            status: 'Nuevo',
            priority: ann.priority,
            eventDate: ann.event_date,
            startTime: ann.start_time,
            endTime: ann.end_time,
            location: ann.location,
            visibility: ann.visibility,
            targetUnit: ann.target_id,
            imageUrl: ann.image_url
        }
    }
    const [activeTab, setActiveTab] = useState<TabType>('announcements')
    const [showNewModal, setShowNewModal] = useState(false)
    const [showQRModal, setShowQRModal] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [toastMessage, setToastMessage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const [amenityReservations, setAmenityReservations] = useState<any[]>([])
    const [packageAlerts, setPackageAlerts] = useState<any[]>(initialAlerts)
    const [visitorPasses, setVisitorPasses] = useState<any[]>(initialPasses)
    const [loadingAmenities, setLoadingAmenities] = useState(false)

    useEffect(() => {
        if (!admin?.organization_id) return

        // 1. Amenity Reservations Subscription
        const amenityChannel = supabase
            .channel('admin-amenity-reservations')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'amenity_reservations',
                    filter: `organization_id=eq.${admin.organization_id}`
                },
                (payload) => {
                    console.log('Realtime Event (Amenities):', payload)
                    fetchAmenityReservations()
                    if (payload.eventType === 'INSERT') {
                        // toast.info('🔔 Nueva reserva de amenidad recibida')
                    }
                }
            )
            .subscribe()

        // 2. Package Alerts Subscription (ADMIN VERSION)
        console.log("🔥 MONITOR ADMIN PAQUETERIA ACTIVO")
        const packageChannel = supabase
            .channel('package-alerts-admin')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'package_alerts',
                    filter: `organization_id=eq.${admin.organization_id}`
                },
                (payload) => {
                    console.log('🔥 CAMBIO DETECTADO (Admin):', payload)
                    if (payload.eventType === 'INSERT') {
                        const newAlert = payload.new as any
                        setPackageAlerts(prev => [newAlert, ...prev])
                        // toast.info(`📦 Nuevo paquete: ${newAlert.carrier} para ${newAlert.resident_name}`)
                    } else if (payload.eventType === 'UPDATE') {
                        setPackageAlerts(prev => prev.map(a => a.id === (payload.new as any).id ? payload.new : a))
                    } else if (payload.eventType === 'DELETE') {
                        setPackageAlerts(prev => prev.filter(a => a.id !== (payload.old as any).id))
                    }
                }
            )
            .subscribe((status) => {
                console.log("🔥 ESTADO REALTIME (Admin):", status)
            })

        // 3. Visitor Passes Subscription
        const accessChannel = supabase
            .channel(`admin-visitor-passes-${admin.organization_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'visitor_passes',
                    filter: `organization_id=eq.${admin.organization_id}`
                },
                (payload) => {
                    console.log('Realtime Event (Access):', payload)
                    if (payload.eventType === 'INSERT') {
                        const newPass = payload.new
                        setVisitorPasses(prev => [newPass, ...prev])
                        // toast.info(`🎫 Nuevo pase de acceso: ${newPass.visitor_name}`)
                    } else if (payload.eventType === 'UPDATE') {
                        setVisitorPasses(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
                    } else if (payload.eventType === 'DELETE') {
                        setVisitorPasses(prev => prev.filter(p => p.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        // 4. Initial data fetch for announcements
        fetchAnnouncements()

        // Initial data fetch for amenities (since it's not passed as initialData)
        if (activeTab === 'amenities') {
            fetchAmenityReservations()
        }

        return () => {
            supabase.removeChannel(amenityChannel)
            supabase.removeChannel(packageChannel)
            supabase.removeChannel(accessChannel)
        }
    }, [admin?.organization_id, activeTab])

    const fetchAnnouncements = async () => {
        if (!admin?.organization_id) {
            console.log('🔍 [Avisos] No hay organization_id disponible');
            return
        }
        
        try {
            console.log('📡 [Avisos] Buscando anuncios para Org:', admin.organization_id);
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('organization_id', admin.organization_id)
                .order('created_at', { ascending: false })

            console.log('📦 [Avisos] Resultado raw de Supabase:', { data, error });

            if (error) throw error

            if (data) {
                const mappedAnnouncements = data.map(ann => mapDbToUI(ann))
                setAnnouncements(mappedAnnouncements)
            }
        } catch (error) {
            console.error('Error fetching announcements:', error)
        }
    }

    const [managedCondos, setManagedCondos] = useState<string[]>([])

    useEffect(() => {
        const fetchCondos = async () => {
            if (!admin?.organization_id) return
            try {
                const condos = await propertiesService.getByOrganization(admin.organization_id)
                setManagedCondos(condos.map(c => c.name))
            } catch (err) {
                console.error("Error fetching condos for visibility:", err)
            }
        }
        fetchCondos()
    }, [admin?.organization_id])

    const fetchAmenityReservations = async () => {
        setLoadingAmenities(true)
        try {
            console.log('Fetching reservations for org_id:', admin?.organization_id);
            if (!admin?.organization_id) {
                setLoadingAmenities(false)
                return;
            }

            const { data, error } = await supabase
                .from('amenity_reservations')
                .select('*, amenities(*), profiles:resident_id(*)')
                .eq('organization_id', admin.organization_id)
                .order('reservation_date', { ascending: false })

            console.log('Query result:', { data, error });

            if (error) {
                console.error('Error fetching reservations:', error);
            } else if (data) {
                // Fetch resident details for all unique residents to securely get unit and property
                const residentIds = [...new Set(data.filter(r => r.resident_id).map(r => r.resident_id))]
                if (residentIds.length > 0) {
                    const { data: residentsData } = await supabase
                        .from('residents')
                        .select('user_id, first_name, last_name, units(unit_number), condominiums(name)')
                        .in('user_id', residentIds)
                    
                    if (residentsData) {
                        const residentMap = residentsData.reduce((acc: any, r: any) => {
                            acc[r.user_id] = r
                            return acc
                        }, {})
                        
                        data.forEach((res: any) => {
                            res.residentInfo = residentMap[res.resident_id]
                        })
                    }
                }
                setAmenityReservations(data)
            }
        } catch (error) {
            console.error('Exception fetching reservations:', error)
        } finally {
            setLoadingAmenities(false)
        }
    }

    const handleUpdateReservation = async (id: string, status: string) => {
        try {
            const { error } = await supabase
                .from('amenity_reservations')
                .update({ 
                    status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
            
            if (error) throw error
            
            setAmenityReservations(prev => prev.map(r => 
                r.id === id ? { ...r, status } : r
            ))
            
            setToastMessage(`Reserva ${status === 'approved' ? 'aprobada' : 'cancelada'} correctamente`)
            setTimeout(() => setToastMessage(null), 3000)
        } catch (error) {
            console.error('Error updating reservation:', error)
            alert('Error al actualizar reserva')
        }
    }

    // Form States
    const [newTitle, setNewTitle] = useState('')
    const [newCategory, setNewCategory] = useState('📢 Informativo')
    const [newDescription, setNewDescription] = useState('')
    const [newEventDate, setNewEventDate] = useState('')
    const [newStartTime, setNewStartTime] = useState('')
    const [newEndTime, setNewEndTime] = useState('')
    const [newLocation, setNewLocation] = useState('')
    const [newPriority, setNewPriority] = useState<'Normal' | 'Alta' | 'Urgente'>('Normal')
    const [newVisibility, setNewVisibility] = useState<string>('Todos')
    const [newTargetUnit, setNewTargetUnit] = useState('')
    const [isPublishing, setIsPublishing] = useState(false)

    // Announcements State
    const [announcements, setAnnouncements] = useState<Announcement[]>(
        initialAnnouncements.map(ann => mapDbToUI(ann))
    )

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handlePublish = async () => {
        if (!newTitle || !newDescription) {
            setToastMessage('⚠️ El título y la descripción son obligatorios')
            setTimeout(() => setToastMessage(null), 3000)
            return
        }

        if (!admin?.organization_id || !admin?.id) {
            setToastMessage('⚠️ Error de sesión: No se identificó la organización o usuario')
            setTimeout(() => setToastMessage(null), 3000)
            return
        }

        setIsPublishing(true)

        let imageUrl = null;
        if (selectedFile) {
            const supabase = createClient();
            const fileExt = selectedFile.name.split('.').pop();
            const fileName = `${admin.organization_id}/${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('announcements')
                .upload(fileName, selectedFile);

            if (uploadError) {
                console.error('❌ Error al subir archivo:', uploadError);
                setToastMessage('⚠️ No se pudo subir el archivo: ' + uploadError.message);
                setTimeout(() => setToastMessage(null), 3000);
                setIsPublishing(false);
                return;
            }
            
            const { data: { publicUrl } } = supabase.storage
                .from('announcements')
                .getPublicUrl(fileName);
            
            imageUrl = publicUrl;
        }

        // Limpiar emojis del tipo para evitar errores de restriccion en BD si es texto simple
        const cleanType = newCategory.replace(/[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu, '').trim();

        const payload: any = {
            organization_id: admin.organization_id,
            title: newTitle,
            message: newDescription,
            type: cleanType,
            priority: newPriority,
            event_date: newEventDate || null,
            start_time: newStartTime || null,
            end_time: newEndTime || null,
            location: newLocation || null,
            visibility: newVisibility,
            created_by: admin.id,
            is_active: true,
            image_url: imageUrl
        };

        console.log('🚀 DEBUG [Payload]:', payload);
        console.log('🚀 DEBUG [Admin]:', { id: admin.id, org: admin.organization_id });

        try {
            if (editingId) {
                // ... lógica de edición local actual ...
                setAnnouncements(announcements.map(ann => 
                    ann.id === editingId 
                        ? { 
                            ...ann, 
                            title: newTitle, 
                            description: newDescription, 
                            category: newCategory,
                            eventDate: newEventDate,
                            startTime: newStartTime,
                            endTime: newEndTime,
                            location: newLocation,
                            priority: newPriority,
                            visibility: newVisibility,
                            targetUnit: newTargetUnit
                          }
                        : ann
                ))
            } else {
                // INSERT via Server Action (Para bypassar RLS y diagnosticar {})
                console.log('📡 INVOCANDO SERVER ACTION: createAnnouncement...');
                
                const result = await createAnnouncement(payload);

                if (!result.success) {
                    console.error('❌ ERROR DESDE SERVER ACTION:', result.error);
                    throw new Error(result.error);
                }

                console.log('✅ ÉXITO DESDE SERVER ACTION:', result.data);
                
                const newAnn: Announcement = {
                    id: result.data?.id || Date.now().toString(),
                    title: newTitle,
                    description: newDescription,
                    date: 'hace un momento',
                    category: newCategory,
                    status: 'Nuevo',
                    eventDate: newEventDate,
                    startTime: newStartTime,
                    endTime: newEndTime,
                    location: newLocation,
                    priority: newPriority,
                    visibility: newVisibility,
                    targetUnit: newTargetUnit
                }
                setAnnouncements([newAnn, ...announcements])
            }
            
            setToastMessage('✅ Anuncio publicado correctamente')
            
            // Reset Form and Modal
            setNewTitle('')
            setNewDescription('')
            setNewCategory('📢 Informativo')
            setNewEventDate('')
            setNewStartTime('')
            setNewEndTime('')
            setNewLocation('')
            setNewPriority('Normal')
            setNewVisibility('Todos')
            setNewTargetUnit('')
            setSelectedFile(null)
            setEditingId(null)
            setShowNewModal(false)

        } catch (error: any) {
            console.error('🔥 ERROR CRÍTICO:', error);
            setToastMessage(`❌ Error: ${error.message || 'Error de conexión'}`);
        } finally {
            setIsPublishing(false)
            setTimeout(() => setToastMessage(null), 3000)
        }
    }

    const handleDelete = (ann: Announcement) => {
        setAnnouncementToDelete(ann)
        setShowDeleteConfirm(true)
    }

    const confirmDelete = async () => {
        if (!announcementToDelete) return
        
        setIsDeleting(true)
        try {
            const result = await deleteAnnouncementAction(announcementToDelete.id)
            if (result.success) {
                setAnnouncements(prev => prev.filter(a => a.id !== announcementToDelete.id))
                setToastMessage('✅ Aviso eliminado correctamente')
                setTimeout(() => setToastMessage(null), 3000)
            } else {
                setToastMessage('❌ Error: ' + result.error)
                setTimeout(() => setToastMessage(null), 3000)
            }
        } catch (err) {
            console.error(err)
            setToastMessage('❌ Error de conexión')
            setTimeout(() => setToastMessage(null), 3000)
        } finally {
            setIsDeleting(false)
            setShowDeleteConfirm(false)
            setAnnouncementToDelete(null)
        }
    }

    const handleEdit = (ann: Announcement) => {
        setNewTitle(ann.title)
        setNewDescription(ann.description)
        setNewCategory(ann.category)
        setNewEventDate(ann.eventDate || '')
        setNewStartTime(ann.startTime || '')
        setNewEndTime(ann.endTime || '')
        setNewLocation(ann.location || '')
        setNewPriority(ann.priority || 'Normal')
        setNewVisibility(ann.visibility || 'Todos')
        setNewTargetUnit(ann.targetUnit || '')
        setEditingId(ann.id)
        setShowNewModal(true)
    }





    const tabs = [
        { id: 'announcements', label: 'Anuncios', icon: Bell, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
        { id: 'packages', label: 'Paquetería', icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        { id: 'access', label: 'Accesos', icon: QrCode, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
        { id: 'amenities', label: 'Amenidades', icon: PartyPopper, color: 'text-rose-400', bg: 'bg-rose-500/10' }
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header & Main Stats */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2 bg-gradient-to-r from-white via-zinc-400 to-zinc-500 bg-clip-text text-transparent">
                        Comunicación y Operaciones
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base max-w-2xl font-medium">
                        Centraliza avisos, paquetería, accesos y gestión de amenidades en un solo lugar
                    </p>
                </div>
                
                {/* Toast Notification */}
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 bg-zinc-900 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)] text-white px-5 py-3 rounded-full font-bold text-sm"
                        >
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            {toastMessage}
                        </motion.div>
                    )}
                </AnimatePresence>
                <div className="flex items-center gap-3">
                    <motion.button 
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setToastMessage('📊 Abriendo panel de control de lectura...');
                            setTimeout(() => {
                                setToastMessage(null);
                                router.push('/dashboard/control-lectura');
                            }, 1000);
                        }}
                        className="h-12 px-6 bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-zinc-300 hover:text-white font-bold rounded-2xl transition-all flex items-center gap-2 group relative overflow-hidden shadow-lg"
                    >
                        <ShieldCheck size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span className="text-sm">Control de lectura</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setEditingId(null);
                            setNewTitle('');
                            setNewDescription('');
                            setNewCategory('📢 Informativo');
                            setNewEventDate('');
                            setNewStartTime('');
                            setNewEndTime('');
                            setNewLocation('');
                            setNewPriority('Normal');
                            setNewVisibility('Todos');
                            setNewTargetUnit('');
                            setSelectedFile(null);
                            setShowNewModal(true);
                        }}
                        className="h-12 px-8 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl shadow-xl shadow-orange-900/20 transition-all flex items-center gap-3 group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] transition-transform" />
                        <Bell size={20} className="group-hover:rotate-12 transition-transform duration-300" /> 
                        <span>Crear Anuncio</span>
                    </motion.button>
                </div>
            </div>

            {/* Premium Tab Navigation */}
            <div className="flex justify-center">
                <div className="flex p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl w-fit backdrop-blur-xl">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                    >
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="active-tab"
                                className="absolute inset-0 bg-zinc-800 rounded-xl shadow-inner"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <tab.icon size={18} className={`relative z-10 ${activeTab === tab.id ? tab.color : ''}`} />
                        <span className="relative z-10">{tab.label}</span>
                    </button>
                ))}
                </div>
            </div>

            {/* Dynamic Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === 'announcements' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {announcements.map((ann, i) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    key={ann.id}
                                >
                                    <Card className="bg-zinc-900/40 border-zinc-800 hover:border-indigo-500/50 transition-all duration-300 group overflow-hidden h-full relative">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full" />
                                        <CardContent className="p-6 pt-7">
                                            <div className="flex justify-between items-center mb-5">
                                                <Badge className={`px-2.5 py-1 rounded-lg border-0 shadow-sm ${
                                                    ann.category.includes('Informativo') ? 'bg-indigo-500/20 text-indigo-400' :
                                                    ann.category.includes('Social') || ann.category.includes('Evento') ? 'bg-emerald-500/20 text-emerald-400' :
                                                    ann.category.includes('Urgente') ? 'bg-rose-500/20 text-rose-400' :
                                                    'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                    {ann.category}
                                                </Badge>
                                                <span suppressHydrationWarning className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{ann.date}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors leading-tight">
                                                {ann.title}
                                            </h3>
                                            <p className={cn(
                                                "text-zinc-500 text-sm leading-relaxed mb-6 font-medium transition-all duration-500",
                                                !expandedIds.has(ann.id) && "line-clamp-2"
                                            )}>
                                                {ann.description}
                                            </p>

                                            { (ann.imageUrl || (ann as any).image_url) && (() => {
                                                const url = ann.imageUrl || (ann as any).image_url;
                                                const isPdf = url && url.toLowerCase().includes('.pdf');

                                                if (isPdf) {
                                                    return (
                                                        <motion.a 
                                                            whileHover={{ scale: 1.02 }}
                                                            whileTap={{ scale: 0.98 }}
                                                            href={url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="mb-6 block p-6 bg-zinc-950/60 border border-zinc-800/80 rounded-3xl hover:border-indigo-500/40 transition-all group/file relative overflow-hidden shadow-2xl"
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover/file:opacity-100 transition-opacity" />
                                                            <div className="relative flex items-center gap-5">
                                                                <div className="h-14 w-14 bg-rose-500/10 text-rose-500 rounded-2xl flex items-center justify-center ring-1 ring-rose-500/20 shadow-inner shrink-0 group-hover/file:bg-rose-500/20 transition-all">
                                                                    <File size={28} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-bold text-white mb-1 truncate">Documento Adjunto (PDF)</p>
                                                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                                                                        Ver archivo <ArrowRight size={10} className="group-hover/file:translate-x-1 transition-transform" />
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </motion.a>
                                                    )
                                                }

                                                return (
                                                    <div className="mb-6 relative w-full h-48 rounded-2xl overflow-hidden border border-zinc-800/80 group-hover:border-indigo-500/30 transition-all bg-black/40 ring-1 ring-white/10 shadow-2xl z-10">
                                                        <img 
                                                            src={url} 
                                                            alt={ann.title}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 pointer-events-none"
                                                            onError={(e) => {
                                                                (e.target as any).style.display = 'none';
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                                                    </div>
                                                )
                                            })()}
                                            
                                            <div className="flex items-center justify-between pt-5 border-t border-zinc-800/50">
                                                <motion.button 
                                                    whileHover={{ x: 5 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => toggleExpand(ann.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all",
                                                        expandedIds.has(ann.id) ? "text-indigo-400" : "text-zinc-500 hover:text-white"
                                                    )}
                                                >
                                                    {expandedIds.has(ann.id) ? 'Ver menos' : 'Leer más'} 
                                                    <ArrowRight size={14} className={cn("transition-transform duration-300", expandedIds.has(ann.id) && "rotate-90")} />
                                                </motion.button>
                                                
                                                <div className="flex items-center gap-3">
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(99, 102, 241, 0.15)' }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleEdit(ann)}
                                                        className="p-2.5 bg-zinc-800/40 text-zinc-400 hover:text-indigo-400 rounded-xl border border-zinc-800/50 hover:border-indigo-500/30 transition-all shadow-lg"
                                                        title="Editar"
                                                    >
                                                        <Edit2 size={15} />
                                                    </motion.button>
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(244, 63, 94, 0.15)' }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleDelete(ann)}
                                                        className="p-2.5 bg-zinc-800/40 text-zinc-400 hover:text-rose-400 rounded-xl border border-zinc-800/50 hover:border-rose-500/30 transition-all shadow-lg"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={15} />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Amenities Reservations Grid */}
                    {activeTab === 'amenities' && (
                        <div className="space-y-6">
                            {/* Pending Counter KPI */}
                            <div className="flex items-center gap-3 p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl w-fit">
                                <div className="h-10 w-10 bg-amber-500/10 text-amber-500 flex items-center justify-center rounded-xl">
                                    <Clock size={20} />
                                </div>
                                <div className="pr-4">
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Atención Requerida</p>
                                    <p className="text-xl font-bold text-white leading-tight">
                                        {amenityReservations.filter(r => r.status === 'pending').length} <span className="text-sm font-medium text-zinc-500">pendientes</span>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {loadingAmenities ? (
                                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10 text-zinc-500 font-bold animate-pulse">
                                        Cargando reservas...
                                    </div>
                                ) : amenityReservations.length === 0 ? (
                                    <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-20 flex flex-col items-center">
                                        <Calendar size={48} className="text-zinc-800 mb-4" />
                                        <p className="text-zinc-500 font-bold">No hay reservas registradas en este condominio.</p>
                                    </div>
                                ) : amenityReservations.map((res, index) => {
                                const amenityName = res.amenities?.name || 'Amenidad'
                                const residentName = res.residentInfo?.first_name 
                                    ? `${res.residentInfo.first_name} ${res.residentInfo.last_name || ''}`.trim() 
                                    : res.profiles?.full_name || 'Residente'
                                const unitInfo = res.residentInfo?.units?.unit_number ? `${res.residentInfo.units.unit_number}` : 'N/A'
                                const propInfo = res.residentInfo?.condominiums?.name || 'Comunidad General'
                                
                                const dateFormatted = format(new Date(res.reservation_date), 'd MMM, yyyy', { locale: es })
                                const totalPrice = (res.amenities?.base_price || 0) + (res.amenities?.deposit_required ? (res.amenities?.deposit_amount || 0) : 0)
                                const price = totalPrice > 0 ? `$${totalPrice.toLocaleString('en-US')}` : 'Gratis'
                                
                                const statusStyles: any = {
                                    pending: { 
                                        label: 'Revisión Pendiente', 
                                        glowBg: 'bg-gradient-to-r from-amber-600 via-orange-500 to-amber-600',
                                        border: 'border-zinc-800/80 group-hover:border-amber-500/50',
                                        bg: 'bg-zinc-950/90',
                                        iconBg: 'bg-amber-500/10 text-amber-500 group-hover:scale-110 group-hover:bg-amber-500/20',
                                        badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]',
                                        price: 'text-amber-400 bg-amber-500/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]'
                                    },
                                    approved: { 
                                        label: 'Reserva Confirmada', 
                                        glowBg: 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600',
                                        border: 'border-emerald-500/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.1)]',
                                        bg: 'bg-zinc-950/90',
                                        iconBg: 'bg-emerald-500/10 text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500/20',
                                        badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]',
                                        price: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                    },
                                    cancelled: { 
                                        label: 'Reserva Cancelada', 
                                        glowBg: 'bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600',
                                        border: 'border-zinc-800/80 group-hover:border-rose-500/50',
                                        bg: 'bg-zinc-950/90',
                                        iconBg: 'bg-rose-500/10 text-rose-500 group-hover:scale-110 group-hover:bg-rose-500/20',
                                        badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
                                        price: 'text-rose-400 bg-rose-500/10 border border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]'
                                    }
                                }
                                const currentStatus = statusStyles[res.status] || statusStyles['pending']

                                return (
                                <motion.div
                                    key={res.id}
                                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: index * 0.1, duration: 0.4, type: "spring", stiffness: 100 }}
                                    className="h-full relative group"
                                >
                                    {/* Animated Color Glow Behind the Card */}
                                    <div className={`absolute -inset-[1px] rounded-[2.2rem] opacity-[0.15] group-hover:opacity-[0.35] blur-xl transition duration-1000 group-hover:duration-300 animate-[pulse_4s_cubic-bezier(0.4,0,0.6,1)_infinite] ${currentStatus.glowBg}`} />

                                    <div className={`relative h-full flex flex-col rounded-[2rem] border backdrop-blur-3xl transition-all duration-300 overflow-hidden ${currentStatus.bg} ${currentStatus.border}`}>
                                        
                                        {/* Dynamic glassmorphism highlight */}
                                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        
                                        <div className="p-7 flex-1 flex flex-col">
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-inner ${currentStatus.iconBg}`}>
                                                    {amenityName.includes('Salón') ? <PartyPopper size={28} strokeWidth={1.5} /> : 
                                                     amenityName.includes('Alberca') || amenityName.includes('Piscina') ? <Waves size={28} strokeWidth={1.5} /> : 
                                                     amenityName.includes('Asador') ? <Flame size={28} strokeWidth={1.5} /> :
                                                     <Dumbbell size={28} strokeWidth={1.5} />}
                                                </div>
                                                <Badge className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] ${currentStatus.badge}`}>
                                                    {currentStatus.label}
                                                </Badge>
                                            </div>
                                            
                                            {/* Title & Date */}
                                            <div className="mb-6 flex-1">
                                                <h3 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight drop-shadow-md">
                                                    {amenityName}
                                                </h3>
                                                <div className="flex items-center gap-2.5 text-zinc-400 text-sm font-medium">
                                                    <div className="p-1.5 bg-zinc-800/50 rounded-md text-zinc-300">
                                                        <Calendar size={14} />
                                                    </div>
                                                    <span>{dateFormatted}</span>
                                                    <span className="text-zinc-600">•</span>
                                                    <div className="flex items-center gap-1 text-zinc-400">
                                                        <Clock size={14} className="opacity-70" /> {res.amenities?.use_hours || 'Turno Único'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Resident Identity Block */}
                                            <div className="relative p-4 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md overflow-hidden group-hover:bg-black/60 transition-colors">
                                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="relative flex items-center gap-4">
                                                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-black text-white shadow-lg shadow-indigo-500/20 shrink-0 border border-white/10">
                                                        {residentName.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-white truncate drop-shadow-sm">{residentName}</p>
                                                        <div className="flex flex-col mt-1 space-y-0.5">
                                                            <div className="flex items-center gap-1.5 opacity-80">
                                                                <MapPin size={10} className="text-zinc-400" />
                                                                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate">{propInfo}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                <ShieldCheck size={10} className="text-indigo-400" />
                                                                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{unitInfo}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={`px-3 py-1.5 rounded-lg text-xs font-black self-start backdrop-blur-md shrink-0 ${currentStatus.price}`}>
                                                        {price}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Action Footer */}
                                        <div className="px-7 py-5 bg-black/40 border-t border-white/5 flex gap-3 justify-center items-center mt-auto">
                                            {res.status === 'pending' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleUpdateReservation(res.id, 'cancelled')}
                                                        className="flex-1 sm:flex-none h-11 px-5 rounded-xl flex items-center justify-center gap-2 text-rose-400 hover:text-white bg-rose-500/5 hover:bg-rose-500 border border-rose-500/20 hover:border-rose-500 transition-all font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_20px_rgba(244,63,94,0.4)]"
                                                    >
                                                        <X size={15} strokeWidth={2.5} /> Denegar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleUpdateReservation(res.id, 'approved')}
                                                        className="flex-1 sm:flex-none h-11 px-5 rounded-xl flex items-center justify-center gap-2 text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500 border border-emerald-500/20 hover:border-emerald-500 transition-all font-bold text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                                                    >
                                                        <Check size={15} strokeWidth={2.5} /> Aprobar
                                                    </button>
                                                </>
                                            )}
                                            {res.status !== 'pending' && (
                                                <button 
                                                    disabled
                                                    className="w-full h-11 px-6 rounded-xl flex items-center justify-center text-zinc-600 bg-zinc-900 border border-zinc-800 font-bold text-[10px] uppercase tracking-widest cursor-not-allowed opacity-50"
                                                >
                                                    Acción Procesada
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                                )
                            })}
                        </div>
                        </div>
                    )}

                    {activeTab === 'packages' && (
                        <PackageAlertsAdmin admin={admin} initialAlerts={packageAlerts} />
                    )}

                    {activeTab === 'access' && (
                        <VisitorPassesAdmin admin={admin} initialPasses={visitorPasses} />
                    )}
                </motion.div>
            </AnimatePresence>

            {/* QR Backdrop Modal */}
            <AnimatePresence>
                {showQRModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-xl"
                        onClick={() => setShowQRModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="w-full max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-end mb-4">
                                <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <QRCodeDisplay value={showQRModal} label="InmobiGo Secure Access" />
                            <p className="mt-6 text-center text-zinc-400 text-xs font-medium leading-relaxed max-w-[250px] mx-auto">
                                Escanee este código en la caseta de vigilancia para validar su registro. Válido solo para un uso.
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* New Announcement Modal */}
            <AnimatePresence>
                {showNewModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                        <div className="h-10 w-10 bg-indigo-500/10 text-indigo-500 flex items-center justify-center rounded-xl">
                                            <Bell size={20} />
                                        </div>
                                        Nuevo Anuncio
                                    </h2>
                                    <button 
                                        onClick={() => setShowNewModal(false)}
                                        className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar pb-2">
                                    {/* Visibilidad Selector */}
                                    <div className="space-y-3 pb-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">🚀 Enviar a (Visibilidad)</label>
                                        <div className="relative">
                                            <select 
                                                value={newVisibility}
                                                onChange={(e) => setNewVisibility(e.target.value)}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-bold text-xs appearance-none cursor-pointer shadow-xl"
                                            >
                                                <option value="Todos">Todos (Toda la organización)</option>
                                                {managedCondos.map((condo) => (
                                                    <option key={condo} value={condo}>
                                                        {condo}
                                                    </option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 rotate-90 pointer-events-none" size={16} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Título del Anuncio</label>
                                        <input 
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            placeholder="Ej. Mantenimiento del Roof Garden"
                                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium shadow-inner"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Tipo de Anuncio</label>
                                            <div className="relative">
                                                <select 
                                                    value={newCategory}
                                                    onChange={(e) => setNewCategory(e.target.value)}
                                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium appearance-none cursor-pointer"
                                                >
                                                    <option value="📢 Informativo">📢 Informativo</option>
                                                    <option value="🚧 Mantenimiento">🚧 Mantenimiento</option>
                                                    <option value="⚠️ Urgente">⚠️ Urgente</option>
                                                    <option value="🎉 Evento">🎉 Evento</option>
                                                    <option value="📌 Aviso importante">📌 Aviso importante</option>
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 rotate-90 pointer-events-none" size={14} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Prioridad</label>
                                            <div className="relative">
                                                <select 
                                                    value={newPriority}
                                                    onChange={(e) => setNewPriority(e.target.value as any)}
                                                    className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 focus:outline-none transition-all font-medium appearance-none cursor-pointer ${
                                                        newPriority === 'Urgente' ? 'border-rose-500/40 text-rose-400 focus:ring-rose-500/10' :
                                                        newPriority === 'Alta' ? 'border-amber-500/40 text-amber-400 focus:ring-amber-500/10' :
                                                        'border-zinc-800 text-white focus:ring-indigo-500/20 focus:border-indigo-500/50'
                                                    }`}
                                                >
                                                    <option value="Normal">Normal</option>
                                                    <option value="Alta">Alta</option>
                                                    <option value="Urgente">Urgente</option>
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 rotate-90 pointer-events-none" size={14} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Agenda SaaS Style */}
                                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800/50 space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <Calendar size={14} className="text-indigo-400" /> Fecha del Evento
                                            </label>
                                            <div className="relative group">
                                                <input 
                                                    type="date"
                                                    value={newEventDate}
                                                    onChange={(e) => setNewEventDate(e.target.value)}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-bold text-sm [color-scheme:dark] cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Clock size={14} className="text-emerald-400" /> Inicio
                                                </label>
                                                <input 
                                                    type="time"
                                                    value={newStartTime}
                                                    onChange={(e) => setNewStartTime(e.target.value)}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-bold text-sm [color-scheme:dark] cursor-pointer"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                    <Clock size={14} className="text-amber-400" /> Fin (Opc)
                                                </label>
                                                <input 
                                                    type="time"
                                                    value={newEndTime}
                                                    onChange={(e) => setNewEndTime(e.target.value)}
                                                    className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-bold text-sm [color-scheme:dark] cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">📍 Ubicación del Evento</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 h-8 w-8 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                                                <MapPin className="text-rose-400 h-4 w-4" />
                                            </div>
                                            <input 
                                                value={newLocation}
                                                onChange={(e) => setNewLocation(e.target.value)}
                                                placeholder="Ej. Roof Garden / Salón Social"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-14 pr-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Descripción Detallada</label>
                                        <textarea 
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            rows={2}
                                            placeholder="Escribe aquí los detalles del anuncio para los residentes..."
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium resize-none shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Multimedia y Adjuntos</label>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden" 
                                            accept="image/*,.pdf"
                                        />
                                        
                                        <motion.div 
                                            whileHover={{ borderColor: 'rgba(99, 102, 241, 0.5)', backgroundColor: 'rgba(9, 9, 11, 0.8)' }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer group relative overflow-hidden ${
                                                selectedFile ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-950/50'
                                            }`}
                                        >
                                            <AnimatePresence mode="wait">
                                                {!selectedFile ? (
                                                    <motion.div 
                                                        key="upload-prompt"
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        className="flex flex-col items-center"
                                                    >
                                                        <div className="h-16 w-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-500/20 group-hover:scale-110 transition-all duration-300">
                                                            <Upload size={28} />
                                                        </div>
                                                        <p className="text-sm font-bold text-zinc-300 group-hover:text-white transition-colors">Subir imagen o archivo PDF</p>
                                                        <p className="text-[11px] text-zinc-500 font-medium mt-1.5 px-4 text-center leading-relaxed">Arrastra aquí o haz clic para seleccionar<br/>JPG, PNG o PDF (Máx. 5MB)</p>
                                                    </motion.div>
                                                ) : (
                                                    <motion.div 
                                                        key="file-selected"
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="flex flex-col items-center w-full"
                                                    >
                                                        <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mb-4">
                                                            {selectedFile.type.includes('image') ? <ImageIcon size={28} /> : <File size={28} />}
                                                        </div>
                                                        <div className="text-center px-4 w-full">
                                                            <p className="text-sm font-bold text-white truncate max-w-xs mx-auto">{selectedFile.name}</p>
                                                            <p className="text-[10px] text-emerald-500/70 font-black uppercase mt-1 tracking-widest">Archivo Listo</p>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                                                            className="mt-4 text-[10px] font-black uppercase text-zinc-500 hover:text-rose-500 transition-colors tracking-tighter"
                                                        >
                                                            Eliminar archivo
                                                        </button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            
                                            {/* Decorative corner accents */}
                                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-zinc-800 group-hover:border-indigo-500/40 transition-colors" />
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-zinc-800 group-hover:border-indigo-500/40 transition-colors" />
                                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-zinc-800 group-hover:border-indigo-500/40 transition-colors" />
                                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-zinc-800 group-hover:border-indigo-500/40 transition-colors" />
                                        </motion.div>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <Button 
                                        onClick={() => setShowNewModal(false)}
                                        variant="ghost"
                                        className="flex-1 h-12 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold rounded-xl"
                                    >
                                        Cancelar
                                    </Button>
                                    <motion.button 
                                        whileHover={!isPublishing ? { scale: 1.02 } : {}}
                                        whileTap={!isPublishing ? { scale: 0.98 } : {}}
                                        onClick={handlePublish}
                                        disabled={isPublishing}
                                        className={`flex-1 h-12 text-white font-bold rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                                            isPublishing ? 'bg-zinc-700 cursor-not-allowed opacity-70' : 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20'
                                        }`}
                                    >
                                        {isPublishing ? (
                                            <>
                                                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                Publicando...
                                            </>
                                        ) : (
                                            <>
                                                <Bell size={18} /> Publicar Anuncio
                                            </>
                                        )}
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowDeleteConfirm(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-zinc-900 border border-rose-500/30 rounded-[2.5rem] p-10 shadow-2xl shadow-rose-500/10 overflow-hidden"
                        >
                            {/* Decorative Danger Background */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/10 blur-[100px] rounded-full" />
                            
                            <div className="relative space-y-8 text-center">
                                <div className="mx-auto w-24 h-24 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center ring-1 ring-rose-500/20 shadow-inner group overflow-hidden relative">
                                    <Trash2 size={44} className="relative z-10" />
                                    <motion.div 
                                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
                                        transition={{ duration: 2, repeat: Infinity }}
                                        className="absolute inset-0 bg-rose-500/20 blur-xl"
                                    />
                                </div>
                                
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-black text-white tracking-tight leading-none">¿Eliminar aviso?</h2>
                                    <p className="text-zinc-400 text-sm font-medium leading-relaxed px-2">
                                        Esta acción ocultará el anuncio "<span className="text-white lg:text-indigo-400 font-bold">{announcementToDelete?.title}</span>" para todos los residentes. No se puede deshacer.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                    <button
                                        disabled={isDeleting}
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all text-sm uppercase tracking-widest disabled:opacity-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        disabled={isDeleting}
                                        onClick={confirmDelete}
                                        className="flex-1 h-14 px-8 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black transition-all text-sm uppercase tracking-widest shadow-lg shadow-rose-600/40 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isDeleting ? (
                                            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            'Sí, Eliminar'
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
