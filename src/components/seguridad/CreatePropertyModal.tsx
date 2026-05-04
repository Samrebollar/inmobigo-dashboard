

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Building, MapPin, Check, ArrowRight, ArrowLeft, DollarSign, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClient } from '@/utils/supabase/client'
import { CreateCondominiumDTO } from '@/types/properties'
import { useProperties } from '@/hooks/use-properties'
import { useUserRole } from '@/hooks/use-user-role'

interface CreatePropertyModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    orgId: string | null
    createProperty: (data: CreateCondominiumDTO) => Promise<any>
}

const steps = [
    { id: 1, title: 'Información General', icon: Building },
    { id: 2, title: 'Ubicación', icon: MapPin },
    { id: 3, title: 'Operación', icon: Settings },
    { id: 4, title: 'Finanzas', icon: DollarSign },
]

export function CreatePropertyModal({ isOpen, onClose, onSuccess, orgId, createProperty }: CreatePropertyModalProps) {
    const { isPropiedades } = useUserRole()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState(1)
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

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1)
            setError(null)
            setFormData({
                name: '', type: 'residential', country: 'México', state: '', city: '', address: '',
                units_total: 0, billing_day: 1, currency: 'MXN', status: 'active'
            })
        }
    }, [isOpen])

    const handleNext = () => {
        if (step < 4) setStep(step + 1)
    }

    const handleBack = () => {
        if (step > 1) setStep(step - 1)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!orgId) {
            setError('No se pudo identificar tu organización. Contacta a soporte.')
            return
        }

        setLoading(true)
        setError(null)
        try {
            const slug = formData.name?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') || ''

            console.log('Attempting to create property:', { ...formData, organization_id: orgId, slug })

            const result = await createProperty({
                ...formData as CreateCondominiumDTO,
                organization_id: orgId,
                slug,
            })

            console.log('Property created successfully:', result)

            onSuccess()
            onClose()
        } catch (err: any) {
            console.error('Submit property error:', err)
            setError(err.message || 'Error desconocido al crear el condominio')
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
                        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-zinc-800 p-6 bg-zinc-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-white">{isPropiedades ? 'Nueva Propiedad' : 'Nuevo Condominio'}</h2>
                                <p className="text-sm text-zinc-400">Paso {step} de 4: {steps[step - 1].title}</p>
                            </div>
                            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-1 w-full bg-zinc-800">
                            <motion.div
                                className="h-full bg-indigo-500"
                                initial={{ width: '25%' }}
                                animate={{ width: `${step * 25}%` }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 min-h-[400px] flex flex-col justify-between">
                            <div className="space-y-6">
                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex items-start gap-3"
                                    >
                                        <X className="h-5 w-5 mt-0.5 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-red-300">Error al guardar</p>
                                            <p className="opacity-80">{error}</p>
                                            <p className="mt-2 text-[10px] uppercase tracking-wider text-red-400/50">Verifica que las tablas existan en Supabase</p>
                                        </div>
                                    </motion.div>
                                )}
                                <AnimatePresence mode="wait">
                                    {step === 1 && (
                                        <motion.div
                                            key="step1"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-4"
                                        >
                                            <Input
                                                label={isPropiedades ? 'Nombre de la Propiedad' : 'Nombre del Condominio'}
                                                placeholder={isPropiedades ? 'Ej. Departamento en Polanco' : 'Ej. Torres del Valle'}
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                required
                                                autoFocus
                                                className="text-lg"
                                            />
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-zinc-400">Tipo de Propiedad</label>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {['residential', 'commercial', 'mixed'].map((type) => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, type: type as any })}
                                                            className={`flex flex-col items-center justify-center rounded-xl border p-4 transition-all ${formData.type === type
                                                                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400'
                                                                : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800'
                                                                }`}
                                                        >
                                                            <span className="capitalize text-sm font-medium">
                                                                {type === 'residential' ? 'Residencial' : type === 'commercial' ? 'Comercial' : 'Mixto'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 2 && (
                                        <motion.div
                                            key="step2"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-4"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    label="País"
                                                    value={formData.country}
                                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                                />
                                                <Input
                                                    label="Estado / Provincia"
                                                    placeholder="Ej. CDMX"
                                                    value={formData.state}
                                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    label="Ciudad"
                                                    placeholder="Ej. Ciudad de México"
                                                    value={formData.city}
                                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                                />
                                                <Input
                                                    label="Código Postal"
                                                    placeholder="00000"
                                                />
                                            </div>
                                            <Input
                                                label="Dirección Completa"
                                                placeholder="Calle, Número, Colonia"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </motion.div>
                                    )}

                                    {step === 3 && (
                                        <motion.div
                                            key="step3"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-4"
                                        >
                                            <Input
                                                label="Total de Unidades"
                                                type="number"
                                                placeholder="Ej. 50"
                                                value={formData.units_total || ''}
                                                onChange={(e) => setFormData({ ...formData, units_total: parseInt(e.target.value) || 0 })}
                                            />
                                            <div>
                                                <label className="mb-2 block text-sm font-medium text-zinc-400">Fecha limite de pago mensual</label>
                                                <div className="flex items-center gap-4 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
                                                        <CalendarIcon className="h-5 w-5" />
                                                    </div>
                                                    <input
                                                        type="range"
                                                        min="1"
                                                        max="30"
                                                        value={formData.billing_day}
                                                        onChange={(e) => setFormData({ ...formData, billing_day: parseInt(e.target.value) })}
                                                        className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                                    />
                                                    <span className="text-xl font-bold text-white w-12 text-center">{formData.billing_day}</span>
                                                </div>
                                                <p className="mt-2 text-xs text-zinc-500">Día del mes en que se generarán los cobros automáticamente.</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    {step === 4 && (
                                        <motion.div
                                            key="step4"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-4"
                                        >
                                            <label className="mb-2 block text-sm font-medium text-zinc-400">Moneda Base</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                {['MXN', 'USD'].map((curr) => (
                                                    <button
                                                        key={curr}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, currency: curr as any })}
                                                        className={`flex items-center justify-center gap-2 rounded-xl border p-4 transition-all ${formData.currency === curr
                                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                                            : 'border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700'
                                                            }`}
                                                    >
                                                        <DollarSign className="h-4 w-4" />
                                                        <span className="font-bold">{curr}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                                                <h4 className="flex items-center gap-2 font-medium text-blue-400">
                                                    <Settings className="h-4 w-4" />
                                                    Configuración Final
                                                </h4>
                                                <p className="mt-1 text-sm text-blue-300/70">
                                                    {isPropiedades 
                                                        ? 'La propiedad se creará como Activa y podrás comenzar a agregar unidades de renta inmediatamente.'
                                                        : 'El condominio se creará como Activo y podrás comenzar a agregar unidades inmediatamente.'}
                                                </p>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="flex justify-between pt-6 border-t border-zinc-800 mt-6">
                                {step > 1 ? (
                                    <Button type="button" variant="ghost" onClick={handleBack} className="gap-2">
                                        <ArrowLeft className="h-4 w-4" /> Atrás
                                    </Button>
                                ) : (<div />)}

                                {step < 4 ? (
                                    <Button type="button" onClick={handleNext} className="gap-2 bg-indigo-600">
                                        Siguiente <ArrowRight className="h-4 w-4" />
                                    </Button>
                                ) : (
                                    <Button type="submit" isLoading={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white">
                                        <Check className="h-4 w-4" /> {isPropiedades ? 'Crear Propiedad' : 'Crear Condominio'}
                                    </Button>
                                )}
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
    )
}

