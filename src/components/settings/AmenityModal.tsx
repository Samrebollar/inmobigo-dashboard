import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Dumbbell, Waves, PartyPopper, CalendarDays, Clock, Users, ShieldCheck, AlertTriangle, FileText, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

interface AmenityModalProps {
    isOpen: boolean
    onClose: () => void
    orgId: string
    amenityToEdit?: any
    onSave: (amenity: any) => Promise<void>
}

const DEFAULT_DAYS = [
    { id: '1', label: 'Lunes' },
    { id: '2', label: 'Martes' },
    { id: '3', label: 'Miércoles' },
    { id: '4', label: 'Jueves' },
    { id: '5', label: 'Viernes' },
    { id: '6', label: 'Sábado' },
    { id: '0', label: 'Domingo' }
]

const COLOR_OPTIONS = [
    { value: 'from-orange-600 to-amber-500', label: 'Naranja Vivo' },
    { value: 'from-emerald-600 to-teal-500', label: 'Verde Esmeralda' },
    { value: 'from-indigo-600 to-purple-500', label: 'Índigo Real' },
    { value: 'from-rose-600 to-pink-500', label: 'Rosa Neón' },
    { value: 'from-blue-600 to-sky-500', label: 'Azul Océano' }
]

export function AmenityModal({ isOpen, onClose, orgId, amenityToEdit, onSave }: AmenityModalProps) {
    const [loading, setLoading] = useState(false)
    const [uploadingPdf, setUploadingPdf] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        base_price: 0,
        deposit_required: false,
        deposit_amount: 0,
        capacity: 10,
        rules: '',
        use_hours: '08:00 - 22:00',
        use_days: DEFAULT_DAYS.map(d => d.id),
        color: COLOR_OPTIONS[0].value,
        status: 'active',
        rules_pdf_url: ''
    })

    useEffect(() => {
        if (isOpen && amenityToEdit) {
            setFormData({
                name: amenityToEdit.name || '',
                description: amenityToEdit.description || '',
                base_price: amenityToEdit.base_price || 0,
                deposit_required: amenityToEdit.deposit_required || false,
                deposit_amount: amenityToEdit.deposit_amount || 0,
                capacity: amenityToEdit.capacity || 10,
                rules: amenityToEdit.rules || '',
                use_hours: amenityToEdit.use_hours || '08:00 - 22:00',
                use_days: amenityToEdit.use_days || DEFAULT_DAYS.map(d => d.id),
                color: amenityToEdit.color || COLOR_OPTIONS[0].value,
                status: amenityToEdit.status || 'active',
                rules_pdf_url: amenityToEdit.rules_pdf_url || ''
            })
        } else if (isOpen && !amenityToEdit) {
            // Reset
            setFormData({
                name: '',
                description: '',
                base_price: 0,
                deposit_required: false,
                deposit_amount: 0,
                capacity: 10,
                rules: '',
                use_hours: '08:00 - 22:00',
                use_days: DEFAULT_DAYS.map(d => d.id),
                color: COLOR_OPTIONS[0].value,
                status: 'active',
                rules_pdf_url: ''
            })
        }
    }, [isOpen, amenityToEdit])



    const handleToggleDay = (dayId: string) => {
        setFormData(prev => ({
            ...prev,
            use_days: prev.use_days.includes(dayId) 
                ? prev.use_days.filter((id: string) => id !== dayId)
                : [...prev.use_days, dayId]
        }))
    }

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.type !== 'application/pdf') {
            toast.error('Ojo: Solo de permiten archivos en formato PDF.')
            return
        }

        const supabase = createClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
        const filePath = `${orgId}/${fileName}`

        try {
            setUploadingPdf(true)
            const { error: uploadError } = await supabase.storage
                .from('amenity_rules')
                .upload(filePath, file)

            if (uploadError) throw uploadError

            const { data } = supabase.storage
                .from('amenity_rules')
                .getPublicUrl(filePath)

            setFormData(prev => ({ ...prev, rules_pdf_url: data.publicUrl }))
            toast.success('Reglamento Oficial subido exitosamente.')
        } catch (error: any) {
            console.error('Error uploading pdf:', error)
            toast.error(`Inhabilitado: Requieres crear el Bucket "amenity_rules" en Supabase primero.`)
        } finally {
            setUploadingPdf(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const payload = { ...formData, organization_id: orgId }
            if (amenityToEdit?.id) {
                // @ts-ignore
                payload.id = amenityToEdit.id
            }
            if (!payload.deposit_required) {
                payload.deposit_amount = 0
            }
            await onSave(payload)
            onClose()
        } catch (error: any) {
            console.error('Error detallado en el formulario de amenidad:', {
                message: error.message,
                stack: error.stack,
                error
            })
            toast.error('Ocurrió un error al procesar la amenidad: ' + (error.message || 'Error desconocido'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />
                    
                    <motion.div
                        key="modal-content"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                    >
                    <div className={`h-2 w-full bg-gradient-to-r ${formData.color}`} />
                    
                    <div className="px-6 py-5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {amenityToEdit ? 'Editar Amenidad' : 'Nueva Amenidad'}
                            </h2>
                            <p className="text-xs text-zinc-400 mt-1">Configura las reglas y cobros para este espacio.</p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800">
                            <X size={20} />
                        </Button>
                    </div>

                    <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
                        <form id="amenity-form" onSubmit={handleSubmit} className="space-y-8">
                            
                            {/* Maintenance Toggle */}
                            <div className={`p-4 rounded-2xl border transition-all duration-300 ${formData.status === 'maintenance' ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.15)]' : 'bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl transition-colors duration-300 ${formData.status === 'maintenance' ? 'bg-orange-500/20 text-orange-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                            <AlertTriangle size={20} className={formData.status === 'maintenance' ? 'animate-pulse' : ''} />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold transition-colors duration-300 ${formData.status === 'maintenance' ? 'text-orange-400' : 'text-white'}`}>Modo Mantenimiento</h3>
                                            <p className="text-xs text-zinc-400 mt-0.5">Si se activa, los residentes no podrán ver ni agendar este espacio.</p>
                                        </div>
                                    </div>
                                    <Switch 
                                        checked={formData.status === 'maintenance'} 
                                        onCheckedChange={c => setFormData(s => ({ ...s, status: c ? 'maintenance' : 'active' }))}
                                        className="data-[state=checked]:bg-orange-500" 
                                    />
                                </div>
                            </div>
                            
                            {/* General */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <PartyPopper size={14} /> Datos Generales
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5 focus-within:text-indigo-400 transition-colors">
                                        <label className="text-sm font-medium text-zinc-300">Nombre del espacio</label>
                                        <Input 
                                            required 
                                            value={formData.name} 
                                            onChange={e => setFormData(s => ({ ...s, name: e.target.value }))}
                                            placeholder="Ej. Salón de Eventos VIP"
                                            className="bg-zinc-900/50 border-zinc-800 text-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5 focus-within:text-indigo-400 transition-colors">
                                        <label className="text-sm font-medium text-zinc-300">Capacidad Máxima</label>
                                        <div className="relative">
                                            <Users size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                                            <Input 
                                                required 
                                                type="number"
                                                min="1"
                                                value={formData.capacity} 
                                                onChange={e => setFormData(s => ({ ...s, capacity: parseInt(e.target.value) || 0 }))}
                                                className="bg-zinc-900/50 border-zinc-800 text-white pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2 focus-within:text-indigo-400 transition-colors">
                                        <label className="text-sm font-medium text-zinc-300">Descripción Corta</label>
                                        <Input 
                                            value={formData.description} 
                                            onChange={e => setFormData(s => ({ ...s, description: e.target.value }))}
                                            placeholder="Ej. Ideal para fiestas de hasta 50 invitados con acceso a cocina..."
                                            className="bg-zinc-900/50 border-zinc-800 text-white"
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-zinc-300">Color y Estilo de Tarjeta</label>
                                        <select 
                                            value={formData.color} 
                                            onChange={e => setFormData(s => ({ ...s, color: e.target.value }))}
                                            className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        >
                                            {COLOR_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Tarifas */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldCheck size={14} /> Cobros y Garantías
                                </h3>
                                <div className="p-4 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl grid gap-5 md:grid-cols-2">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-medium text-zinc-300">Precio Base (Reserva)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                            <Input 
                                                required 
                                                type="number"
                                                min="0"
                                                value={formData.base_price} 
                                                onChange={e => setFormData(s => ({ ...s, base_price: parseFloat(e.target.value) || 0 }))}
                                                className="bg-zinc-950 border-zinc-800 text-emerald-400 font-bold pl-8 focus-visible:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <label className="text-sm font-medium text-zinc-300">Exigir Depósito en Garantía</label>
                                            <Switch 
                                                checked={formData.deposit_required} 
                                                onCheckedChange={c => setFormData(s => ({ ...s, deposit_required: c }))}
                                                className="data-[state=checked]:bg-emerald-500" 
                                            />
                                        </div>
                                        {formData.deposit_required && (
                                            <div className="pt-1 animate-in fade-in slide-in-from-top-2">
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                                                    <Input 
                                                        required 
                                                        type="number"
                                                        min="0"
                                                        value={formData.deposit_amount} 
                                                        onChange={e => setFormData(s => ({ ...s, deposit_amount: parseFloat(e.target.value) || 0 }))}
                                                        className="bg-zinc-950 border-zinc-800 text-amber-400 font-bold pl-8 focus-visible:ring-amber-500"
                                                        placeholder="Monto a retener"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Logs & Rules */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={14} /> Horarios y Operación
                                </h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-zinc-300">Horario de Servicio</label>
                                        <Input 
                                            value={formData.use_hours} 
                                            onChange={e => setFormData(s => ({ ...s, use_hours: e.target.value }))}
                                            placeholder="Ej. 08:00 - 22:00 o Lunes a Viernes 9 a 5"
                                            className="bg-zinc-900/50 border-zinc-800 text-white"
                                        />
                                        <p className="text-[10px] text-zinc-500">Este horario se mostrará al residente antes de reservar.</p>
                                    </div>
                                    <div className="space-y-2.5 md:col-span-2">
                                        <label className="text-sm font-medium text-zinc-300 flex justify-between">
                                            Días Permitidos
                                            <span className="text-[10px] text-zinc-500">{formData.use_days.length} días seleccionados</span>
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {DEFAULT_DAYS.map(day => {
                                                const isActive = formData.use_days.includes(day.id)
                                                return (
                                                    <button
                                                        key={day.id}
                                                        type="button"
                                                        onClick={() => handleToggleDay(day.id)}
                                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isActive ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-sm' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}
                                                    >
                                                        {day.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-sm font-medium text-zinc-300">Resumen del Reglamento (Opcional)</label>
                                        <textarea 
                                            value={formData.rules} 
                                            onChange={e => setFormData(s => ({ ...s, rules: e.target.value }))}
                                            placeholder="Ej. Prohibido bebidas en vaso de vidrio..."
                                            className="w-full min-h-[80px] rounded-md border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all custom-scrollbar resize-none"
                                        />
                                    </div>
                                    
                                    {/* PDF Upload Dropzone */}
                                    <div className="space-y-1.5 md:col-span-2 pt-2">
                                        <label className="text-sm font-medium text-zinc-300">Reglamento Oficial Aprobado (PDF)</label>
                                        <div className="relative border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950 hover:bg-zinc-900/80 rounded-2xl p-6 transition-all text-center flex flex-col items-center justify-center min-h-[140px] group/drop">
                                            {uploadingPdf ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-8 h-8 border-x-2 border-t-2 border-indigo-500 border-b-transparent rounded-full animate-spin" />
                                                    <p className="text-xs text-indigo-400 font-bold uppercase tracking-widest animate-pulse">Subiendo...</p>
                                                </div>
                                            ) : formData.rules_pdf_url ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl shadow-inner shadow-red-500/20">
                                                        <FileText size={32} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white leading-tight">Documento Oficial Vinculado</p>
                                                        <a href={formData.rules_pdf_url} target="_blank" rel="noreferrer" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:underline">Vista Previa</a>
                                                    </div>
                                                    <Button 
                                                        type="button" 
                                                        variant="ghost" 
                                                        onClick={() => setFormData(s => ({ ...s, rules_pdf_url: '' }))}
                                                        className="h-8 text-xs text-rose-400 hover:text-rose-300 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg mt-2 transition-colors"
                                                    >
                                                        Desvincular Archivo
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="p-3 bg-zinc-800/80 text-zinc-400 rounded-2xl mb-3 group-hover/drop:bg-indigo-500/20 group-hover/drop:text-indigo-400 transition-colors">
                                                        <Upload size={24} />
                                                    </div>
                                                    <p className="text-sm font-bold text-white mb-1"><span className="text-indigo-400">Haz clic para subir</span> o arrastra un PDF</p>
                                                    <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Documento vinculante de reglas de uso</p>
                                                    <input 
                                                        type="file" 
                                                        accept="application/pdf" 
                                                        onChange={handlePdfUpload}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </form>
                    </div>

                    <div className="p-5 border-t border-zinc-800/50 bg-zinc-900/80 flex justify-end gap-3">
                        <Button type="button" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-800" onClick={onClose} disabled={loading}>
                            Cancelar
                        </Button>
                        <Button type="submit" form="amenity-form" className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 min-w-[120px]" disabled={loading}>
                            {loading ? 'Guardando...' : (amenityToEdit ? 'Actualizar' : 'Crear Amenidad')}
                        </Button>
                    </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
        
        <style jsx global>{`
            .custom-scrollbar::-webkit-scrollbar { width: 6px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #3f3f46; border-radius: 20px; }
        `}</style>
        </>
    )
}
