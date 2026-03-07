'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Plus, Trash2, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CreateResidentDTO, Resident } from '@/types/residents'
import { residentsService } from '@/services/residents-service'
import { unitsService } from '@/services/units-service'
import { Unit } from '@/types/units'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { normalizeMexicanPhone } from '@/utils/phone-utils'

interface CreateResidentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: (newResident?: Resident) => void
    condominiumId: string
    residentToEdit?: Resident | null
}

export function CreateResidentModal({ isOpen, onClose, onSuccess, condominiumId, residentToEdit }: CreateResidentModalProps) {
    const [loading, setLoading] = useState(false)
    const [units, setUnits] = useState<Unit[]>([])
    const { isDemo } = useDemoMode()

    const [formData, setFormData] = useState<Partial<CreateResidentDTO>>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        status: 'active',
        unit_id: '',
        debt_amount: 0,
        vehicles: []
    })

    const addVehicle = () => {
        const currentVehicles = formData.vehicles || []
        setFormData({
            ...formData,
            vehicles: [...currentVehicles, { plate: '', brand: '', color: '' }]
        })
    }

    const removeVehicle = (index: number) => {
        const currentVehicles = formData.vehicles || []
        setFormData({
            ...formData,
            vehicles: currentVehicles.filter((_, i) => i !== index)
        })
    }

    const updateVehicle = (index: number, field: string, value: string) => {
        const currentVehicles = [...(formData.vehicles || [])]
        currentVehicles[index] = { ...currentVehicles[index], [field]: value }
        setFormData({ ...formData, vehicles: currentVehicles })
    }

    // Fetch units and set form data
    useEffect(() => {
        if (isOpen) {
            unitsService.getByCondominium(condominiumId).then(setUnits)

            if (residentToEdit) {
                setFormData({
                    first_name: residentToEdit.first_name,
                    last_name: residentToEdit.last_name,
                    email: residentToEdit.email,
                    phone: residentToEdit.phone,
                    status: residentToEdit.status,
                    unit_id: residentToEdit.unit_id || '',
                    debt_amount: residentToEdit.debt_amount || 0,
                    vehicles: residentToEdit.vehicles || []
                })
            } else {
                setFormData({
                    first_name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    status: 'active',
                    unit_id: '',
                    debt_amount: 0,
                    vehicles: []
                })
            }
        }
    }, [isOpen, condominiumId, residentToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const normalizedPhone = normalizeMexicanPhone(formData.phone || '')

            // Prepare common data
            const submitData = {
                ...formData,
                phone: normalizedPhone,
                unit_id: formData.unit_id === '' ? null : formData.unit_id
            }

            let result: Resident
            if (residentToEdit) {
                // Remove vehicles for update as it goes directly to the residents table
                const { vehicles, ...updatePayload } = submitData
                result = await residentsService.update(residentToEdit.id, updatePayload)
            } else {
                // Service.create handles both resident and vehicles
                result = await residentsService.create({
                    ...submitData as CreateResidentDTO,
                    condominium_id: condominiumId,
                })
            }
            onSuccess(result)
            onClose()
        } catch (error: any) {
            console.error('Error saving resident:', error)

            if (error.code === '23505' || error.message?.includes('residents_email_key')) {
                alert('Este correo electrónico ya está registrado para otro residente.')
            } else {
                alert(`Error al guardar residente: ${error.message || 'Error desconocido'}`)
            }
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
                                {residentToEdit ? 'Editar Residente' : 'Nuevo Residente'}
                            </h2>
                            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Nombre"
                                    placeholder="Ej. Juan"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    required
                                    autoFocus
                                />
                                <Input
                                    label="Apellidos"
                                    placeholder="Ej. Pérez"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    required
                                />
                            </div>

                            <Input
                                label="Email"
                                type="email"
                                placeholder="juan@ejemplo.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                            />

                            <Input
                                label="Saldo Pendiente (MXN)"
                                type="number"
                                placeholder="0.00"
                                value={formData.debt_amount || ''}
                                onChange={(e) => setFormData({ ...formData, debt_amount: parseFloat(e.target.value) })}
                                min="0"
                                step="0.01"
                            />

                            <Input
                                label="Teléfono"
                                placeholder="+52 55 1234 5678"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                required
                            />

                            <div>
                                <label className="mb-2 block text-sm font-medium text-zinc-400">Asignar Unidad (Opcional)</label>
                                <select
                                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={formData.unit_id}
                                    onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                                >
                                    <option value="">Sin asignar</option>
                                    {units.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.unit_number} {unit.floor ? `(Piso ${unit.floor})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-zinc-400">Estado</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['active', 'inactive', 'delinquent'].map((status) => (
                                        <button
                                            key={status}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, status: status as any })}
                                            className={`rounded-lg border p-2 text-sm transition-all ${formData.status === status
                                                ? status === 'delinquent'
                                                    ? 'border-rose-500 bg-rose-500/10 text-rose-400'
                                                    : 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                                                : 'border-zinc-800 bg-zinc-900 text-zinc-500 hover:bg-zinc-800'
                                                }`}
                                        >
                                            <span className="capitalize">
                                                {status === 'active' ? 'Activo' : status === 'inactive' ? 'Inactivo' : 'Moroso'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                                        <Car className="h-4 w-4" /> Vehículos
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addVehicle}
                                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                    >
                                        <Plus className="h-3 w-3" /> Agregar
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.vehicles?.map((vehicle, index) => (
                                        <div key={index} className="flex gap-2 items-start p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                                            <div className="grid grid-cols-3 gap-2 flex-1">
                                                <input
                                                    placeholder="Placas"
                                                    className="bg-transparent border-b border-zinc-700 text-sm py-1 focus:outline-none focus:border-indigo-500 text-white"
                                                    value={vehicle.plate}
                                                    onChange={(e) => updateVehicle(index, 'plate', e.target.value)}
                                                    required
                                                />
                                                <input
                                                    placeholder="Marca/Modelo"
                                                    className="bg-transparent border-b border-zinc-700 text-sm py-1 focus:outline-none focus:border-indigo-500 text-white"
                                                    value={vehicle.brand}
                                                    onChange={(e) => updateVehicle(index, 'brand', e.target.value)}
                                                />
                                                <input
                                                    placeholder="Color"
                                                    className="bg-transparent border-b border-zinc-700 text-sm py-1 focus:outline-none focus:border-indigo-500 text-white"
                                                    value={vehicle.color}
                                                    onChange={(e) => updateVehicle(index, 'color', e.target.value)}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeVehicle(index)}
                                                className="text-zinc-500 hover:text-rose-400 p-1"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {(!formData.vehicles || formData.vehicles.length === 0) && (
                                        <div className="text-center py-4 border border-dashed border-zinc-800 rounded-lg text-zinc-600 text-sm">
                                            Sin vehículos registrados
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" isLoading={loading} className="w-full gap-2 bg-indigo-600 hover:bg-indigo-500 text-white">
                                    <Check className="h-4 w-4" />
                                    {residentToEdit ? 'Actualizar Residente' : 'Guardar Residente'}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
