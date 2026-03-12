'use client'

import { motion } from 'framer-motion'
import { 
    Search, 
    Headphones, 
    MessageSquare, 
    Phone, 
    Mail, 
    Info,
    ArrowRight,
    HelpCircle,
    Lightbulb,
    LifeBuoy
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface ResidentHelpClientProps {
    user: any
}

export default function ResidentHelpClient({ user }: ResidentHelpClientProps) {
    const admin = {
        name: 'Mauricio Gómez',
        phone: '55 5555 5555',
        email: 'mauricio@administrador.com',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=256&h=256&auto=format&fit=crop'
    }

    return (
        <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10 animate-in fade-in duration-500">
            {/* Page Title */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-400 tracking-tight">Ayuda</h1>
            </div>

            {/* Hero Section */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-[#1a1c2e] to-indigo-950/40 border border-zinc-800 rounded-[2.5rem] p-10 md:p-16 shadow-2xl group"
            >
                <div className="absolute top-0 right-0 -m-20 h-96 w-96 bg-blue-600/10 rounded-full blur-[100px] group-hover:bg-blue-600/20 transition-colors duration-700" />
                
                <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
                    <div className="space-y-6 max-w-2xl text-center lg:text-left">
                        <motion.h2 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-6xl font-black text-white tracking-tighter"
                        >
                            Ayuda
                        </motion.h2>
                        <motion.p 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-2xl font-medium text-zinc-400"
                        >
                            ¿Necesitas ayuda? Estamos aquí para asistirte.
                        </motion.p>
                    </div>

                    {/* Support Illustration - 3D Mockup style */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ 
                            type: "spring",
                            stiffness: 100,
                            damping: 20,
                            delay: 0.2
                        }}
                        className="relative h-64 w-64 md:h-80 md:w-80 group-hover:scale-105 transition-transform duration-500"
                    >
                        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
                        <div className="relative h-full w-full flex items-center justify-center">
                            {/* Representative complex shapes for the documents and question marks in the mockup */}
                            <div className="relative w-full h-full flex items-center justify-center">
                                <motion.div 
                                    animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
                                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute z-20 bg-zinc-800 rounded-3xl border border-zinc-700 p-6 shadow-2xl h-48 w-40 flex flex-col gap-4 transform -rotate-12 translate-x-10 translate-y-4"
                                >
                                    <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                        <HelpCircle className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-2 w-full bg-zinc-700 rounded" />
                                        <div className="h-2 w-3/4 bg-zinc-700 rounded" />
                                        <div className="h-2 w-1/2 bg-zinc-700 rounded" />
                                    </div>
                                </motion.div>
                                <motion.div 
                                    animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
                                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute z-10 bg-indigo-600/20 backdrop-blur-md rounded-3xl border border-indigo-500/30 p-6 shadow-2xl h-56 w-44 flex flex-col gap-4 transform rotate-6 -translate-x-10 -translate-y-4"
                                >
                                    <div className="h-12 w-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-300">
                                        <LifeBuoy className="h-7 w-7" />
                                    </div>
                                    <div className="space-y-3 pt-4">
                                        <div className="h-2 w-full bg-white/10 rounded" />
                                        <div className="h-2 w-full bg-white/10 rounded" />
                                        <div className="h-2 w-2/3 bg-white/10 rounded" />
                                    </div>
                                </motion.div>
                                
                                <HelpCircle className="absolute -top-4 -right-4 h-16 w-16 text-zinc-700/50 animate-bounce" />
                                <HelpCircle className="absolute top-12 -left-8 h-12 w-12 text-zinc-700/30 animate-pulse" />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Support Actions Grid */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4"
            >
                {/* Help Center Card */}
                <motion.div 
                    whileHover={{ 
                        y: -12, 
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 300, damping: 15 }
                    }}
                    className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-[3rem] p-10 shadow-xl relative overflow-hidden group/card"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.05] to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />
                    <div className="space-y-8 relative z-10">
                        <div className="flex items-center gap-5">
                            <motion.div 
                                whileHover={{ rotate: 15, scale: 1.1 }}
                                className="h-14 w-14 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center transition-all"
                            >
                                <Search className="h-7 w-7" />
                            </motion.div>
                            <h3 className="text-2xl font-black text-white">Centro de ayuda</h3>
                        </div>
                        <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                            Encuentra artículos y preguntas frecuentes para resolver tus dudas rápidamente.
                        </p>
                        <motion.div whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 400 }}>
                            <Button className="bg-blue-600 hover:bg-blue-500 text-white h-14 px-8 rounded-2xl text-lg font-bold shadow-lg shadow-blue-600/20 flex items-center gap-3 transition-all">
                                <Search className="h-5 w-5" />
                                Buscar respuestas
                                <ArrowRight className="h-5 w-5 group-hover/card:translate-x-2 transition-transform" />
                            </Button>
                        </motion.div>
                    </div>
                </motion.div>

                {/* Technical Support Card */}
                <motion.div 
                    whileHover={{ 
                        y: -12, 
                        scale: 1.02,
                        transition: { type: "spring", stiffness: 300, damping: 15 }
                    }}
                    className="bg-zinc-900/40 backdrop-blur-sm border border-zinc-800/50 rounded-[3rem] p-10 shadow-xl relative overflow-hidden group/support"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.05] to-transparent opacity-0 group-hover/support:opacity-100 transition-opacity duration-500" />
                    <div className="space-y-8 relative z-10">
                        <div className="flex items-center gap-5">
                            <motion.div 
                                whileHover={{ rotate: -15, scale: 1.1 }}
                                className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center transition-all"
                            >
                                <Headphones className="h-7 w-7" />
                            </motion.div>
                            <h3 className="text-2xl font-black text-white">Soporte técnico</h3>
                        </div>
                        <p className="text-zinc-400 text-lg font-medium leading-relaxed">
                            Contacta a nuestro equipo de soporte técnico para problemas con la plataforma.
                        </p>
                        <motion.div whileHover={{ x: 5 }} transition={{ type: "spring", stiffness: 400 }}>
                            <Button variant="secondary" className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-14 px-8 rounded-2xl text-lg font-bold border border-zinc-700 group-hover/support:text-white transition-all flex items-center gap-3">
                                <Headphones className="h-5 w-5" />
                                Contactar soporte
                            </Button>
                        </motion.div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Administrator Contact Section */}
            <div className="space-y-8 pt-8">
                <h2 className="text-2xl font-bold text-white tracking-tight">Contáctanos</h2>
                <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-[3rem] p-10 md:p-14 shadow-2xl relative overflow-hidden group/bottom"
                >
                    <div className="absolute -bottom-20 -right-20 h-96 w-96 bg-indigo-600/5 rounded-full blur-[100px]" />
                    
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
                        {/* Admin Info */}
                        <div className="flex flex-col sm:flex-row items-center gap-8 w-full lg:w-auto">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="relative h-28 w-28 rounded-3xl overflow-hidden ring-4 ring-indigo-500/20 shadow-2xl flex-shrink-0"
                            >
                                <img 
                                    src={admin.avatar} 
                                    alt={admin.name}
                                    className="h-full w-full object-cover"
                                />
                            </motion.div>
                            <div className="space-y-6 text-center sm:text-left">
                                <div className="space-y-1">
                                    <h4 className="text-4xl font-black text-white tracking-tight">{admin.name}</h4>
                                    <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-lg font-bold uppercase tracking-widest text-[10px]">
                                        Administrador Global
                                    </Badge>
                                </div>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center justify-center sm:justify-start gap-4 text-zinc-400 group cursor-pointer transition-colors hover:text-white">
                                        <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg group-hover:shadow-indigo-500/20">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <span className="text-xl font-bold tracking-tight">{admin.phone}</span>
                                    </div>
                                    <div className="flex items-center justify-center sm:justify-start gap-4 text-zinc-400 group cursor-pointer transition-colors hover:text-white">
                                        <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 group-hover:bg-indigo-500 group-hover:text-white transition-all shadow-lg group-hover:shadow-indigo-500/20">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <span className="text-xl font-bold tracking-tight">{admin.email}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Suggestions CTA */}
                        <motion.div 
                            whileHover={{ y: -5, scale: 1.01 }}
                            className="bg-zinc-950/40 backdrop-blur-xl border border-zinc-800/50 rounded-[2.5rem] p-10 space-y-8 w-full lg:w-[480px] shadow-2xl relative overflow-hidden group/cta flex flex-col justify-between"
                        >
                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover/cta:opacity-10 transition-opacity">
                                <Lightbulb className="h-32 w-32 text-amber-400" />
                            </div>
                            
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="h-10 w-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500">
                                    <Lightbulb className="h-6 w-6" />
                                </div>
                                <p className="text-zinc-300 text-lg font-bold tracking-tight">
                                    Envíanos ideas y sugerencias nuevas
                                </p>
                            </div>

                            <div className="flex gap-4 relative z-10">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                                    <Button className="w-full bg-zinc-800 hover:bg-emerald-600 text-white h-14 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-emerald-500/20">
                                        <Phone className="h-5 w-5" />
                                        Llamar
                                    </Button>
                                </motion.div>
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                                    <Button className="w-full bg-[#25D366] hover:bg-[#20bd5c] text-white h-14 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#25D366]/20">
                                        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.551 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                        </svg>
                                        Enviar mensaje
                                    </Button>
                                </motion.div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
