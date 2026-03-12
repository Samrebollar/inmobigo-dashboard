'use client'

import { motion } from 'framer-motion'
import { 
    Home, 
    User, 
    Phone, 
    Mail, 
    Maximize2, 
    Car, 
    Bell,
    Building2,
    MessageSquare,
    ShieldCheck,
    MapPin,
    ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Image from 'next/image'

interface ResidentPropertyClientProps {
    resident: any
}

export default function ResidentPropertyClient({ resident }: ResidentPropertyClientProps) {
    const admin = {
        name: 'Mauricio Gómez',
        phone: '55 5555 5555',
        email: 'mauricio@administrador.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop'
    }

    const unitInfo = {
        name: resident?.first_name ? `${resident.first_name} ${resident.last_name || ''}` : 'Carlos Mendoza',
        role: 'Propietario',
        surface: '85 m²',
        parking: '2 lugares asignados',
        unitNumber: resident?.units?.unit_number || 'A-101',
        condoName: resident?.condominiums?.name || 'Torre Reforma'
    }

    return (
        <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10 animate-in fade-in duration-500">
            {/* Page Header */}
            <div>
                <h1 className="text-4xl font-black text-white tracking-tight">Mi Propiedad</h1>
            </div>

            {/* Building Hero Section */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white">{unitInfo.condoName}</h2>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-[#1a1c2e] to-indigo-950/40 border border-zinc-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl group"
                >
                    <div className="absolute top-0 right-0 -m-20 h-96 w-96 bg-blue-600/10 rounded-full blur-[100px] group-hover:bg-blue-600/20 transition-colors duration-700" />
                    <div className="absolute bottom-0 left-0 -m-20 h-64 w-64 bg-indigo-600/10 rounded-full blur-[80px]" />
                    
                    <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                        {/* Illustration Placeholder - Representing the building tower in mockup */}
                        <div className="relative flex-shrink-0">
                            <motion.div
                                animate={{ y: [0, -10, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                className="relative h-64 w-64 md:h-80 md:w-80"
                            >
                                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                                <div className="relative h-full w-full bg-zinc-800/50 rounded-3xl border border-zinc-700/50 overflow-hidden flex items-center justify-center p-6 shadow-2xl backdrop-blur-md transition-all group-hover:border-indigo-500/30">
                                    <div className="relative h-full w-full flex flex-col gap-2">
                                        {/* Simple architectural shapes representing the towers in the mockup */}
                                        <div className="flex items-end justify-center gap-4 h-full">
                                            <div className="w-16 h-3/4 bg-zinc-700 rounded-t-lg relative overflow-hidden">
                                                <div className="absolute inset-0 flex flex-col gap-2 p-2">
                                                    {[...Array(6)].map((_, i) => (
                                                        <div key={i} className="h-2 w-full bg-zinc-600/50 rounded-sm" />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="w-20 h-full bg-blue-600/20 rounded-t-lg border-x border-t border-blue-500/30 relative overflow-hidden group-hover:bg-blue-600/40 transition-colors">
                                                 <div className="absolute inset-x-0 top-0 h-4 bg-blue-500/40" />
                                                 <div className="absolute inset-0 flex flex-col gap-3 p-3 pt-6">
                                                    {[...Array(8)].map((_, i) => (
                                                        <div key={i} className="h-2 w-full bg-blue-400/20 rounded-sm" />
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="w-12 h-2/3 bg-zinc-700 rounded-t-lg relative overflow-hidden">
                                                <div className="absolute inset-0 flex flex-col gap-2 p-2">
                                                    {[...Array(5)].map((_, i) => (
                                                        <div key={i} className="h-2 w-full bg-zinc-600/50 rounded-sm" />
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-4">
                            <motion.h3 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-6xl font-black text-white tracking-tighter"
                            >
                                {unitInfo.condoName}
                            </motion.h3>
                            <motion.p 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-2xl font-bold text-zinc-400"
                            >
                                Departamento {unitInfo.unitNumber}
                            </motion.p>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-wrap justify-center md:justify-start gap-4 pt-6"
                            >
                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/5">
                                    <ShieldCheck className="h-4 w-4 mr-2" />
                                    Acceso activo
                                </Badge>
                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/5">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    CDMX, México
                                </Badge>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Info Grid: Administrator & Unit Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Administrator Card */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <User className="h-6 w-6 text-indigo-400" />
                        Administrador
                    </h2>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group/admin"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-transparent opacity-0 group-hover/admin:opacity-100 transition-opacity" />
                        
                        <div className="flex items-center gap-8 relative z-10">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative h-24 w-24 rounded-3xl overflow-hidden ring-4 ring-indigo-500/20 shadow-2xl"
                            >
                                <img 
                                    src={admin.avatar} 
                                    alt={admin.name}
                                    className="h-full w-full object-cover"
                                />
                            </motion.div>
                            <div className="flex-1 space-y-1">
                                <h4 className="text-3xl font-black text-white group-hover/admin:text-indigo-400 transition-colors">{admin.name}</h4>
                                <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-xl font-bold uppercase tracking-widest text-[10px]">
                                    Administrador
                                </Badge>
                            </div>
                        </div>

                        <div className="mt-10 space-y-5 relative z-10">
                            <motion.div 
                                whileHover={{ x: 5 }}
                                className="flex items-center gap-5 text-zinc-400 group cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="h-12 w-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <span className="text-xl font-bold">{admin.phone}</span>
                            </motion.div>
                            <motion.div 
                                whileHover={{ x: 5 }}
                                className="flex items-center gap-5 text-zinc-400 group cursor-pointer hover:text-white transition-colors"
                            >
                                <div className="h-12 w-12 rounded-2xl bg-zinc-800/50 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <span className="text-xl font-bold">{admin.email}</span>
                            </motion.div>
                        </div>

                        <motion.div 
                            className="mt-10 relative z-10"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white h-16 rounded-2xl text-xl font-black shadow-xl shadow-blue-600/20 flex items-center justify-center gap-4 relative overflow-hidden group/btn">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] transition-transform" />
                                <MessageSquare className="h-6 w-6" />
                                Contactar
                                <ArrowRight className="h-6 w-6 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </motion.div>
                    </motion.div>
                </div>

                {/* Unit Information Card */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-indigo-400" />
                        Información de la Unidad
                    </h2>
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        whileHover={{ y: -8, scale: 1.02 }}
                        className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group/unit"
                    >
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover/unit:opacity-10 transition-opacity duration-700">
                            <Building2 className="h-48 w-48 text-indigo-400" />
                        </div>

                        <div className="space-y-10 relative z-10">
                            <motion.div whileHover={{ x: 10 }} className="flex items-center gap-6 group">
                                <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg shadow-indigo-500/5">
                                    <User className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] group-hover:text-indigo-300">Residente</p>
                                    <p className="text-2xl font-black text-white">{unitInfo.name}</p>
                                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5 font-black px-4">
                                        {unitInfo.role.toUpperCase()}
                                    </Badge>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ x: 10 }} className="flex items-center gap-6 group">
                                <div className="h-16 w-16 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all shadow-lg shadow-blue-500/5">
                                    <Maximize2 className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] group-hover:text-blue-300">Superficie:</p>
                                    <p className="text-3xl font-black text-white">{unitInfo.surface}</p>
                                </div>
                            </motion.div>

                            <motion.div whileHover={{ x: 10 }} className="flex items-center gap-6 group">
                                <div className="h-16 w-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shadow-lg shadow-amber-500/5">
                                    <Car className="h-8 w-8" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-zinc-500 font-bold text-xs uppercase tracking-[0.2em] group-hover:text-amber-300">Estacionamiento:</p>
                                    <p className="text-2xl font-black text-white">{unitInfo.parking}</p>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Bottom Tracker Section (Consistent across all pages) */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ y: -5, borderColor: 'rgba(79, 70, 229, 0.3)' }}
                className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl transition-all duration-300 group"
            >
                <div className="flex-1 w-full space-y-4 relative z-10">
                    <div className="flex justify-between items-center text-sm font-bold">
                        <span className="text-zinc-400 text-base">Tu próximo pago vence en <span className="text-amber-500 animate-pulse">5 días</span></span>
                        <span className="text-indigo-400">80% completado</span>
                    </div>
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden shadow-inner p-1">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '80%' }}
                            transition={{ duration: 1.5, ease: "easeOut", delay: 1 }}
                            className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-indigo-400 rounded-full shadow-[0_0_15px_rgba(79,70,229,0.4)]"
                        />
                    </div>
                </div>

                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button variant="outline" className="border-indigo-500/30 bg-indigo-500/5 text-indigo-300 font-black h-14 rounded-2xl flex items-center gap-3 px-8 hover:bg-indigo-600 hover:text-white transition-all shadow-lg group-hover:shadow-indigo-600/20">
                        <Bell className="h-5 w-5" />
                        Configurar recordatorio
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    )
}
