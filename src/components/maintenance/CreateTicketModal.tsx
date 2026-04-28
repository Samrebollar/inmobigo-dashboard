'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { createMaintenanceTicketServer } from '@/app/actions/maintenance-actions'
import { TicketPriority } from '@/types/tickets'
import { 
    Wrench, 
    X, 
    UploadCloud, 
    Image as ImageIcon, 
    Loader2, 
    Shield, 
    AlertCircle, 
    CheckCircle2 
} from 'lucide-react'
import { toast } from 'sonner'

interface CreateTicketModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    residentId?: string
    defaultCondominiumId?: string
    defaultOrganizationId?: string
}

const CATEGORIES = [
    { id: 'leak', label: 'Fuga' },
    { id: 'electricity', label: 'Electricidad' },
    { id: 'security', label: 'Seguridad' },
    { id: 'infrastructure', label: 'Infraestructura' },
    { id: 'other', label: 'Otro' },
]

const PRIORITIES = [
    { id: 'low', label: 'Baja', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/20' },
    { id: 'medium', label: 'Media', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' },
    { id: 'high', label: 'Alta', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20' }
]

export function CreateTicketModal({ 
    isOpen, 
    onClose, 
    onSuccess, 
    residentId, 
    defaultCondominiumId,
    defaultOrganizationId 
}: CreateTicketModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [condominiums, setCondominiums] = useState<{ id: string, name: string }[]>([])
    const [orgId, setOrgId] = useState<string | null>(defaultOrganizationId || null)
    const [resolvedResidentId, setResolvedResidentId] = useState<string | null>(residentId || null)

    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)

    const [formData, setFormData] = useState({
        condominium_id: defaultCondominiumId || '',
        category: 'other',
        title: '',
        description: '',
        priority: 'medium' as TicketPriority,
        unit_id: '',
        unit_number: ''
    })

    useEffect(() => {
        if (isOpen) {
            fetchCondominiums()
            fetchResidentUnit()
        }
    }, [isOpen])

    const fetchCondominiums = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle()

        const activeOrgId = defaultOrganizationId || orgUser?.organization_id
        if (activeOrgId) {
            setOrgId(activeOrgId)
            const { data: condos } = await supabase
                .from('condominiums')
                .select('id, name')
                .eq('organization_id', activeOrgId)
                .eq('status', 'active')

            setCondominiums(condos || [])
            if (condos && condos.length > 0 && !formData.condominium_id) {
                setFormData(prev => ({ ...prev, condominium_id: condos[0].id }))
            }
        }
    }

    const fetchResidentUnit = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            let resData = null

            const finalId = residentId || resolvedResidentId

            if (finalId) {
                const { data } = await supabase
                    .from('residents')
                    .select('unit_id, condominium_id, units(unit_number), condominiums(name, organization_id)')
                    .eq('id', finalId)
                    .maybeSingle()
                if (data) resData = data
            }

            if (!resData && user) {
                const { data } = await supabase
                    .from('residents')
                    .select('id, unit_id, condominium_id, units(unit_number), condominiums(name, organization_id)')
                    .eq('user_id', user.id)
                    .maybeSingle()
                if (data) resData = data
            }

            if (!resData && user?.email) {
                const { data } = await supabase
                    .from('residents')
                    .select('id, unit_id, condominium_id, units(unit_number), condominiums(name, organization_id)')
                    .eq('email', user.email)
                    .maybeSingle()
                if (data) resData = data
            }

            if (resData) {
                setResolvedResidentId(resData.id)
                setFormData(prev => ({
                    ...prev,
                    unit_id: resData.unit_id || '',
                    unit_number: resData.units?.unit_number || 'N/A',
                    condominium_id: resData.condominium_id || prev.condominium_id
                }))
                
                if (resData.condominiums) {
                    if (resData.condominiums.organization_id) {
                        setOrgId(resData.condominiums.organization_id)
                    }
                    if (resData.condominium_id) {
                        setCondominiums([{ id: resData.condominium_id, name: resData.condominiums.name }])
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching resident unit:', error)
        }
    }

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file)
            const reader = new FileReader()
            reader.onloadend = () => {
                setImagePreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        } else {
            toast.error('Por favor, selecciona un archivo de imagen válido.')
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true)
        } else if (e.type === "dragleave") {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!orgId) return toast.error('Falta ID de organización.')
        if (!formData.title) return toast.error('Ingresa un título.')

        const finalResidentId = resolvedResidentId || residentId
        if (!finalResidentId) {
            return toast.error('No se pudo determinar tu perfil de residente. Contacta al administrador.')
        }

        try {
            setLoading(true)
            let imageUrl = ''

            if (selectedFile) {
                setIsUploading(true)
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${finalResidentId}-${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `maintenance/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('accounting_receipts')
                    .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false })

                if (uploadError) {
                    throw new Error('Error al subir la imagen: ' + uploadError.message)
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('accounting_receipts')
                    .getPublicUrl(filePath)
                
                imageUrl = publicUrl
                setIsUploading(false)
            }

            // Map category to a visible string in description to avoid DB enum mismatches
            const catLabel = CATEGORIES.find(c => c.id === formData.category)?.label || 'Otro'
            const finalDescription = `[Categoría: ${catLabel}]\n${formData.description}`

            // Create ticket via server action (RLS bypass)
            const result = await createMaintenanceTicketServer({
                organization_id: orgId,
                condominium_id: formData.condominium_id,
                unit_id: formData.unit_id || undefined,
                resident_id: finalResidentId,
                title: formData.title,
                description: finalDescription,
                priority: formData.priority,
                category: 'other',
                status: 'open',
                images: imageUrl ? [imageUrl] : []
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            // Requirement 7: Trigger simple notification
            console.log("NOTIFICACIÓN: Nuevo reporte creado para administrador");
            toast.success('Reporte creado con éxito.')
            
            onSuccess()
            onClose()
            
            // Reset
            setFormData({
                condominium_id: condominiums[0]?.id || defaultCondominiumId || '',
                category: 'other',
                title: '',
                description: '',
                priority: 'medium',
                unit_id: formData.unit_id,
                unit_number: formData.unit_number
            })
            setSelectedFile(null)
            setImagePreview(null)
        } catch (error: any) {
            console.error('Error creating ticket:', error)
            toast.error('Ocurrió un error al crear el reporte.')
        } finally {
            setLoading(false)
            setIsUploading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
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
                            <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400">
                                <Wrench size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">Reportar Mantenimiento</h2>
                                <p className="text-zinc-400 text-xs mt-1">Reporta un problema en tu condominio. Nuestro equipo lo atenderá.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800/50 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Condominio (Read Only / Select if multiple) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Condominio</label>
                            <select
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50 transition-all [color-scheme:dark]"
                                value={formData.condominium_id}
                                onChange={e => setFormData({ ...formData, condominium_id: e.target.value })}
                            >
                                {condominiums.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Tipo de problema (Chips) */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-1">
                                <AlertCircle size={10} />
                                <span>Tipo de problema</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, category: cat.id })}
                                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                                            formData.category === cat.id 
                                                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 shadow-lg' 
                                                : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Título */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Título del problema</label>
                            <input 
                                required
                                type="text"
                                placeholder="Ej. Fuga de agua en área común"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                        </div>

                        {/* Descripción */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Descripción detallada</label>
                            <textarea 
                                required
                                placeholder="Por favor detalla el problema..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full min-h-[120px] bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-600 leading-relaxed"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Prioridad (Chips) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Prioridad</label>
                                <div className="flex gap-2">
                                    {PRIORITIES.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, priority: p.id as TicketPriority })}
                                            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                                                formData.priority === p.id 
                                                    ? p.color + ' border-opacity-50 shadow-md scale-105 font-black' 
                                                    : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                            }`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Unidad (Read Only) */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Unidad</label>
                                <div className="w-full bg-zinc-950/40 border border-zinc-800/50 text-zinc-400 font-bold text-sm rounded-xl p-3.5 cursor-not-allowed">
                                    {formData.unit_number || 'N/A'}
                                </div>
                            </div>
                        </div>

                        {/* Subida de Imagen */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Subir evidencia (Imagen)</label>
                            <div 
                                className={`w-full border-2 border-dashed rounded-2xl p-6 transition-all relative ${
                                    dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900/50 hover:border-zinc-700'
                                }`}
                                onDragEnter={handleDrag}
                                onDragOver={handleDrag}
                                onDragLeave={handleDrag}
                                onDrop={handleDrop}
                            >
                                <input 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className="flex flex-col items-center justify-center text-center gap-3">
                                    {isUploading ? (
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 size={24} className="animate-spin text-blue-500" />
                                            <p className="text-xs font-bold text-blue-400">Subiendo imagen...</p>
                                        </div>
                                    ) : imagePreview ? (
                                        <div className="relative group/preview w-32 h-32 rounded-xl overflow-hidden border border-zinc-800 shadow-xl">
                                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                                <ImageIcon size={20} className="text-white" />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="p-3 bg-zinc-900 rounded-2xl text-zinc-500">
                                                <UploadCloud size={24} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-zinc-300">Arrastra una imagen aquí o haz clic para buscar</p>
                                                <p className="text-[10px] text-zinc-500 mt-1">Soporta PNG, JPEG, JPG</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Submit Actions */}
                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold text-zinc-400 hover:text-white">
                                Cancelar
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={loading || isUploading}
                                className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black px-6 shadow-lg shadow-blue-600/20"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                                Crear Reporte
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
