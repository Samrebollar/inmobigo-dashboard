'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
    Waves
} from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRCodeDisplay } from '@/components/ui/qr-code-display'

type TabType = 'announcements' | 'packages' | 'access' | 'amenities'

interface Announcement {
    id: string
    title: string
    description: string
    date: string
    category: 'Oficial' | 'Social' | 'Mantenimiento'
    status: 'Leído' | 'Nuevo'
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

interface PackageDelivery {
    id: string
    resident: string
    unit: string
    carrier: string
    date: string
    status: 'Empaquetado' | 'Entregado' | 'En espera'
    qrCode: string
}

interface AccessCode {
    id: string
    guest: string
    type: 'Invitado' | 'Servicio' | 'Delivery'
    validUntil: string
    qrCode: string
}

export function AvisosClient() {
    const [activeTab, setActiveTab] = useState<TabType>('announcements')
    const [showNewModal, setShowNewModal] = useState(false)
    const [showQRModal, setShowQRModal] = useState<string | null>(null)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Form States
    const [newTitle, setNewTitle] = useState('')
    const [newCategory, setNewCategory] = useState<'Oficial' | 'Social' | 'Mantenimiento'>('Oficial')
    const [newDescription, setNewDescription] = useState('')

    // Announcements State
    const [announcements, setAnnouncements] = useState<Announcement[]>([
        { id: '1', title: 'Mantenimiento de Elevadores', description: 'Se realizará mantenimiento preventivo en el elevador B el próximo lunes de 9am a 2pm.', date: 'hace 2 horas', category: 'Mantenimiento', status: 'Nuevo' },
        { id: '2', title: 'Nueva Seguridad en Accesos', description: 'A partir de mañana, todos los invitados deberán presentar código QR generado desde la app.', date: 'ayer', category: 'Oficial', status: 'Leído' },
        { id: '3', title: 'Clases de Yoga', description: 'Invitamos a todos los residentes a las clases de yoga en el roof garden los sábados a las 8am.', date: 'hace 3 días', category: 'Social', status: 'Leído' }
    ])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handlePublish = () => {
        if (!newTitle || !newDescription) return

        if (editingId) {
            // Update existing
            setAnnouncements(announcements.map(ann => 
                ann.id === editingId 
                    ? { ...ann, title: newTitle, description: newDescription, category: newCategory }
                    : ann
            ))
        } else {
            // Create new
            const newAnn: Announcement = {
                id: Date.now().toString(),
                title: newTitle,
                description: newDescription,
                date: 'hace un momento',
                category: newCategory,
                status: 'Nuevo'
            }
            setAnnouncements([newAnn, ...announcements])
        }
        
        // Reset Form
        setNewTitle('')
        setNewDescription('')
        setNewCategory('Oficial')
        setSelectedFile(null)
        setEditingId(null)
        setShowNewModal(false)
    }

    const handleDelete = (id: string) => {
        setAnnouncements(announcements.filter(ann => ann.id !== id))
    }

    const handleEdit = (ann: Announcement) => {
        setNewTitle(ann.title)
        setNewDescription(ann.description)
        setNewCategory(ann.category)
        setEditingId(ann.id)
        setShowNewModal(true)
    }

    const packages: PackageDelivery[] = [
        { id: '1', resident: 'Juan Pérez', unit: 'A-101', carrier: 'Amazon', date: 'hoy, 2:30 PM', status: 'En espera', qrCode: 'PKG-123456' },
        { id: '2', resident: 'María García', unit: 'B-304', carrier: 'Mercado Libre', date: 'hoy, 11:15 AM', status: 'Entregado', qrCode: 'PKG-789012' }
    ]

    const accessCodes: AccessCode[] = [
        { id: '1', guest: 'Carlos Rodríguez', type: 'Invitado', validUntil: 'hoy, 11:59 PM', qrCode: 'ACC-VO782' },
        { id: '2', guest: 'Limpieza Pro', type: 'Servicio', validUntil: 'mañana, 05:00 PM', qrCode: 'ACC-SP112' }
    ]

    const amenityReservations: AmenityReservation[] = [
        { id: '1', resident: 'Carlos Mendoza', unit: 'C-204', amenity: 'Salón de Fiestas', date: '28 Mar, 2024', time: '16:00 - 22:00', status: 'Confirmado', price: '$1,500' },
        { id: '2', resident: 'Ana Sofía Ruiz', unit: 'A-102', amenity: 'Alberca / BBQ', date: '27 Mar, 2024', time: '11:00 - 15:00', status: 'Pendiente', price: '$500' },
        { id: '3', resident: 'Roberto Gómez', unit: 'B-501', amenity: 'Gimnasio (Privado)', date: 'Hoy', time: '18:00 - 19:30', status: 'Confirmado' },
    ]

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
                        Avisos y Operaciones
                    </h1>
                    <p className="text-zinc-500 text-sm md:text-base max-w-2xl font-medium">
                        Central de comunicación residente, gestión de paquetería segura y control de accesos inteligentes mediante códigos QR.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group hidden sm:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 h-4 w-4 transition-colors group-hover:text-zinc-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar avisos o registros..." 
                            className="h-11 w-64 bg-zinc-900/50 border border-zinc-800 rounded-xl pl-10 pr-4 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all"
                        />
                    </div>
                    <motion.button 
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setEditingId(null);
                            setNewTitle('');
                            setNewDescription('');
                            setNewCategory('Oficial');
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
                                                    ann.category === 'Oficial' ? 'bg-indigo-500/20 text-indigo-400' :
                                                    ann.category === 'Social' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    'bg-amber-500/20 text-amber-400'
                                                }`}>
                                                    {ann.category}
                                                </Badge>
                                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{ann.date}</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors leading-tight">
                                                {ann.title}
                                            </h3>
                                            <p className="text-zinc-500 text-sm leading-relaxed mb-6 line-clamp-3 font-medium">
                                                {ann.description}
                                            </p>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                                                <button className="flex items-center gap-2 text-zinc-500 hover:text-white text-xs font-bold transition-all">
                                                    Leer más <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                                </button>
                                                
                                                <div className="flex items-center gap-2">
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleEdit(ann)}
                                                        className="p-2 bg-zinc-800/50 hover:bg-indigo-500/20 text-zinc-500 hover:text-indigo-400 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={14} />
                                                    </motion.button>
                                                    <motion.button 
                                                        whileHover={{ scale: 1.1 }}
                                                        whileTap={{ scale: 0.9 }}
                                                        onClick={() => handleDelete(ann.id)}
                                                        className="p-2 bg-zinc-800/50 hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </motion.button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}

                            {/* Amenities Reservations Grid */}
                            {activeTab === 'amenities' && amenityReservations.map((res, index) => (
                                <motion.div
                                    key={res.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="bg-zinc-900/40 border-zinc-800 hover:border-emerald-500/50 transition-all duration-300 group overflow-hidden">
                                        <CardContent className="p-0">
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="h-12 w-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all">
                                                        {res.amenity === 'Salón de Fiestas' ? <PartyPopper size={24} /> : 
                                                         res.amenity.includes('Alberca') ? <Waves size={24} /> : 
                                                         <Dumbbell size={24} />}
                                                    </div>
                                                    <Badge className={`px-2.5 py-1 rounded-lg border-0 font-bold text-[10px] uppercase tracking-tighter ${
                                                        res.status === 'Confirmado' ? 'bg-emerald-500/20 text-emerald-500' :
                                                        res.status === 'Pendiente' ? 'bg-amber-500/20 text-amber-500' :
                                                        'bg-zinc-800 text-zinc-500'
                                                    }`}>
                                                        {res.status}
                                                    </Badge>
                                                </div>
                                                
                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{res.amenity}</h3>
                                                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-4 font-medium">
                                                    <Calendar size={12} /> {res.date} • <Clock size={12} /> {res.time}
                                                </div>

                                                <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                                                    <div className="h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                                                        {res.resident.split(' ').map(n=>n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-zinc-300">{res.resident}</p>
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{res.unit}</p>
                                                    </div>
                                                    {res.price && (
                                                        <div className="ml-auto text-xs font-black text-emerald-500">
                                                            {res.price}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="px-6 py-3 bg-zinc-800/20 border-t border-zinc-800/50 flex justify-between items-center">
                                                <button className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors tracking-tighter">
                                                    Ver Detalles
                                                </button>
                                                <div className="flex gap-2">
                                                    <button className="h-7 w-7 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                                                        <CheckCircle2 size={14} />
                                                    </button>
                                                    <button className="h-7 w-7 bg-zinc-800 rounded-md flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'amenities' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {amenityReservations.map((res, index) => (
                                <motion.div
                                    key={res.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <Card className="bg-zinc-900/40 border-zinc-800 hover:border-emerald-500/50 transition-all duration-300 group overflow-hidden shadow-2xl shadow-emerald-950/5">
                                        <CardContent className="p-0">
                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="h-12 w-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-all">
                                                        {res.amenity === 'Salón de Fiestas' ? <PartyPopper size={24} /> : 
                                                         res.amenity.includes('Alberca') ? <Waves size={24} /> : 
                                                         <Dumbbell size={24} />}
                                                    </div>
                                                    <Badge className={`px-2.5 py-1 rounded-lg border-0 font-bold text-[10px] uppercase tracking-tighter ${
                                                        res.status === 'Confirmado' ? 'bg-emerald-500/20 text-emerald-500' :
                                                        res.status === 'Pendiente' ? 'bg-amber-500/20 text-amber-500' :
                                                        'bg-zinc-800 text-zinc-500'
                                                    }`}>
                                                        {res.status}
                                                    </Badge>
                                                </div>
                                                
                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{res.amenity}</h3>
                                                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-4 font-medium">
                                                    <Calendar size={12} /> {res.date} • <Clock size={12} /> {res.time}
                                                </div>

                                                <div className="flex items-center gap-3 p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50 group-hover:bg-zinc-900 transition-colors">
                                                    <div className="h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-zinc-700">
                                                        {res.resident.split(' ').map(n=>n[0]).join('')}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-zinc-300">{res.resident}</p>
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{res.unit}</p>
                                                    </div>
                                                    {res.price && (
                                                        <div className="ml-auto text-xs font-black text-emerald-500">
                                                            {res.price}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="px-6 py-4 bg-zinc-800/20 border-t border-zinc-800/50 flex justify-between items-center group-hover:bg-zinc-800/40 transition-colors">
                                                <button className="text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-colors tracking-tighter flex items-center gap-1.5 group/btn">
                                                    Ver Detalles <ArrowRight size={10} className="group-hover/btn:translate-x-0.5 transition-transform" />
                                                </button>
                                                <div className="flex gap-2">
                                                    <button className="h-8 w-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-zinc-700 hover:border-emerald-500/30 shadow-lg">
                                                        <CheckCircle2 size={15} />
                                                    </button>
                                                    <button className="h-8 w-8 bg-zinc-800 rounded-lg flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all border border-zinc-700 hover:border-rose-500/30 shadow-lg">
                                                        <X size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'packages' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {packages.map((pkg, i) => (
                                    <Card key={pkg.id} className="bg-zinc-900/40 border-zinc-800 hover:border-amber-500/30 transition-all overflow-hidden relative group">
                                         <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Package size={80} className="text-amber-500/5" aria-hidden="true" />
                                         </div>
                                         <CardContent className="p-0 flex flex-col sm:flex-row h-full">
                                            <div className="p-6 flex-1 space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                                        <Package size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-zinc-500 font-bold uppercase">Paquete {pkg.carrier}</p>
                                                        <h4 className="text-lg font-bold text-white tracking-tight">{pkg.resident}</h4>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4 pt-2">
                                                    <div>
                                                        <p className="text-[10px] uppercase text-zinc-600 font-bold mb-1">Unidad</p>
                                                        <p className="text-zinc-300 font-semibold text-sm">{pkg.unit}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] uppercase text-zinc-600 font-bold mb-1">Llegada</p>
                                                        <p className="text-zinc-300 font-semibold text-sm truncate">{pkg.date}</p>
                                                    </div>
                                                </div>

                                                <div className="pt-4 flex items-center gap-2">
                                                    <Badge className={`${
                                                        pkg.status === 'En espera' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                                                    } border-0 rounded-lg px-3 py-1 font-bold`}>
                                                        {pkg.status}
                                                    </Badge>
                                                    <div className="flex-1" />
                                                    <Button 
                                                        onClick={() => setShowQRModal(pkg.qrCode)}
                                                        variant="ghost" 
                                                        className="text-zinc-400 hover:bg-zinc-800 hover:text-white h-9 px-3 gap-2 text-xs font-bold"
                                                    >
                                                        <QrCode size={14} /> Ver QR
                                                    </Button>
                                                </div>
                                            </div>
                                         </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'access' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {accessCodes.map((code) => (
                                <Card key={code.id} className="bg-zinc-950/40 border-zinc-800/80 hover:border-emerald-500/40 transition-all group relative overflow-hidden ring-1 ring-zinc-900">
                                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                                                <Users size={18} />
                                            </div>
                                            <Badge className="bg-emerald-500/10 text-emerald-500 border-0 font-bold text-[10px] tracking-widest uppercase px-3 py-1 rounded-full">
                                                {code.type}
                                            </Badge>
                                        </div>
                                        <h4 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{code.guest}</h4>
                                        <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium mb-6">
                                            <Calendar size={12} className="text-emerald-500/60" /> Válido hasta: <span className="text-zinc-300 font-bold">{code.validUntil}</span>
                                        </div>
                                        
                                        <div className="pt-5 border-t border-zinc-900 flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-zinc-600 font-black uppercase">Clave Única</span>
                                                <span className="text-zinc-300 font-mono font-bold tracking-widest">{code.qrCode}</span>
                                            </div>
                                            <Button 
                                                onClick={() => setShowQRModal(code.qrCode)}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg h-10 w-10 p-0 shadow-lg shadow-emerald-950"
                                            >
                                                <QrCode size={18} />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
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

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Título del Anuncio</label>
                                        <input 
                                            value={newTitle}
                                            onChange={(e) => setNewTitle(e.target.value)}
                                            placeholder="Ej. Mantenimiento del Roof Garden"
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Categoría</label>
                                        <select 
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value as any)}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium appearance-none"
                                        >
                                            <option value="Oficial">Oficial</option>
                                            <option value="Mantenimiento">Mantenimiento</option>
                                            <option value="Social">Social</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Descripción</label>
                                        <textarea 
                                            value={newDescription}
                                            onChange={(e) => setNewDescription(e.target.value)}
                                            rows={3}
                                            placeholder="Escribe aquí los detalles del anuncio para los residentes..."
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500/50 transition-all font-medium resize-none"
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
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handlePublish}
                                        className="flex-1 h-12 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl shadow-xl shadow-orange-900/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Bell size={18} /> Publicar Anuncio
                                    </motion.button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
