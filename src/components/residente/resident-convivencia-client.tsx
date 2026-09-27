'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    ShieldAlert,
    Plus,
    Loader2,
    Clock,
    CheckCircle2,
    XCircle,
    Eye,
    EyeOff,
    Camera,
    X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/utils/supabase/client'
import {
    createComplaintServer,
    getMyComplaintsServer,
    getUnitsForCondominiumServer,
} from '@/app/actions/complaint-actions'
import { toast } from 'sonner'

interface ResidentConvivenciaClientProps {
    resident: any
}

const TYPE_OPTIONS = [
    { id: 'ruido', label: 'Ruido excesivo' },
    { id: 'mascota', label: 'Mascota sin control' },
    { id: 'basura', label: 'Manejo de basura' },
    { id: 'estacionamiento', label: 'Mal uso de estacionamiento' },
    { id: 'comportamiento', label: 'Comportamiento irrespetuoso' },
    { id: 'otro', label: 'Otro' },
]

const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPE_OPTIONS.map(t => [t.id, t.label]))

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
    abierta: { label: 'Recibida', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
    en_revision: { label: 'En revisión', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Eye },
    resuelta: { label: 'Resuelta', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
    descartada: { label: 'Descartada', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: XCircle },
}

export default function ResidentConvivenciaClient({ resident }: ResidentConvivenciaClientProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [complaints, setComplaints] = useState<any[]>([])
    const [units, setUnits] = useState<any[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [uploading, setUploading] = useState(false)

    const [formData, setFormData] = useState({
        complaint_type: 'ruido',
        subject_unit_id: '',
        description: '',
        is_anonymous: false,
    })
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
    const [evidencePreview, setEvidencePreview] = useState<string | null>(null)

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
                    fetchAll()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [resident?.id])

    const fetchAll = async () => {
        try {
            setLoading(true)
            const [mine, unitsRes] = await Promise.all([
                getMyComplaintsServer(resident.id),
                getUnitsForCondominiumServer(resident.condominium_id),
            ])
            if (mine.success) setComplaints(mine.complaints || [])
            if (unitsRes.success) setUnits(unitsRes.units || [])
        } catch (error) {
            console.error('Error fetching complaints:', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setFormData({ complaint_type: 'ruido', subject_unit_id: '', description: '', is_anonymous: false })
        setEvidenceFile(null)
        setEvidencePreview(null)
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

            toast.success('Reporte enviado a la administración.')
            setIsFormOpen(false)
            resetForm()
            fetchAll()
        } catch (error: any) {
            console.error('Error creating complaint:', error)
            toast.error(error.message || 'Ocurrió un error al enviar tu reporte.')
        } finally {
            setSubmitting(false)
            setUploading(false)
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-10 p-6 md:p-10 animate-in fade-in duration-500">
            <div className="space-y-2">
                <h1 className="text-4xl font-black text-white tracking-tight">Convivencia</h1>
                <p className="text-zinc-400 text-lg">Reporta situaciones de convivencia con tus vecinos. Tu identidad nunca se comparte con la persona reportada.</p>
            </div>

            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-rose-400" />
                    Mis reportes
                </h2>
                <Button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black px-5 shadow-lg shadow-rose-600/20 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo reporte
                </Button>
            </div>

            {loading ? (
                <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
                </div>
            ) : complaints.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2.5rem] flex flex-col items-center justify-center h-[220px] text-zinc-500 space-y-4">
                    <ShieldAlert className="h-16 w-16 opacity-20" />
                    <p className="text-lg font-medium">No has hecho ningún reporte de convivencia.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {complaints.map((c, i) => {
                        const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.abierta
                        const StatusIcon = statusCfg.icon
                        return (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 * i }}
                                className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-5 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2">
                                        <span className="font-black text-white">{TYPE_LABEL[c.complaint_type] || c.complaint_type}</span>
                                        {c.is_anonymous && (
                                            <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded-full">
                                                <EyeOff size={10} /> Anónimo
                                            </span>
                                        )}
                                    </div>
                                    <Badge className={cn('px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border flex items-center gap-1', statusCfg.color)}>
                                        <StatusIcon size={10} /> {statusCfg.label}
                                    </Badge>
                                </div>
                                <p className="text-sm text-zinc-400">{c.description}</p>
                                <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                                    {c.subject_unit_number && <span>Unidad involucrada: {c.subject_unit_number}</span>}
                                    <span>{new Date(c.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                </div>
                                {c.admin_notes && (
                                    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-400">
                                        <span className="font-bold text-zinc-300">Respuesta de administración: </span>{c.admin_notes}
                                    </div>
                                )}
                            </motion.div>
                        )
                    })}
                </div>
            )}

            <AnimatePresence>
                {isFormOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsFormOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 md:p-8 max-w-xl w-full shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-hide"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-rose-600/10 border border-rose-500/20 rounded-2xl text-rose-400">
                                        <ShieldAlert size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white tracking-tight leading-none">Nuevo Reporte</h2>
                                        <p className="text-zinc-400 text-xs mt-1">Solo la administración verá tu reporte.</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsFormOpen(false)} className="w-8 h-8 rounded-full bg-zinc-800/50 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Tipo de situación</label>
                                    <div className="flex flex-wrap gap-2">
                                        {TYPE_OPTIONS.map(t => (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, complaint_type: t.id })}
                                                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${formData.complaint_type === t.id
                                                    ? 'bg-rose-600/20 text-rose-400 border-rose-500/40 shadow-lg'
                                                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                                    }`}
                                            >
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Unidad involucrada (opcional)</label>
                                    <select
                                        value={formData.subject_unit_id}
                                        onChange={e => setFormData({ ...formData, subject_unit_id: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm font-bold focus:outline-none focus:border-rose-500/50 transition-all"
                                    >
                                        <option value="">No estoy seguro / prefiero no decir</option>
                                        {units.map(u => (
                                            <option key={u.id} value={u.id}>{u.unit_number}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Descripción</label>
                                    <textarea
                                        required
                                        rows={4}
                                        placeholder="Cuéntanos qué está pasando, cuándo ocurre, etc."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 transition-all resize-none"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Evidencia (opcional)</label>
                                    <div className="w-full border-2 border-dashed border-zinc-800 bg-zinc-950 rounded-2xl p-6 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <div className="flex flex-col items-center justify-center text-center gap-3">
                                            {evidencePreview ? (
                                                <img src={evidencePreview} alt="Preview" className="w-24 h-24 rounded-xl object-cover border border-zinc-800" />
                                            ) : (
                                                <>
                                                    <Camera size={24} className="text-zinc-500" />
                                                    <p className="text-xs font-bold text-zinc-300">Adjunta una foto si tienes</p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-4 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_anonymous}
                                        onChange={e => setFormData({ ...formData, is_anonymous: e.target.checked })}
                                        className="w-4 h-4 rounded accent-rose-500"
                                    />
                                    <div>
                                        <p className="text-sm font-bold text-white">Reportar de forma anónima</p>
                                        <p className="text-[11px] text-zinc-500">El vecino nunca sabrá quién reportó. La administración sí puede ver tu identidad para evitar reportes falsos.</p>
                                    </div>
                                </label>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="rounded-xl font-bold text-zinc-400 hover:text-white">
                                        Cancelar
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={submitting}
                                        className="bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black px-6 shadow-lg shadow-rose-600/20"
                                    >
                                        {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                                        {uploading ? 'Subiendo...' : 'Enviar Reporte'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
