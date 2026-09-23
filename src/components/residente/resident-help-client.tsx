'use client'

import { motion } from 'framer-motion'
import {
    Phone,
    Mail,
    HelpCircle,
    LifeBuoy,
    User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ContactInmobiGoCard } from '@/components/shared/ContactInmobiGoCard'
import { normalizeMexicanPhone } from '@/utils/phone-utils'
import { ResidentMessageThread } from '@/components/residente/resident-message-thread'

interface AdminContact {
    name: string
    phone: string | null
    email: string | null
    avatarUrl: string | null
}

interface ResidentHelpClientProps {
    user: any
    isAdmin: boolean
    organizationName?: string | null
    adminName: string
    adminPhone?: string | null
    adminContact?: AdminContact | null
}

export default function ResidentHelpClient({ user, isAdmin, organizationName, adminName, adminPhone, adminContact }: ResidentHelpClientProps) {
    const handleContactAdmin = () => {
        if (!adminContact) return
        if (adminContact.phone) {
            window.open(`https://wa.me/${normalizeMexicanPhone(adminContact.phone)}`, '_blank')
        } else if (adminContact.email) {
            window.location.href = `mailto:${adminContact.email}`
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-10 p-6 md:p-10 animate-in fade-in duration-500">
            {/* Page Title */}
            <div>
                <h1 className="text-3xl font-bold text-zinc-400 tracking-tight">Contacto</h1>
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
                            Contacto
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-2xl font-medium text-zinc-400"
                        >
                            Escríbele directo a tu administrador, cuando lo necesites.
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

            {/* Contact Section */}
            <div className="space-y-8 pt-4">
                <h2 className="text-2xl font-bold text-white tracking-tight">Contáctanos</h2>

                {isAdmin ? (
                    <ContactInmobiGoCard
                        organizationName={organizationName}
                        adminName={adminName}
                        adminPhone={adminPhone}
                    />
                ) : adminContact ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-zinc-900/40 backdrop-blur-md border-2 border-indigo-500/30 rounded-[3rem] p-10 md:p-14 shadow-2xl relative overflow-hidden group/bottom"
                    >
                        <div className="absolute -bottom-20 -right-20 h-96 w-96 bg-indigo-600/5 rounded-full blur-[100px]" />

                        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
                            {/* Admin Info */}
                            <div className="flex flex-col sm:flex-row items-center gap-8 w-full lg:w-auto">
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className="relative h-28 w-28 rounded-3xl overflow-hidden ring-4 ring-indigo-500/20 shadow-2xl flex-shrink-0 bg-zinc-800 flex items-center justify-center"
                                >
                                    {adminContact.avatarUrl ? (
                                        <img
                                            src={adminContact.avatarUrl}
                                            alt={adminContact.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <User className="h-12 w-12 text-zinc-500" />
                                    )}
                                </motion.div>
                                <div className="space-y-6 text-center sm:text-left">
                                    <div className="space-y-1">
                                        <h4 className="text-4xl font-black text-white tracking-tight">{adminContact.name}</h4>
                                        <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-lg font-bold uppercase tracking-widest text-[10px]">
                                            Administrador
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        {adminContact.phone && (
                                            <div className="flex items-center justify-center sm:justify-start gap-4 text-zinc-400">
                                                <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 shadow-lg">
                                                    <Phone className="h-5 w-5" />
                                                </div>
                                                <span className="text-xl font-bold tracking-tight">{adminContact.phone}</span>
                                            </div>
                                        )}
                                        {adminContact.email && (
                                            <div className="flex items-center justify-center sm:justify-start gap-4 text-zinc-400">
                                                <div className="h-10 w-10 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-300 shadow-lg">
                                                    <Mail className="h-5 w-5" />
                                                </div>
                                                <span className="text-xl font-bold tracking-tight">{adminContact.email}</span>
                                            </div>
                                        )}
                                        {!adminContact.phone && !adminContact.email && (
                                            <p className="text-sm text-zinc-600 italic">Sin datos de contacto disponibles</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Chat directo con el administrador */}
                            <motion.div
                                whileHover={{ y: -3 }}
                                className="bg-zinc-950/40 backdrop-blur-xl border-2 border-emerald-500/30 rounded-[2.5rem] p-8 w-full lg:w-[480px] shadow-2xl relative overflow-hidden flex flex-col"
                            >
                                <ResidentMessageThread adminName={adminContact.name} />

                                {adminContact.phone && (
                                    <Button
                                        onClick={handleContactAdmin}
                                        variant="ghost"
                                        className="w-full mt-3 h-11 rounded-2xl font-bold flex items-center justify-center gap-2 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]"
                                    >
                                        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.551 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                                        </svg>
                                        O contáctalo por WhatsApp
                                    </Button>
                                )}
                            </motion.div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[3rem] p-10 text-center text-zinc-500">
                        Tu condominio aún no tiene un administrador con datos de contacto registrados.
                    </div>
                )}
            </div>
        </div>
    )
}
