'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Camera, Mail, Phone, MapPin, User, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { normalizeMexicanPhone } from '@/utils/phone-utils'

export default function ResidentProfileClient({ user, initialResident }: { user: any, initialResident: any }) {
    const [loading, setLoading] = useState(false)
    const [resident, setResident] = useState(initialResident || {})
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Mock avatar state from local storage or previous session could be added here

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Create local preview
            const objectUrl = URL.createObjectURL(file)
            setAvatarUrl(objectUrl)
            // in a real app, we would upload to Supabase Storage here
            // toast.success("Foto de perfil actualizada (Vista previa)")
            alert("Foto de perfil actualizada (Vista previa)")
        }
    }

    const handleSave = async () => {
        setLoading(true)

        // Normalize phone number
        const normalizedPhone = normalizeMexicanPhone(resident.phone || '')
        const updatedResident = { ...resident, phone: normalizedPhone }
        setResident(updatedResident)

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000))
        setLoading(false)
        // In real app: Update residents table
        // await supabase.from('residents').update(updatedResident).eq('id', resident.id)
        alert("Cambios guardados correctamente")
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 py-4">

            {/* Hero Section with Cover */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative group rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900/50 shadow-2xl"
            >
                {/* Cover Gradient */}
                <div className="h-48 w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-zinc-900 opacity-80" />
                <div className="absolute top-0 inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]" />

                <div className="px-8 pb-8 flex flex-col md:flex-row items-end md:items-center gap-6 -mt-12 relative z-10">
                    {/* Avatar Upload */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        className="relative group/avatar"
                    >
                        <div
                            onClick={handleAvatarClick}
                            className="h-32 w-32 rounded-3xl border-4 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden cursor-pointer shadow-xl"
                        >
                            {avatarUrl ? (
                                <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-12 w-12 text-zinc-500" />
                            )}

                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-sm">
                                <Camera className="h-8 w-8 text-white" />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <div className="absolute bottom-2 right-2 h-4 w-4 rounded-full bg-emerald-500 border-2 border-zinc-950 shadow-sm"></div>
                    </motion.div>

                    <div className="flex-1 pb-2">
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-white tracking-tight">
                                {resident?.first_name ? `${resident.first_name} ${resident.last_name || ''}` : 'Residente'}
                            </h1>
                            <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20 transition-colors">
                                Residente Verificado
                            </Badge>
                        </div>
                        <p className="text-zinc-400 flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4" /> {user.email}
                        </p>
                    </div>

                    <div className="flex gap-3 pb-2 w-full md:w-auto">
                        <Button className="flex-1 md:flex-none bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all hover:-translate-y-0.5" onClick={handleSave} disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </motion.div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Left Column: Contact Info */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="md:col-span-2 space-y-6"
                >
                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 hover:bg-zinc-900/80 hover:border-indigo-500/30 transition-all shadow-lg hover:shadow-indigo-500/5"
                    >
                        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <User className="h-5 w-5 text-indigo-400" /> Información Personal
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Nombre(s)</Label>
                                <Input
                                    defaultValue={resident?.first_name || ''}
                                    className="bg-zinc-950/50 border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-zinc-950"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Apellido(s)</Label>
                                <Input
                                    defaultValue={resident?.last_name || ''}
                                    className="bg-zinc-950/50 border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-zinc-950"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Teléfono</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                    <Input
                                        defaultValue={resident?.phone || ''}
                                        className="pl-9 bg-zinc-950/50 border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-zinc-950"
                                        placeholder="+52 (55) 1234-5678"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Correo Electrónico</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                    <Input
                                        value={user.email}
                                        disabled
                                        className="pl-9 bg-zinc-950/20 border-zinc-800 text-zinc-500 cursor-not-allowed rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        variants={itemVariants}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                        className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-6 hover:bg-zinc-900/80 hover:border-emerald-500/30 transition-all shadow-lg hover:shadow-emerald-500/5"
                    >
                        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-emerald-400" /> Detalle de Residencia
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 group hover:border-emerald-500/20 transition-colors">
                                <p className="text-sm text-zinc-500 mb-1">Condominio</p>
                                <p className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors">Torre Reforma</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 group hover:border-emerald-500/20 transition-colors">
                                <p className="text-sm text-zinc-500 mb-1">Unidad / Depto</p>
                                <p className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors">A-101</p>
                            </div>
                            <div className="md:col-span-2 p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 flex items-center justify-between group hover:border-emerald-500/20 transition-colors">
                                <div>
                                    <p className="text-sm text-zinc-500 mb-1">Estado de Cuenta</p>
                                    <p className="text-base font-medium text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> Al Corriente
                                    </p>
                                </div>
                                <Button variant="ghost" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 rounded-xl">Ver Finanzas</Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                {/* Right Column: Stats & Settings */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-6"
                >
                    {/* Account Status */}
                    <motion.div
                        whileHover={{ y: -4, scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-indigo-950/20 p-6 text-center shadow-lg hover:shadow-indigo-500/10 cursor-pointer group"
                    >
                        <div className="mx-auto h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400 ring-1 ring-indigo-500/30 transition-all group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-300">
                            <User className="h-10 w-10" />
                        </div>
                        <h3 className="text-lg font-medium text-white group-hover:text-indigo-300 transition-colors">Cuenta Activa</h3>
                        <p className="text-sm text-zinc-400 mt-2 group-hover:text-zinc-300 transition-colors">
                            Miembro desde Febrero 2026
                        </p>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    )
}
