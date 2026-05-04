'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Save } from 'lucide-react'
import { propertiesService } from '@/services/properties-service'
import { Condominium, UpdateCondominiumDTO } from '@/types/properties'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserRole } from '@/hooks/use-user-role'

export function SettingsTab() {
    const { isPropiedades } = useUserRole()
    const params = useParams()
    const condominiumId = params.id as string

    const [loading, setLoading] = useState(false)
    const [condo, setCondo] = useState<Condominium | null>(null)

    // Local state for form
    const [formData, setFormData] = useState<Partial<UpdateCondominiumDTO>>({})
    const [toggles, setToggles] = useState({
        reminders5: false, reminders3: false, reminders1: false,
        late1: false, late3: false, late7: false,
        feeFixed: false, feePercentage: false, feeApply: false
    })

    const [feeInputs, setFeeInputs] = useState({
        fixedAmount: 50,
        percentageAmount: 5,
        applyAfterDays: 5
    })

    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

    useEffect(() => {
        fetchCondo()
    }, [condominiumId])

    const fetchCondo = async () => {
        const data = await propertiesService.getById(condominiumId)
        if (data) {
            setCondo(data)
            setFormData({
                name: data.name,
                billing_day: data.billing_day,
                units_total: data.units_total,
            })
        }

        const settings = await propertiesService.getSettings(condominiumId)
        if (settings) {
            setToggles({
                reminders5: settings.recordatorios_dias_antes?.includes(5) || false,
                reminders3: settings.recordatorios_dias_antes?.includes(3) || false,
                reminders1: settings.recordatorios_dias_antes?.includes(1) || false,
                late1: settings.morosidad_dias_despues?.includes(1) || false,
                late3: settings.morosidad_dias_despues?.includes(3) || false,
                late7: settings.morosidad_dias_despues?.includes(7) || false,
                feeFixed: settings.recargo_tipo === 'fijo',
                feePercentage: settings.recargo_tipo === 'porcentaje',
                feeApply: settings.recargo_activo || false
            })
            
            setFeeInputs(prev => ({
                ...prev,
                fixedAmount: settings.recargo_tipo === 'fijo' ? settings.recargo_valor : prev.fixedAmount,
                percentageAmount: settings.recargo_tipo === 'porcentaje' ? settings.recargo_valor : prev.percentageAmount,
                applyAfterDays: settings.recargo_dias_aplicar || prev.applyAfterDays
            }))
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: name === 'billing_day' || name === 'units_total' ? Number(value) : value
        }))
    }

    const handleSave = async () => {
        // 1. Obtener valores del formulario
        const recargo_tipo = toggles.feeFixed ? 'fijo' : (toggles.feePercentage ? 'porcentaje' : null)
        const recargo_valor = toggles.feeFixed ? feeInputs.fixedAmount : (toggles.feePercentage ? feeInputs.percentageAmount : 0)
        const recargo_dias_aplicar = feeInputs.applyAfterDays
        const recargo_activo = toggles.feeApply
        const condominio_id = condominiumId

        // 3. Validar antes de guardar
        if (recargo_tipo && recargo_valor <= 0) {
            setStatus({ type: 'error', message: 'El valor del recargo debe ser mayor a 0' })
            setTimeout(() => setStatus(null), 3000)
            return
        }
        if (recargo_activo && !recargo_tipo) {
            setStatus({ type: 'error', message: 'Selecciona Fijo o Porcentaje para activar el recargo' })
            setTimeout(() => setStatus(null), 3000)
            return
        }
        if (recargo_dias_aplicar < 0) {
            setStatus({ type: 'error', message: 'Días inválidos' })
            setTimeout(() => setStatus(null), 3000)
            return
        }

        try {
            setLoading(true)
            
            // Guardar configuración general
            await propertiesService.update(condominio_id, formData)

            // 2. Ejecutar UPDATE en base de datos
            await propertiesService.updateSettings(condominio_id, {
                recargo_tipo,
                recargo_valor,
                recargo_dias_aplicar,
                recargo_activo,
                // Opcional: También mandamos los de notificaciones
                recordatorios_dias_antes: [
                    ...(toggles.reminders5 ? [5] : []),
                    ...(toggles.reminders3 ? [3] : []),
                    ...(toggles.reminders1 ? [1] : [])
                ],
                morosidad_dias_despues: [
                    ...(toggles.late1 ? [1] : []),
                    ...(toggles.late3 ? [3] : []),
                    ...(toggles.late7 ? [7] : [])
                ]
            })

            // 7. Refrescar los datos del formulario después de guardar
            await fetchCondo() 
            
            // 4. Mostrar feedback Éxito
            setStatus({ type: 'success', message: 'Configuración guardada correctamente ✅' })
            setTimeout(() => setStatus(null), 3000)

        } catch (error) {
            console.error('Error saving:', error)
            // 4. Mostrar feedback Error / 6. Manejar errores de SQL/Conexión
            setStatus({ type: 'error', message: 'Error al guardar configuración ❌' })
            setTimeout(() => setStatus(null), 3000)
        } finally {
            // 5. Deshabilitar el botón temporalmente para evitar doble clic
            setLoading(false)
        }
    }

    if (!condo) return <div className="p-4 text-zinc-400">Cargando configuración...</div>

    return (
        <div className="space-y-6 max-w-4xl">
            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Configuración General</CardTitle>
                    <CardDescription>{isPropiedades ? 'Ajustes principales de la propiedad.' : 'Ajustes principales del condominio.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <motion.div 
                        whileHover={{ y: -2, scale: 1.002 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-blue-500/30 hover:bg-zinc-900/40 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-colors space-y-4"
                    >
                        <div className="grid gap-4 md:grid-cols-2">
                            <Input
                                label={isPropiedades ? 'Nombre de la Propiedad' : 'Nombre del Condominio'}
                                name="name"
                                value={formData.name || ''}
                                onChange={handleChange}
                            />
                            <Input
                                label="Fecha limite de pago mensual"
                                type="number"
                                name="billing_day"
                                value={formData.billing_day || ''}
                                onChange={handleChange}
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Input
                                label="Total Unidades Estimadas"
                                type="number"
                                name="units_total"
                                value={formData.units_total || ''}
                                onChange={handleChange}
                            />
                            <Input label="Moneda" defaultValue={condo.currency} disabled />
                        </div>
                    </motion.div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle>Notificaciones</CardTitle>
                    <CardDescription>Configura los recordatorios automáticos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <motion.div 
                        whileHover={{ y: -2, scale: 1.005 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-indigo-500/30 hover:bg-zinc-900/40 hover:shadow-[0_0_15px_rgba(79,70,229,0.1)] transition-colors"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <p className="font-medium text-white flex items-center gap-2">🧾 Recordatorios de pago</p>
                        </div>
                        <div className="text-sm text-zinc-500 w-full pl-6">
                            <p className="mb-3 text-zinc-400">Enviar:</p>
                            <ul className="space-y-3">
                                <li className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                        <span>5 días antes</span>
                                    </div>
                                    <Switch checked={toggles.reminders5} onCheckedChange={(s) => setToggles({...toggles, reminders5: s})} />
                                </li>
                                <li className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                        <span>3 días antes</span>
                                    </div>
                                    <Switch checked={toggles.reminders3} onCheckedChange={(s) => setToggles({...toggles, reminders3: s})} />
                                </li>
                                <li className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                        <span>1 día antes</span>
                                    </div>
                                    <Switch checked={toggles.reminders1} onCheckedChange={(s) => setToggles({...toggles, reminders1: s})} />
                                </li>
                            </ul>
                        </div>
                    </motion.div>
                    <motion.div 
                        whileHover={{ y: -2, scale: 1.005 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-amber-500/30 hover:bg-zinc-900/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.1)] transition-colors"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <p className="font-medium text-white flex items-center gap-2">⚠️ Morosidad</p>
                        </div>
                        <div className="text-sm text-zinc-500 w-full pl-6">
                            <p className="mb-3 text-zinc-400">Enviar:</p>
                            <ul className="space-y-3">
                                <li className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                        <span>1 día después</span>
                                    </div>
                                    <Switch checked={toggles.late1} onCheckedChange={(s) => setToggles({...toggles, late1: s})} />
                                </li>
                                <li className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                        <span>3 días después</span>
                                    </div>
                                    <Switch checked={toggles.late3} onCheckedChange={(s) => setToggles({...toggles, late3: s})} />
                                </li>
                                <li className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                        <span>7 días después</span>
                                    </div>
                                    <Switch checked={toggles.late7} onCheckedChange={(s) => setToggles({...toggles, late7: s})} />
                                </li>
                            </ul>
                        </div>
                    </motion.div>
                    <motion.div 
                        whileHover={{ y: -2, scale: 1.005 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col p-4 rounded-xl bg-zinc-950/50 border border-zinc-800 hover:border-emerald-500/30 hover:bg-zinc-900/40 hover:shadow-[0_0_15px_rgba(16,185,129,0.1)] transition-colors"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <p className="font-medium text-white flex items-center gap-2">💰 Recargo por mora</p>
                        </div>
                        <div className="text-sm text-zinc-500 w-full pl-6">
                            <ul className="space-y-4">
                                <li>
                                    <p className="mb-3 text-zinc-400">Tipo de recargo:</p>
                                    <ul className="space-y-3 pl-2 border-l-2 border-zinc-800">
                                        <li className="flex items-center justify-between pl-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                                <span className="flex items-center gap-2">
                                                    Fijo ($ <input type="number" className="w-16 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white h-7 text-xs outline-none focus:border-indigo-500" value={feeInputs.fixedAmount} onChange={(e) => setFeeInputs({...feeInputs, fixedAmount: Number(e.target.value)})} /> )
                                                </span>
                                            </div>
                                            <Switch checked={toggles.feeFixed} onCheckedChange={(s) => setToggles({...toggles, feeFixed: s, feePercentage: s ? false : toggles.feePercentage})} />
                                        </li>
                                        <li className="flex items-center justify-between pl-3">
                                            <div className="flex items-center gap-3">
                                                <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                                <span className="flex items-center gap-2">
                                                    Porcentaje (<input type="number" className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white h-7 text-xs outline-none focus:border-indigo-500" value={feeInputs.percentageAmount} onChange={(e) => setFeeInputs({...feeInputs, percentageAmount: Number(e.target.value)})} /> %)
                                                </span>
                                            </div>
                                            <Switch checked={toggles.feePercentage} onCheckedChange={(s) => setToggles({...toggles, feePercentage: s, feeFixed: s ? false : toggles.feeFixed})} />
                                        </li>
                                    </ul>
                                </li>
                                <li className="pt-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                                            <span className="flex items-center gap-2 whitespace-nowrap">
                                                Aplicar después de <input type="number" className="w-14 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white h-7 text-xs outline-none focus:border-indigo-500" value={feeInputs.applyAfterDays} onChange={(e) => setFeeInputs({...feeInputs, applyAfterDays: Number(e.target.value)})} /> días de atraso
                                            </span>
                                        </div>
                                        <Switch checked={toggles.feeApply} onCheckedChange={(s) => setToggles({...toggles, feeApply: s})} />
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </motion.div>
                </CardContent>
            </Card>

            <div className="flex justify-end items-center gap-4">
                <AnimatePresence>
                    {status && (
                        <motion.p
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`text-sm font-medium flex items-center gap-2 ${status.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}
                        >
                            {status.message}
                        </motion.p>
                    )}
                </AnimatePresence>
                <Button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
                >
                    {loading ? <div className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" /> : <Save className="h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </div>
        </div>
    )
}

