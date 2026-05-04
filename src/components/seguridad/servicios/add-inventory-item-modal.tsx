'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, 
    Package, 
    Home, 
    Tag, 
    AlertCircle, 
    Check, 
    ChevronDown, 
    Camera,
    Upload,
    ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { demoDb } from '@/utils/demo-db'

interface AddInventoryItemModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    editingItem?: any
}

export function AddInventoryItemModal({ isOpen, onClose, onSuccess, editingItem }: AddInventoryItemModalProps) {
    const [properties, setProperties] = useState<any[]>([])
    const [formData, setFormData] = useState({
        name: '',
        property_id: '',
        status: 'good' as 'good' | 'fair' | 'damaged',
        notes: '',
        image_url: ''
    })
    const [isSaving, setIsSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setProperties(demoDb.getProperties())
            if (editingItem) {
                setFormData({
                    name: editingItem.name,
                    property_id: editingItem.property_id,
                    status: editingItem.status,
                    notes: editingItem.notes || '',
                    image_url: editingItem.image_url || ''
                })
            } else {
                setFormData({
                    name: '',
                    property_id: '',
                    status: 'good',
                    notes: '',
                    image_url: ''
                })
            }
        }
    }, [isOpen, editingItem])

    const handleSave = async () => {
        if (!formData.name || !formData.property_id) {
            toast.error('Nombre y propiedad son obligatorios')
            return
        }

        setIsSaving(true)
        try {
            const property = properties.find(p => p.id === formData.property_id)
            const item = {
                id: editingItem?.id || `inv-${Date.now()}`,
                ...formData,
                property_name: property?.name || 'Propiedad desconocida',
                created_at: editingItem?.created_at || new Date().toISOString()
            }

            demoDb.saveInventoryItem(item)
            toast.success(editingItem ? 'Artículo actualizado' : 'Artículo agregado al inventario')
            onSuccess()
            onClose()
        } catch (error) {
            toast.error('Error al guardar el artículo')
        } finally {
            setIsSaving(false)
        }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            // Simulamos subida con un DataURL para el demo
            const reader = new FileReader()
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image_url: reader.result as string }))
            }
            reader.readAsDataURL(file)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
                >
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                                    <Package size={28} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white tracking-tight leading-none">
                                        {editingItem ? 'Editar Artículo' : 'Nuevo Artículo'}
                                    </h2>
                                    <p className="text-zinc-500 text-sm font-medium mt-1">Registra activos en tus propiedades</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-2xl transition-all">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6 pb-6">
                            {/* Image Upload Area */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Foto del Item</label>
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="relative h-40 bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-3xl overflow-hidden cursor-pointer group hover:border-emerald-500/50 transition-all flex items-center justify-center"
                                >
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Vista previa" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-2 text-zinc-600 transition-colors group-hover:text-zinc-400">
                                            <Camera size={32} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Subir Imagen</span>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        className="hidden" 
                                        accept="image/*" 
                                    />
                                    {formData.image_url && (
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <Upload className="text-white" size={24} />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Nombre del Item</label>
                                <div className="relative">
                                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <input 
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="Ej. Aire Acondicionado / Refrigerador"
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Propiedad Asociada</label>
                                <div className="relative">
                                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                                    <select 
                                        value={formData.property_id}
                                        onChange={(e) => setFormData(prev => ({ ...prev, property_id: e.target.value }))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="">Selecciona propiedad</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Estado de Conservación</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'good', label: 'Bueno', color: 'emerald' },
                                        { id: 'fair', label: 'Regular', color: 'amber' },
                                        { id: 'damaged', label: 'Dañado', color: 'rose' }
                                    ].map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => setFormData(prev => ({ ...prev, status: s.id as any }))}
                                            className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                formData.status === s.id 
                                                ? `bg-${s.color}-500/20 border-${s.color}-500 text-${s.color}-400 shadow-lg` 
                                                : 'bg-zinc-950 border-zinc-800 text-zinc-600 hover:text-zinc-400'
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Notas de Estado</label>
                                <textarea 
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Detalles sobre el estado actual, marca, modelo o fallas registradas..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium min-h-[80px] resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <Button 
                                variant="ghost" 
                                onClick={onClose}
                                className="flex-1 h-14 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl uppercase tracking-widest text-xs transition-all"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check size={18} /> 
                                        {editingItem ? 'Actualizar' : 'Agregar Item'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}

