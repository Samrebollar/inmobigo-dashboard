'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
    Mail,
    Phone,
    MapPin,
    User,
    Save,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Zap,
    Calendar,
    ArrowRight,
    Maximize2,
    Layers,
    MessageSquare,
    Camera,
    ShieldCheck
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { normalizeMexicanPhone } from '@/utils/phone-utils'
import { ContactInmobiGoCard } from '@/components/shared/ContactInmobiGoCard'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

interface AdminContact {
    name: string
    phone: string | null
    email: string | null
    avatarUrl: string | null
}

interface AccountStatus {
    isOverdue: boolean
    totalDebt: number
    nextDueDate: string | null
    nextAmount: number | null
}

export default function ResidentProfileClient({
    user,
    initialResident,
    profile,
    role = 'resident',
    isAdmin: isAdminProp,
    subscription,
    organizationName,
    adminContact,
    accountStatus,
    financeHref = '/dashboard/finance'
}: {
    user: any,
    initialResident: any,
    profile: any,
    role?: string,
    isAdmin?: boolean,
    subscription?: any,
    organizationName?: string | null,
    adminContact?: AdminContact | null,
    accountStatus?: AccountStatus | null,
    financeHref?: string
}) {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const isAdmin = isAdminProp ?? (role !== 'resident' && role !== 'tenant')

    const [resident, setResident] = useState(() => {
        const res = initialResident || {}
        const phone = res.phone || profile?.phone || user.user_metadata?.phone || ''
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

    const unit = resident?.units
    const condominium = resident?.condominiums

    const unitInfo = {
        unitNumber: unit?.unit_number || 'Sin unidad asignada',
        condoName: condominium?.name || organizationName || 'Sin condominio asignado',
        sizeM2: unit?.size_m2 ? `${unit.size_m2} m²` : null,
        floor: unit?.floor || null,
    }

    const hasDebt = !!accountStatus && (accountStatus.isOverdue || accountStatus.totalDebt > 0)

    const daysUntilNextPayment = accountStatus?.nextDueDate
        ? Math.ceil((new Date(`${accountStatus.nextDueDate}T00:00:00`).getTime() - Date.now()) / 86400000)
        : null

    const cycleProgressPct = daysUntilNextPayment != null
        ? Math.min(100, Math.max(0, ((30 - daysUntilNextPayment) / 30) * 100))
        : 0

    const handleAvatarClick = () => {
        fileInputRef.current?.click()
    }

    const handleContactAdmin = () => {
        if (!adminContact) return
        if (adminContact.phone) {
            window.open(`https://wa.me/${normalizeMexicanPhone(adminContact.phone)}`, '_blank')
        } else if (adminContact.email) {
            window.location.href = `mailto:${adminContact.email}`
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            setLoading(true)
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`
            const filePath = `avatars/${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            })

            setAvatarUrl(publicUrl)

            setTimeout(() => {
                router.refresh()
                toast.success('Fotografía de perfil actualizada con éxito. Los cambios ya son visibles en su cuenta.')
            }, 800)
        } catch (error: any) {
            console.error('Error uploading avatar:', error)
            toast.error(`No se pudo actualizar la fotografía: ${error.message || 'Error de red'}`)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        try {
            const normalizedPhone = normalizeMexicanPhone(resident.phone || '')
            const updatedResident = { ...resident, phone: normalizedPhone }
            setResident(updatedResident)

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

            const fullName = `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
            const profileUpdate: Record<string, any> = { phone: normalizedPhone || null }
            if (fullName) profileUpdate.full_name = fullName

            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileUpdate)
                .eq('id', user.id)
            if (profileError) throw profileError

            router.refresh()
            toast.success('Perfil actualizado con éxito. Sus datos han sido guardados de forma segura.')
        } catch (error: any) {
            console.error('Error saving profile:', error)
            toast.error(`Ocurrió un error al guardar los cambios: ${error.message}`)
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
                <div className="h-48 w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-zinc-900 opacity-80" />
                <div className="absolute top-0 inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]" />

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

                    {isAdmin && (
                        <ContactInmobiGoCard
                            organizationName={organizationName}
                            adminName={`${resident.first_name || ''} ${resident.last_name || ''}`.trim() || profile?.full_name || user.email}
                            adminPhone={resident.phone || null}
                        />
                    )}

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
                                    <p className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors">{unitInfo.condoName}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 group hover:border-emerald-500/20 transition-colors">
                                    <p className="text-sm text-zinc-500 mb-1">Unidad / Depto</p>
                                    <p className="text-base font-medium text-white group-hover:text-emerald-400 transition-colors">{unitInfo.unitNumber}</p>
                                </div>
                                <div className="md:col-span-2 p-4 rounded-2xl bg-zinc-950/50 border border-zinc-800/50 flex items-center justify-between group hover:border-emerald-500/20 transition-colors">
                                    <div>
                                        <p className="text-sm text-zinc-500 mb-1">Estado de Cuenta</p>
                                        {accountStatus ? (
                                            <p className={`text-base font-medium flex items-center gap-2 ${hasDebt ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {hasDebt ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                                {hasDebt
                                                    ? `Con adeudo: $${accountStatus.totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                                                    : 'Al Corriente'}
                                            </p>
                                        ) : (
                                            <p className="text-base font-medium text-zinc-500">Sin información</p>
                                        )}
                                    </div>
                                    <Link href={financeHref}>
                                        <Button variant="ghost" className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-400/10 rounded-xl gap-1">
                                            Ver Finanzas <ArrowRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>

                {/* Right Column: Mini Cards */}
                <div className="space-y-6">
                    {!isAdmin && (
                        <>
                            {/* Administrator Mini Card */}
                            {adminContact && (
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group/admin"
                                >
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Administrador</h3>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="relative h-12 w-12 rounded-2xl overflow-hidden ring-2 ring-indigo-500/20 bg-zinc-800 flex items-center justify-center">
                                            {adminContact.avatarUrl ? (
                                                <img src={adminContact.avatarUrl} alt={adminContact.name} className="h-full w-full object-cover" />
                                            ) : (
                                                <User className="h-6 w-6 text-zinc-500" />
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-bold text-white tracking-tight">{adminContact.name}</h4>
                                            <p className="text-[10px] text-zinc-500">Administración del condominio</p>
                                        </div>
                                    </div>
                                    <div className="space-y-2 mb-6">
                                        {adminContact.phone && (
                                            <div className="flex items-center gap-3 text-zinc-400 text-xs">
                                                <Phone className="h-3 w-3 text-indigo-400" />
                                                <span>{adminContact.phone}</span>
                                            </div>
                                        )}
                                        {adminContact.email && (
                                            <div className="flex items-center gap-3 text-zinc-400 text-xs">
                                                <Mail className="h-3 w-3 text-indigo-400" />
                                                <span className="truncate">{adminContact.email}</span>
                                            </div>
                                        )}
                                        {!adminContact.phone && !adminContact.email && (
                                            <p className="text-xs text-zinc-600 italic">Sin datos de contacto disponibles</p>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleContactAdmin}
                                        disabled={!adminContact.phone && !adminContact.email}
                                        className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 h-9 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] gap-2 disabled:opacity-40"
                                    >
                                        <MessageSquare size={14} /> Contactar
                                    </Button>
                                </motion.div>
                            )}

                            {/* Unit Details Mini Card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group/unit"
                            >
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">La Unidad</h3>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/50">
                                        <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Superficie</p>
                                        <div className="flex items-center gap-2">
                                            <Maximize2 size={12} className="text-blue-400" />
                                            <span className="text-xs font-bold text-white">{unitInfo.sizeM2 || 'No especificado'}</span>
                                        </div>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-zinc-950/50 border border-zinc-800/50">
                                        <p className="text-[9px] text-zinc-500 uppercase font-black mb-1">Piso</p>
                                        <div className="flex items-center gap-2">
                                            <Layers size={12} className="text-amber-400" />
                                            <span className="text-xs font-bold text-white">{unitInfo.floor || 'No especificado'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 px-1">
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Residencia Verificada</span>
                                </div>
                            </motion.div>
                        </>
                    )}
                </div>
            </div>

            {/* Bottom Tracker Section */}
            {!isAdmin && daysUntilNextPayment !== null && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className={`bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl group border-l-4 ${daysUntilNextPayment < 0 ? 'border-l-red-500' : 'border-l-indigo-500'}`}
                >
                    <div className="flex-1 w-full space-y-3">
                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest">
                            <span className="text-zinc-400 italic font-medium lowercase tracking-normal">
                                {daysUntilNextPayment >= 0 ? (
                                    <>Próximo pago vence en <span className="text-amber-500 font-black tracking-widest uppercase">{daysUntilNextPayment} día{daysUntilNextPayment === 1 ? '' : 's'}</span></>
                                ) : (
                                    <>Pago vencido hace <span className="text-red-500 font-black tracking-widest uppercase">{Math.abs(daysUntilNextPayment)} día{Math.abs(daysUntilNextPayment) === 1 ? '' : 's'}</span></>
                                )}
                            </span>
                            {accountStatus?.nextAmount != null && (
                                <span className="text-indigo-400">${accountStatus.nextAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            )}
                        </div>
                        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${cycleProgressPct}%` }}
                                transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                className={`h-full rounded-full ${daysUntilNextPayment < 0 ? 'bg-gradient-to-r from-red-600 via-red-500 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.4)]'}`}
                            />
                        </div>
                    </div>
                    <Link href={financeHref}>
                        <Button variant="outline" className="border-indigo-500/30 bg-indigo-500/5 text-indigo-300 font-black h-11 rounded-2xl flex items-center gap-2 px-8 hover:bg-indigo-600 hover:text-white transition-all shadow-lg text-[10px] uppercase tracking-widest">
                            <Calendar className="h-4 w-4" /> Ver Finanzas
                        </Button>
                    </Link>
                </motion.div>
            )}

            {/* Subscription Card — la suscripción de InmobiGo es del administrador/
                organización, no del residente/inquilino/guardia, así que solo se
                muestra en el perfil de un admin. */}
            {isAdmin && (
                <motion.div
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    className="mt-8 rounded-[2.5rem] border border-zinc-800 bg-gradient-to-br from-zinc-900 via-[#1a1c2e] to-indigo-950/20 p-8 md:p-10 shadow-22 hover:border-indigo-500/30 transition-all flex flex-col lg:flex-row items-stretch lg:items-center gap-10"
                >
                    <div className="flex-1 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3 italic">
                                <Zap className="h-6 w-6 text-amber-400 not-italic" /> Mi Plan Actual
                            </h2>
                            {subscription ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 px-3 py-1">Activo</Badge>
                            ) : (
                                <Badge variant="outline" className="text-zinc-500 border-zinc-800 px-3 py-1">Modo Demo</Badge>
                            )}
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black">Plan contratado</p>
                            <h3 className="text-4xl font-black text-white">{subscription?.plan_name || 'InmobiGo Demo'}</h3>
                        </div>
                    </div>

                    <div className="w-px bg-zinc-800 hidden lg:block self-stretch mx-4" />

                    <div className="flex-1 space-y-6">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Unidades</p>
                                <p className="text-xl font-bold text-zinc-200">{subscription?.unit_limit || '10'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Ciclo</p>
                                <p className="text-xl font-bold text-zinc-200 capitalize">{subscription?.billing_cycle === 'yearly' ? 'Anual' : 'Mensual'}</p>
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-black mb-2">Próximo pago</p>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-indigo-400" />
                                <p className="text-lg font-bold text-white">
                                    {subscription?.next_payment_date
                                        ? format(parseISO(subscription.next_payment_date), 'd MMMM, yyyy', { locale: es })
                                        : 'No programado'}
                                </p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
