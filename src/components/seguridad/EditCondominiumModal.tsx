'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Building, MapPin, Check, DollarSign, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Condominium, CreateCondominiumDTO } from '@/types/properties'
import { propertiesService } from '@/services/properties-service'
import { useUserRole } from '@/hooks/use-user-role'

interface EditCondominiumModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    condominium: Condominium
    updateProperty: (id: string, data: Partial<CreateCondominiumDTO>) => Promise<any>
}

export function EditCondominiumModal({ isOpen, onClose, onSuccess, condominium, updateProperty }: EditCondominiumModalProps) {
    const { isPropiedades } = useUserRole()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState<Partial<CreateCondominiumDTO>>({
        name: '',
        type: 'residential',
        country: 'México',
        state: '',
        city: '',
        address: '',
        units_total: 0,
        billing_day: 1,
        currency: 'MXN',
        status: 'active'
    })

    useEffect(() => {
        if (condominium) {
            setFormData({
                name: condominium.name,
                type: condominium.type,
                country: condominium.country || 'México',
                state: condominium.state || '',
                city: condominium.city || '',
                address: condominium.address || '',
                units_total: condominium.units_total,
                billing_day: condominium.billing_day || 1,
                currency: condominium.currency || 'MXN',
                status: condominium.status
            })
        }
    }, [condominium, isOpen])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'units_total' || name === 'billing_day' ? Number(value) : value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await updateProperty(condominium.id, formData)
            onSuccess()
            onClose()
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen) return null

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl pointer-events-auto flex flex-col max-h-[90vh]">
                            <div className="flex items-center justify-between border-b border-zinc-800 p-6">
                                <div>
                                    <h2 className="text-xl font-bold text-white">{isPropiedades ? 'Editar Propiedad' : 'Editar Condominio'}</h2>
                                    <p className="text-sm text-zinc-400">Actualiza la información operativa.</p>
                                </div>
                                <Button variant="ghost" size="icon" onClick={onClose} className="text-zinc-400 hover:text-white">
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* General Info */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                                        <Building className="h-4 w-4" /> Información General
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">{isPropiedades ? 'Nombre de la Propiedad' : 'Nombre del Condominio'}</label>
                                            <Input name="name" value={formData.name} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Tipo</label>
                                            <select
                                                name="type"
                                                value={formData.type}
                                                onChange={handleChange}
                                                className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                            >
                                                <option value="residential">Residencial</option>
                                                <option value="commercial">Comercial</option>
                                                <option value="mixed">Mixto</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-800" />

                                {/* Location */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                                        <MapPin className="h-4 w-4" /> Ubicación
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Ciudad</label>
                                            <Input name="city" value={formData.city || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Estado / Provincia</label>
                                            <Input name="state" value={formData.state || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-xs font-medium text-zinc-400">Dirección Completa</label>
                                            <Input name="address" value={formData.address || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-zinc-800" />

                                {/* Settings */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium">
                                        <Settings className="h-4 w-4" /> Configuración Operativa
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-3">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Total Unidades</label>
                                            <Input type="number" name="units_total" value={formData.units_total} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Fecha limite de pago mensual</label>
                                            <div className="relative mt-2">
                                                <Input type="number" name="billing_day" min={1} max={31} value={formData.billing_day || 1} onChange={handleChange} className="bg-zinc-950 border-zinc-800 pl-8" />
                                                <Check className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-zinc-400">Estado</label>
                                            <select
                                                name="status"
                                                value={formData.status}
                                                onChange={handleChange}
                                                className="w-full h-10 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                            >
                                                <option value="active">Activo</option>
                                                <option value="paused">Pausado</option>
                                                <option value="inactive">Inactivo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-zinc-800 p-6 flex justify-end gap-3">
                                <Button variant="outline" onClick={onClose} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                                    Cancelar
                                </Button>
                                <Button onClick={handleSubmit} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[140px]">
                                    {loading ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

