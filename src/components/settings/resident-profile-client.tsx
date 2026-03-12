'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Camera, Mail, Phone, MapPin, User, Save, Loader2, CheckCircle2, CreditCard, Zap, Calendar, ArrowRight } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { normalizeMexicanPhone } from '@/utils/phone-utils'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ResidentProfileClient({ 
    user, 
    initialResident, 
    profile,
    role = 'resident',
    subscription
}: { 
    user: any, 
    initialResident: any, 
    profile: any,
    role?: string,
    subscription?: any
}) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const isAdmin = role === 'admin'

    // Initialize state with default empty strings to prevent controlled/uncontrolled warnings
    const [resident, setResident] = useState(() => {
        const res = initialResident || {}
        // Priority for phones: Resident Record > User Metadata (for Admins)
        const phone = res.phone || user.user_metadata?.phone || ''
        
        // Priority for Names: Resident Record > User Metadata > Profile full_name
        const firstName = res.first_name || user.user_metadata?.first_name || ''
        const lastName = res.last_name || user.user_metadata?.last_name || ''

        if (!firstName && profile?.full_name) {
            const parts = profile.full_name.split(' ')
            return {
                first_name: parts[0] || '',
                last_name: parts.slice(1).join(' ') || '',
                phone: phone,
                ...res
            }
        }

        return {
            first_name: firstName,
            last_name: lastName,
            phone: phone,
            ...res
        }
    })

    const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setLoading(true)
            
            // Create a unique file path
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `avatars/${fileName}`

            // Upload to Supabase Storage
            const { error: uploadError, data } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            // Update profiles table
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            // ALSO update auth metadata for better sync with Layout
            const { error: authError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            })

            if (authError) console.error('Error updating auth metadata:', authError)

            setAvatarUrl(publicUrl)
            
            // Wait a bit for DB propagation before refreshing server components
            setTimeout(() => {
                router.refresh()
                alert("Foto de perfil actualizada correctamente")
            }, 800)
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            alert(`Error al subir imagen: ${error.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setLoading(true)

        try {
            // Normalize phone number
            const normalizedPhone = normalizeMexicanPhone(resident.phone || '')
            const updatedResident = { ...resident, phone: normalizedPhone }
            setResident(updatedResident)

            // Update residents table if they exist
            if (resident.id) {
                const { error } = await supabase
                    .from('residents')
                    .update({
                        first_name: resident.first_name,
                        last_name: resident.last_name,
                        phone: normalizedPhone
                    })
                    .eq('id', resident.id)
                
                if (error) throw error
            }

            // Also update profile table (full_name)
            const fullName = `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
            if (fullName) {
                const { error } = await supabase
                    .from('profiles')
                    .update({ full_name: fullName })
                    .eq('id', user.id)
                
                if (error) throw error
            }

            router.refresh()
            alert("Cambios guardados correctamente")
        } catch (error: any) {
            console.error('Error saving profile:', error)
            alert(`Error al guardar: ${error.message}`)
        } finally {
            setLoading(false)
        }
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

                {/* Status Badge - Top Right */}
                <div className="absolute top-6 right-8 z-20">
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="bg-zinc-950/40 backdrop-blur-xl border border-white/5 px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2"
                    >
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-zinc-100">
                            {isAdmin ? 'Administrador' : 'Residente'} <span className="text-indigo-400">Verificado</span>
                        </span>
                    </motion.div>
                </div>

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
                        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                            {resident?.first_name ? `${resident.first_name} ${resident.last_name || ''}` : isAdmin ? 'Administrador' : 'Residente'}
                        </h1>
                        <div className="flex flex-col gap-1">
                            <p className="text-zinc-400 flex items-center gap-2 text-sm">
                                <Mail className="h-4 w-4" /> {user.email}
                            </p>
                            <p className="text-zinc-400 flex items-center gap-2 text-sm">
                                <Phone className="h-4 w-4" /> {resident.phone || 'Sin teléfono'}
                            </p>
                        </div>
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
                                    value={resident?.first_name || ''}
                                    onChange={(e) => setResident({ ...resident, first_name: e.target.value })}
                                    className="bg-zinc-950/50 border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-zinc-950"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Apellido(s)</Label>
                                <Input
                                    value={resident?.last_name || ''}
                                    onChange={(e) => setResident({ ...resident, last_name: e.target.value })}
                                    className="bg-zinc-950/50 border-zinc-800 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl transition-all hover:bg-zinc-950"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-zinc-400">Teléfono</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
                                    <Input
                                        value={resident?.phone || ''}
                                        onChange={(e) => setResident({ ...resident, phone: e.target.value })}
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

                    {!isAdmin && (
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
                    )}
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
                        className="rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-indigo-950/20 p-6 text-center shadow-lg hover:shadow-indigo-500/10 cursor-pointer group h-full flex flex-col items-center justify-center min-h-[300px]"
                    >
                        <div className="mx-auto h-20 w-20 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 text-indigo-400 ring-1 ring-indigo-500/30 transition-all group-hover:scale-110 group-hover:bg-indigo-500/20 group-hover:text-indigo-300">
                            <User className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors">Cuenta Activa</h3>
                        <p className="text-sm text-zinc-400 mt-2 group-hover:text-zinc-300 transition-colors">
                            Miembro desde Febrero 2026
                        </p>
                        <Badge className="mt-6 bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-4 py-1">Premium User</Badge>
                    </motion.div>
                </motion.div>
            </div>

            {/* Plan Card (Full Width) */}
            <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="mt-8 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900/50 to-indigo-950/20 p-6 md:p-8 hover:bg-zinc-900/80 hover:border-indigo-500/30 transition-all shadow-lg hover:shadow-indigo-500/5"
            >
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-3">
                        <Zap className="h-6 w-6 text-amber-400" /> Mi Plan Actual
                    </h2>
                    {subscription ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">Activo</Badge>
                    ) : (
                        <Badge variant="outline" className="text-zinc-500 border-zinc-800 px-3 py-1">Modo Demo</Badge>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-8 lg:gap-12">
                    <div className="flex-1 space-y-6">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black mb-2">Plan contratado</p>
                            <h3 className="text-3xl font-black text-white">{subscription?.plan_name || 'InmobiGo Demo'}</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] text-zinc-500 uppercase font-black">Límite de Unidades</p>
                                <p className="text-lg font-bold text-zinc-200">{subscription?.unit_limit || '10'}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] text-zinc-500 uppercase font-black">Ciclo de Facturación</p>
                                <p className="text-lg font-bold text-zinc-200 capitalize">{subscription?.billing_cycle === 'yearly' ? 'Anual' : 'Mensual'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-px bg-zinc-800 hidden lg:block self-stretch mx-4" />

                    <div className="flex-1 space-y-6">
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black mb-2">Próximo pago proyectado</p>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-indigo-400" />
                                <p className="text-2xl font-black text-white">
                                    {subscription?.next_payment_date 
                                        ? format(parseISO(subscription.next_payment_date), 'd MMMM, yyyy', { locale: es })
                                        : 'No programado'}
                                </p>
                            </div>
                        </div>
                        <Link href="/dashboard/configuracion/planes" className="block w-full lg:w-auto">
                            <Button variant="outline" className="w-full border-zinc-800 hover:bg-zinc-800 text-sm gap-2 px-6 h-12">
                                Gestionar suscripción y facturación <ArrowRight size={16} />
                            </Button>
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
