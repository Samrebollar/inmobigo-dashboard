'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateUnitDTO, Unit } from '@/types/units'
import { unitsService } from '@/services/units-service'

import { useDemoMode } from '@/hooks/use-demo-mode'

interface CreateUnitModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (newUnit?: Unit) => void
    condominiumId: string
    unitToEdit?: Unit | null
}

export function CreateUnitModal({ isOpen, onClose, onSuccess, condominiumId, unitToEdit }: CreateUnitModalProps) {
    const [loading, setLoading] = useState(false)
    const { isDemo } = useDemoMode()

    const [formData, setFormData] = useState<Partial<CreateUnitDTO>>({
        unit_number: '',
        floor: '',
        type: 'apartment',
        status: 'vacant'
    })

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            if (unitToEdit) {
                setFormData({
                    unit_number: unitToEdit.unit_number,
                    floor: unitToEdit.floor,
                    type: unitToEdit.type,
                    status: unitToEdit.status
                })
            } else {
                setFormData({
                    unit_number: '',
                    floor: '',
                    type: 'apartment',
                    status: 'vacant'
                })
            }
        }
    }, [isOpen, unitToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            let result: Unit
            if (unitToEdit) {
                result = await unitsService.update(unitToEdit.id, {
                    ...formData as UpdateUnitDTO,
                })
            } else {
                result = await unitsService.create({
                    ...formData as CreateUnitDTO,
                    condominium_id: condominiumId
                })
            }
            onSuccess(result)
            onClose()
        } catch (error: any) {
            console.error('CreateUnitModal Error (RAW):', error)
            alert(`Error al guardar unidad: ${error.message || 'Error desconocido'}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
                    >
                        <div className="flex items-center justify-between border-b border-zinc-800 p-6 bg-zinc-900/50">
                            <h2 className="text-xl font-bold text-white">
                                {unitToEdit ? 'Editar Unidad' : 'Nueva Unidad'}
                            </h2>
                            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <Input
                                label="Número / Nombre de Unidad"
                                placeholder="Ej. A-101"
                                value={formData.unit_number}
                                onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
                                required
                                autoFocus
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Piso / Nivel"
                                    placeholder="Ej. 1"
                                    value={formData.floor}
                                    onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                                    required
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-400">Tipo de Unidad</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                        className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    >
                                        <option value="apartment">Departamento</option>
                                        <option value="house">Casa</option>
                                        <option value="commercial">Local Comercial</option>
                                        <option value="parking">Estacionamiento</option>
                                        <option value="storage">Bodega</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Estado</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['vacant', 'occupied', 'maintenance'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: status as any })}
                                            className={`rounded-lg border p-2 text-sm transition-all ${formData.status === status
                                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                                                : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                                                }`}
                                        >
                                            <span className="capitalize">
                                                {status === 'vacant' ? 'Disponible' : status === 'occupied' ? 'Ocupada' : 'Mantenimiento'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" isLoading={loading} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
                                    <Check className="h-4 w-4" />
                                    {unitToEdit ? 'Actualizar Unidad' : 'Guardar Unidad'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
