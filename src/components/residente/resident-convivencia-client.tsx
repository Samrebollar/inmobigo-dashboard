'use client'

import { useState, useEffect, useCallback, useMemo, type ComponentType } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShieldAlert,
    ShieldCheck,
    Plus,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    Camera,
    X,
    Volume2,
    PawPrint,
    Trash2,
    Car,
    UserX,
    MessageSquareWarning,
    Home,
    CalendarClock,
    MessageCircle,
    Lock,
    Send,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import {
    createComplaintServer,
    getMyComplaintsServer,
    getUnitsForCondominiumServer,
} from '@/app/actions/complaint-actions'
import { toast } from 'sonner'

interface ResidentConvivenciaClientProps {
    resident: {
        id: string
        condominium_id: string | null
        organization_id: string | null
    }
}

type ComplaintStatus = 'abierta' | 'en_revision' | 'resuelta' | 'descartada'
type IconType = ComponentType<{ size?: number; className?: string }>

interface Complaint {
    id: string
    complaint_type: string
    description: string
    status: ComplaintStatus
    is_anonymous: boolean
    subject_unit_number: string | null
    evidence_urls: string[] | null
    admin_notes: string | null
    created_at: string
    resolved_at: string | null
}

interface Unit { id: string; unit_number: string }

const TYPE_OPTIONS: { id: string; label: string; hint: string; icon: IconType; tile: string; active: string }[] = [
    { id: 'ruido', label: 'Ruido excesivo', hint: 'Música, fiestas, obras', icon: Volume2, tile: 'bg-violet-500/15 text-violet-300', active: 'border-violet-500/60 bg-violet-500/10' },
    { id: 'mascota', label: 'Mascota sin control', hint: 'Ladridos, heces, sin correa', icon: PawPrint, tile: 'bg-orange-500/15 text-orange-300', active: 'border-orange-500/60 bg-orange-500/10' },
    { id: 'basura', label: 'Manejo de basura', hint: 'Bolsas fuera de horario', icon: Trash2, tile: 'bg-lime-500/15 text-lime-300', active: 'border-lime-500/60 bg-lime-500/10' },
    { id: 'estacionamiento', label: 'Estacionamiento', hint: 'Cajón ocupado, mal estacionado', icon: Car, tile: 'bg-sky-500/15 text-sky-300', active: 'border-sky-500/60 bg-sky-500/10' },
    { id: 'comportamiento', label: 'Comportamiento', hint: 'Faltas de respeto, agresiones', icon: UserX, tile: 'bg-rose-500/15 text-rose-300', active: 'border-rose-500/60 bg-rose-500/10' },
    { id: 'otro', label: 'Otro', hint: 'Cualquier otra situación', icon: MessageSquareWarning, tile: 'bg-zinc-500/15 text-zinc-300', active: 'border-zinc-400/60 bg-zinc-500/10' },
]
const TYPE_BY_ID = Object.fromEntries(TYPE_OPTIONS.map(t => [t.id, t]))

const STATUS_CONFIG: Record<ComplaintStatus, { label: string; pill: string; icon: IconType; message: string }> = {
    abierta: { label: 'Recibido', pill: 'bg-amber-500/10 text-amber-300 border-amber-500/30', icon: Clock, message: 'La administración ya tiene tu reporte y lo revisará pronto.' },
    en_revision: { label: 'En revisión', pill: 'bg-blue-500/10 text-blue-300 border-blue-500/30', icon: Eye, message: 'La administración está atendiendo la situación.' },
    resuelta: { label: 'Resuelto', pill: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30', icon: CheckCircle2, message: 'La situación fue atendida. ¡Gracias por ayudar a la comunidad!' },
    descartada: { label: 'Cerrado', pill: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30', icon: XCircle, message: 'La administración cerró este reporte.' },
}

const STEPS: { status: ComplaintStatus; label: string }[] = [
    { status: 'abierta', label: 'Recibido' },
    { status: 'en_revision', label: 'En revisión' },
    { status: 'resuelta', label: 'Resuelto' },
]

const MAX_DESCRIPTION = 500

function relativeDate(iso: string) {
    const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    if (min < 1) return 'Hace un momento'
    if (min < 60) return `Hace ${min} min`
    const h = Math.round(min / 60)
    if (h < 24) return `Hace ${h} h`
    const d = Math.round(h / 24)
    if (d === 1) return 'Ayer'
    if (d < 7) return `Hace ${d} días`
    return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Línea de avance Recibido → En revisión → Resuelto. */
function ProgressTracker({ status }: { status: ComplaintStatus }) {
    if (status === 'descartada') {
        return (
            <div className="flex items-center gap-2 rounded-xl bg-zinc-800/40 px-3 py-2 text-xs text-zinc-400">
                <XCircle size={14} /> Reporte cerrado por la administración
            </div>
        )
    }
    const current = STEPS.findIndex(s => s.status === status)
    return (
        <div className="flex items-center">
            {STEPS.map((step, i) => {
                const done = i <= current
                const isLast = i === STEPS.length - 1
                return (
                    <div key={step.status} className={cn('flex items-center', !isLast && 'flex-1')}>
                        <div className="flex flex-col items-center gap-1">
                            <div className={cn(
                                'flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors',
                                done ? 'border-emerald-400 bg-emerald-500 text-zinc-950' : 'border-zinc-700 bg-zinc-900 text-zinc-500'
                            )}>
                                {done ? <CheckCircle2 size={14} /> : i + 1}
                            </div>
                            <span className={cn('whitespace-nowrap text-[10px] font-medium', done ? 'text-zinc-200' : 'text-zinc-500')}>{step.label}</span>
                        </div>
                        {!isLast && (
                            <div className="mx-1.5 mb-4 h-0.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                                <div className={cn('h-full bg-emerald-500 transition-all duration-700', i < current ? 'w-full' : 'w-0')} />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function Lightbox({ images, index, onClose, onNav }: { images: string[]; index: number; onClose: () => void; onNav: (i: number) => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowRight' && index < images.length - 1) onNav(index + 1)
            if (e.key === 'ArrowLeft' && index > 0) onNav(index - 1)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [images.length, index, onClose, onNav])

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={onClose}>
            <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Cerrar">
                <X size={20} />
            </button>
            {index > 0 && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onNav(index - 1) }} className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Anterior">
                    <ChevronLeft size={22} />
                </button>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt={`Evidencia ${index + 1}`} className="max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
            {index < images.length - 1 && (
                <button type="button" onClick={(e) => { e.stopPropagation(); onNav(index + 1) }} className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="Siguiente">
                    <ChevronRight size={22} />
                </button>
            )}
        </div>
    )
}

export default function ResidentConvivenciaClient({ resident }: ResidentConvivenciaClientProps) {
    const [supabase] = useState(() => createClient())
    const [loading, setLoading] = useState(true)
    const [complaints, setComplaints] = useState<Complaint[]>([])
    const [units, setUnits] = useState<Unit[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null)

    const [formData, setFormData] = useState({
        complaint_type: 'ruido',
        subject_unit_id: '',
        description: '',
        is_anonymous: false,
    })
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
    const [evidencePreview, setEvidencePreview] = useState<string | null>(null)

    const fetchAll = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true)
            const [mine, unitsRes] = await Promise.all([
                getMyComplaintsServer(resident.id),
                resident.condominium_id ? getUnitsForCondominiumServer(resident.condominium_id) : Promise.resolve({ success: true, units: [] as Unit[] }),
            ])
            if (mine.success) setComplaints((mine.complaints || []) as Complaint[])
            if (unitsRes.success) setUnits((unitsRes.units || []) as Unit[])
        } catch (error) {
            console.error('Error fetching complaints:', error)
        } finally {
            setLoading(false)
        }
    }, [resident.id, resident.condominium_id])

    useEffect(() => {
        if (!resident?.id) return
        fetchAll()

        const channel = supabase
            .channel(`realtime_resident_complaints_${resident.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'resident_complaints',
                    filter: `reporter_resident_id=eq.${resident.id}`,
                },
                () => {
                    fetchAll(true)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [resident?.id, supabase, fetchAll])

    const resetForm = () => {
        setFormData({ complaint_type: 'ruido', subject_unit_id: '', description: '', is_anonymous: false })
        setEvidenceFile(null)
        setEvidencePreview(null)
    }

    const openForm = (type?: string) => {
        resetForm()
        if (type) setFormData(prev => ({ ...prev, complaint_type: type }))
        setIsFormOpen(true)
    }

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            toast.error('Solo se aceptan imágenes.')
            return
        }
        setEvidenceFile(file)
        const reader = new FileReader()
        reader.onloadend = () => setEvidencePreview(reader.result as string)
        reader.readAsDataURL(file)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.description.trim()) {
            toast.error('Describe brevemente lo que está pasando.')
            return
        }
        if (!resident?.id || !resident?.organization_id || !resident?.condominium_id) {
            toast.error('No se pudo determinar tu perfil de residente. Contacta al administrador.')
            return
        }

        try {
            setSubmitting(true)
            let evidenceUrl = ''

            if (evidenceFile) {
                setUploading(true)
                const fileExt = evidenceFile.name.split('.').pop()
                const fileName = `${resident.id}-${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `convivencia/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('complaint_evidence')
                    .upload(filePath, evidenceFile, { cacheControl: '3600', upsert: false })

                if (uploadError) {
                    throw new Error('Error al subir la evidencia: ' + uploadError.message)
                }

                const { data: { publicUrl } } = supabase.storage.from('complaint_evidence').getPublicUrl(filePath)
                evidenceUrl = publicUrl
                setUploading(false)
            }

            const result = await createComplaintServer({
                organization_id: resident.organization_id,
                condominium_id: resident.condominium_id,
                reporter_resident_id: resident.id,
                is_anonymous: formData.is_anonymous,
                complaint_type: formData.complaint_type,
                description: formData.description.trim(),
                subject_unit_id: formData.subject_unit_id || undefined,
                evidence_urls: evidenceUrl ? [evidenceUrl] : [],
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('Reporte enviado a la administración.', { description: 'Te avisaremos aquí cuando cambie su estado.' })
            setIsFormOpen(false)
            resetForm()
            fetchAll(true)
        } catch (error) {
            console.error('Error creating complaint:', error)
            toast.error(error instanceof Error && error.message ? error.message : 'Ocurrió un error al enviar tu reporte.')
        } finally {
            setSubmitting(false)
            setUploading(false)
        }
    }

    const stats = useMemo(() => ({
        active: complaints.filter(c => c.status === 'abierta' || c.status === 'en_revision').length,
        resolved: complaints.filter(c => c.status === 'resuelta').length,
        total: complaints.length,
    }), [complaints])

    const selectedType = TYPE_BY_ID[formData.complaint_type] || TYPE_OPTIONS[0]

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-4 sm:p-6 md:p-10 animate-in fade-in duration-500">
            {/* Encabezado */}
            <div className="relative overflow-hidden rounded-3xl border border-rose-500/20 bg-gradient-to-br from-rose-500/15 via-zinc-900 to-zinc-950 p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-rose-500/20 blur-3xl" />
                <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold text-rose-200">
                            <ShieldCheck size={13} /> Espacio seguro y confidencial
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Convivencia</h1>
                        <p className="max-w-xl text-sm text-zinc-300 sm:text-base">
                            ¿Algo afecta la tranquilidad de tu privada? Cuéntaselo a la administración.
                            <span className="text-zinc-400"> Tu identidad nunca se comparte con la persona reportada.</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => openForm()}
                        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-rose-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-600/30 transition-all hover:-translate-y-0.5 hover:bg-rose-500"
                    >
                        <Plus size={18} /> Nuevo reporte
                    </button>
                </div>
                {stats.total > 0 && (
                    <div className="relative mt-6 grid grid-cols-3 gap-3">
                        {[
                            { label: 'En atención', value: stats.active, cls: 'text-amber-300' },
                            { label: 'Resueltos', value: stats.resolved, cls: 'text-emerald-300' },
                            { label: 'Total', value: stats.total, cls: 'text-white' },
                        ].map(s => (
                            <div key={s.label} className="rounded-2xl border border-white/5 bg-black/20 px-4 py-3">
                                <p className={cn('text-2xl font-bold tabular-nums', s.cls)}>{s.value}</p>
                                <p className="text-[11px] font-medium text-zinc-400">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Accesos rápidos */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">¿Qué quieres reportar?</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {TYPE_OPTIONS.map(t => {
                        const Icon = t.icon
                        return (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => openForm(t.id)}
                                className="group flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-zinc-700 hover:bg-zinc-900"
                            >
                                <div className={cn('shrink-0 rounded-xl p-2.5 transition-transform group-hover:scale-110', t.tile)}>
                                    <Icon size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-white">{t.label}</p>
                                    <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">{t.hint}</p>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </section>

            {/* Mis reportes */}
            <section className="space-y-4">
                <h2 className="flex items-center gap-2 text-xl font-bold text-white">
                    <ShieldAlert className="h-5 w-5 text-rose-400" /> Mis reportes
                </h2>

                {loading ? (
                    <div className="space-y-4">
                        {[0, 1].map(i => <div key={i} className="h-48 animate-pulse rounded-2xl border border-zinc-800/60 bg-zinc-900/40" />)}
                    </div>
                ) : complaints.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60">
                            <ShieldCheck className="h-7 w-7 text-zinc-500" />
                        </div>
                        <p className="text-base font-semibold text-zinc-200">Aún no has hecho reportes</p>
                        <p className="mx-auto mt-1 max-w-md text-sm text-zinc-500">Así funciona:</p>
                        <div className="mx-auto mt-5 grid max-w-2xl gap-3 text-left sm:grid-cols-3">
                            {[
                                { icon: Send, title: '1. Reporta', text: 'Elige el tipo de situación y cuéntanos qué pasa.' },
                                { icon: Eye, title: '2. Revisamos', text: 'La administración atiende tu reporte con discreción.' },
                                { icon: CheckCircle2, title: '3. Te avisamos', text: 'Sigue aquí el avance y la respuesta.' },
                            ].map(s => {
                                const Icon = s.icon
                                return (
                                    <div key={s.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                                        <Icon size={18} className="text-rose-300" />
                                        <p className="mt-2 text-sm font-semibold text-white">{s.title}</p>
                                        <p className="mt-0.5 text-xs text-zinc-500">{s.text}</p>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {complaints.map((c, i) => {
                            const typeCfg = TYPE_BY_ID[c.complaint_type] || TYPE_BY_ID.otro
                            const TypeIcon = typeCfg.icon
                            const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.abierta
                            const StatusIcon = statusCfg.icon
                            const evidence = c.evidence_urls || []
                            return (
                                <motion.article
                                    key={c.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 * i }}
                                    className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50 transition-colors hover:border-zinc-700"
                                >
                                    <div className="space-y-4 p-5">
                                        <div className="flex items-start gap-3">
                                            <div className={cn('shrink-0 rounded-xl p-2.5', typeCfg.tile)}>
                                                <TypeIcon size={20} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex flex-wrap items-start justify-between gap-2">
                                                    <h3 className="text-base font-semibold text-white">{typeCfg.label}</h3>
                                                    <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', statusCfg.pill)}>
                                                        <StatusIcon size={12} /> {statusCfg.label}
                                                    </span>
                                                </div>
                                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                                                    <span className="inline-flex items-center gap-1"><CalendarClock size={12} /> {relativeDate(c.created_at)}</span>
                                                    {c.subject_unit_number && <span className="inline-flex items-center gap-1"><Home size={12} /> Unidad {c.subject_unit_number}</span>}
                                                    {c.is_anonymous && <span className="inline-flex items-center gap-1"><EyeOff size={12} /> Anónimo</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <p className="rounded-xl bg-zinc-950/60 px-4 py-3 text-sm leading-relaxed text-zinc-300">{c.description}</p>

                                        {evidence.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {evidence.map((url, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => setLightbox({ images: evidence, index: idx })}
                                                        className="overflow-hidden rounded-lg border border-zinc-800 transition-all hover:scale-105 hover:border-rose-500/50"
                                                    >
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={url} alt={`Evidencia ${idx + 1}`} className="h-14 w-14 object-cover" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <ProgressTracker status={c.status} />
                                    </div>

                                    <div className="border-t border-zinc-800/70 bg-zinc-950/30 px-5 py-4">
                                        {c.admin_notes ? (
                                            <div className="flex gap-3">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-300">
                                                    <MessageCircle size={15} />
                                                </div>
                                                <div className="min-w-0 rounded-2xl rounded-tl-sm border border-indigo-500/20 bg-indigo-500/5 px-4 py-2.5">
                                                    <p className="text-[11px] font-semibold text-indigo-300">Respuesta de la administración</p>
                                                    <p className="mt-0.5 text-sm text-zinc-200">{c.admin_notes}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="flex items-center gap-2 text-xs text-zinc-500">
                                                <StatusIcon size={13} /> {statusCfg.message}
                                            </p>
                                        )}
                                    </div>
                                </motion.article>
                            )
                        })}
                    </div>
                )}
            </section>

            {/* Formulario */}
            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => !submitting && setIsFormOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 40 }}
                            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-900 shadow-2xl sm:rounded-3xl scrollbar-hide"
                        >
                            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-zinc-800 bg-zinc-900/95 px-6 py-5 backdrop-blur">
                                <div className="flex items-center gap-3">
                                    <div className={cn('rounded-2xl p-3', selectedType.tile)}>
                                        <selectedType.icon size={22} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold leading-tight text-white">Nuevo reporte</h2>
                                        <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-400"><Lock size={11} /> Solo la administración lo verá</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setIsFormOpen(false)} disabled={submitting} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800/60 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white" aria-label="Cerrar">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6 p-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-300">¿Qué está pasando?</label>
                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                                        {TYPE_OPTIONS.map(t => {
                                            const Icon = t.icon
                                            const active = formData.complaint_type === t.id
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, complaint_type: t.id })}
                                                    className={cn(
                                                        'flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all',
                                                        active ? t.active : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                                                    )}
                                                >
                                                    <div className={cn('rounded-lg p-1.5', t.tile)}><Icon size={16} /></div>
                                                    <span className={cn('text-xs font-semibold', active ? 'text-white' : 'text-zinc-300')}>{t.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-300">Unidad involucrada <span className="font-normal text-zinc-500">(opcional)</span></label>
                                    <div className="relative">
                                        <Home size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                        <select
                                            value={formData.subject_unit_id}
                                            onChange={e => setFormData({ ...formData, subject_unit_id: e.target.value })}
                                            className="w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-950 py-3 pl-9 pr-3 text-sm text-white transition-all focus:border-rose-500/50 focus:outline-none"
                                        >
                                            <option value="">No estoy seguro / prefiero no decir</option>
                                            {units.map(u => (
                                                <option key={u.id} value={u.id}>{u.unit_number}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-semibold text-zinc-300">Descripción</label>
                                        <span className={cn('text-[11px] tabular-nums', formData.description.length > MAX_DESCRIPTION * 0.9 ? 'text-amber-400' : 'text-zinc-500')}>
                                            {formData.description.length}/{MAX_DESCRIPTION}
                                        </span>
                                    </div>
                                    <textarea
                                        required
                                        rows={4}
                                        maxLength={MAX_DESCRIPTION}
                                        placeholder="¿Qué pasa, desde cuándo y en qué horario? Entre más detalle, más rápido podemos ayudar."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 text-sm text-white placeholder:text-zinc-600 transition-all focus:border-rose-500/50 focus:outline-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-zinc-300">Evidencia <span className="font-normal text-zinc-500">(opcional)</span></label>
                                    {evidencePreview ? (
                                        <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={evidencePreview} alt="Vista previa" className="h-20 w-20 rounded-xl border border-zinc-800 object-cover" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium text-white">{evidenceFile?.name}</p>
                                                <p className="text-xs text-emerald-400">Foto lista para enviar</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setEvidenceFile(null); setEvidencePreview(null) }}
                                                className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                                                aria-label="Quitar foto"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950 p-6 text-center transition-all hover:border-rose-500/40 hover:bg-zinc-900/50">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                                className="sr-only"
                                            />
                                            <div className="rounded-xl bg-zinc-800/70 p-2.5"><Camera size={20} className="text-zinc-300" /></div>
                                            <p className="text-sm font-medium text-zinc-200">Toma o adjunta una foto</p>
                                            <p className="text-[11px] text-zinc-500">Ayuda a la administración a entender la situación</p>
                                        </label>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={formData.is_anonymous}
                                    onClick={() => setFormData({ ...formData, is_anonymous: !formData.is_anonymous })}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors',
                                        formData.is_anonymous ? 'border-rose-500/40 bg-rose-500/5' : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                                    )}
                                >
                                    <div className={cn('rounded-xl p-2', formData.is_anonymous ? 'bg-rose-500/15 text-rose-300' : 'bg-zinc-800/70 text-zinc-400')}>
                                        <EyeOff size={18} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-white">Reportar de forma anónima</p>
                                        <p className="text-[11px] leading-snug text-zinc-500">El vecino nunca sabrá quién reportó. La administración sí puede ver tu identidad para evitar reportes falsos.</p>
                                    </div>
                                    <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors', formData.is_anonymous ? 'bg-rose-500' : 'bg-zinc-700')}>
                                        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', formData.is_anonymous ? 'left-[22px]' : 'left-0.5')} />
                                    </span>
                                </button>

                                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        disabled={submitting}
                                        className="rounded-xl px-5 py-3 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !formData.description.trim()}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-600/20 transition-colors hover:bg-rose-500 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        {uploading ? 'Subiendo foto…' : submitting ? 'Enviando…' : 'Enviar reporte'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {lightbox && (
                <Lightbox
                    images={lightbox.images}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onNav={idx => setLightbox(prev => (prev ? { ...prev, index: idx } : prev))}
                />
            )}
        </div>
    )
}
