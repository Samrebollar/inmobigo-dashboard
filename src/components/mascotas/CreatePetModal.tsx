'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { createPetServer } from '@/app/actions/pet-actions'
import { PawPrint, X, UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface CreatePetModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    resident: any
}

const ESPECIES = [
    { id: 'perro', label: 'Perro' },
    { id: 'gato', label: 'Gato' },
    { id: 'otro', label: 'Otro' },
]

const TAMANOS = [
    { id: 'chico', label: 'Chico' },
    { id: 'mediano', label: 'Mediano' },
    { id: 'grande', label: 'Grande' },
]

export function CreatePetModal({ isOpen, onClose, onSuccess, resident }: CreatePetModalProps) {
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [dragActive, setDragActive] = useState(false)

    const [formData, setFormData] = useState({
        name: '',
        species: 'perro',
        breed: '',
        color: '',
        size: 'mediano',
    })

    const handleFile = (file: File) => {
        if (file && file.type.startsWith('image/')) {
            setSelectedFile(file)
            const reader = new FileReader()
            reader.onloadend = () => setImagePreview(reader.result as string)
            reader.readAsDataURL(file)
        } else {
            toast.error('Por favor, selecciona un archivo de imagen valido.')
        }
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
    }

    const resetForm = () => {
        setFormData({ name: '', species: 'perro', breed: '', color: '', size: 'mediano' })
        setSelectedFile(null)
        setImagePreview(null)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name) return toast.error('Ponle un nombre a tu mascota.')
        if (!resident?.id || !resident?.organization_id || !resident?.condominium_id) {
            return toast.error('No se pudo determinar tu perfil de residente. Contacta al administrador.')
        }

        try {
            setLoading(true)
            let photoUrl = ''

            if (selectedFile) {
                setIsUploading(true)
                const fileExt = selectedFile.name.split('.').pop()
                const fileName = `${resident.id}-${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `mascotas/${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('pet_photos')
                    .upload(filePath, selectedFile, { cacheControl: '3600', upsert: false })

                if (uploadError) {
                    throw new Error('Error al subir la foto: ' + uploadError.message)
                }

                const { data: { publicUrl } } = supabase.storage.from('pet_photos').getPublicUrl(filePath)
                photoUrl = publicUrl
                setIsUploading(false)
            }

            const result = await createPetServer({
                organization_id: resident.organization_id,
                condominium_id: resident.condominium_id,
                resident_id: resident.id,
                unit_id: resident.unit_id || undefined,
                name: formData.name,
                species: formData.species,
                breed: formData.breed || undefined,
                color: formData.color || undefined,
                size: formData.size || undefined,
                photo_url: photoUrl || undefined,
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            toast.success('Mascota registrada con exito.')
            onSuccess()
            onClose()
            resetForm()
        } catch (error: any) {
            console.error('Error creating pet:', error)
            toast.error(error.message || 'Ocurrio un error al registrar tu mascota.')
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
                            <div className="p-3 bg-amber-600/10 border border-amber-500/20 rounded-2xl text-amber-400">
                                <PawPrint size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-tight leading-none">Registrar Mascota</h2>
                                <p className="text-zinc-400 text-xs mt-1">Agrega a tu mascota al directorio de tu privada.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-zinc-800/50 hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Nombre</label>
                            <input
                                required
                                type="text"
                                placeholder="Ej. Firulais"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Tipo</label>
                            <div className="flex flex-wrap gap-2">
                                {ESPECIES.map(sp => (
                                    <button
                                        key={sp.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, species: sp.id })}
                                        className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${formData.species === sp.id
                                            ? 'bg-amber-600/20 text-amber-400 border-amber-500/40 shadow-lg'
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                            }`}
                                    >
                                        {sp.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Raza (opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Labrador"
                                    value={formData.breed}
                                    onChange={e => setFormData({ ...formData, breed: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Color (opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Cafe con blanco"
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 text-white text-sm font-bold placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Tamano</label>
                            <div className="flex gap-2">
                                {TAMANOS.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, size: t.id })}
                                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${formData.size === t.id
                                            ? 'bg-amber-600/20 text-amber-400 border-amber-500/40 shadow-md scale-105'
                                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                            }`}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1">Foto (opcional)</label>
                            <div
                                className={`w-full border-2 border-dashed rounded-2xl p-6 transition-all relative ${dragActive ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-950 hover:bg-zinc-900/50 hover:border-zinc-700'
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
                                            <Loader2 size={24} className="animate-spin text-amber-500" />
                                            <p className="text-xs font-bold text-amber-400">Subiendo foto...</p>
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
                                                <p className="text-xs font-bold text-zinc-300">Arrastra una foto aqui o haz clic para buscar</p>
                                                <p className="text-[10px] text-zinc-500 mt-1">Soporta PNG, JPEG, JPG</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold text-zinc-400 hover:text-white">
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading || isUploading}
                                className="bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-black px-6 shadow-lg shadow-amber-600/20"
                            >
                                {loading ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
                                Registrar Mascota
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
