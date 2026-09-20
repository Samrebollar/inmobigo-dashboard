'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Save, Zap, Plus, Trash2 } from 'lucide-react'
import { propertiesService } from '@/services/properties-service'
import { Condominium, UpdateCondominiumDTO } from '@/types/properties'
import { motion, AnimatePresence } from 'framer-motion'
import { useUserRole } from '@/hooks/use-user-role'
import { MpCondominioConfig } from '@/components/integrations/mp-condominio-config'
import { AmenityModal } from '@/components/settings/AmenityModal'
import { getAmenitiesByCondominiumAction, saveAmenityAction, deleteAmenityAction } from '@/app/actions/service-actions'
import { toast } from 'sonner'

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

    // Amenities State
    const [amenities, setAmenities] = useState<any[]>([])
    const [loadingAmenities, setLoadingAmenities] = useState(false)
    const [showAmenityModal, setShowAmenityModal] = useState(false)
    const [editingAmenity, setEditingAmenity] = useState<any>(null)

    useEffect(() => {
        fetchCondo()
    }, [condominiumId])

    const fetchAmenities = async (organizationId: string) => {
        if (!condominiumId) return
        setLoadingAmenities(true)
        try {
            const result = await getAmenitiesByCondominiumAction(condominiumId, organizationId)
            if (result.success && result.data) {
                setAmenities(result.data)
            } else {
                console.error('Error fetching amenities:', result.error)
            }
        } catch (e) {
            console.error('Error fetching amenities:', e)
        } finally {
            setLoadingAmenities(false)
        }
    }

    const handleSaveAmenity = async (amenityData: any) => {
        try {
            const result = await saveAmenityAction(amenityData)

            if (!result.success) {
                throw new Error(result.error || 'Error al guardar amenidad')
            }

            const data = result.data
            setAmenities(prev => {
                const exists = prev.find(a => a.id === data.id)
                if (exists) return prev.map(a => a.id === data.id ? data : a)
                return [...prev, data]
            })
            toast.success(amenityData.id ? 'Amenidad actualizada' : 'Amenidad creada')
        } catch (e: any) {
            console.error('Error saving amenity:', e)
            toast.error('Error guardando amenidad: ' + e.message)
            throw e
        }
    }

    const handleDeleteAmenity = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm('¿Seguro de que deseas eliminar esta amenidad? Se perderá el acceso a futuras reservas en este espacio.')) return
        try {
            const result = await deleteAmenityAction(id)
            if (!result.success) throw new Error(result.error)

            setAmenities(prev => prev.filter(a => a.id !== id))
            toast.success('Espacio eliminado permanentemente')
        } catch (e: any) {
            console.error('Error deleting amenity:', e)
            toast.error('Error eliminando amenidad: ' + e.message)
        }
    }

    const fetchCondo = async () => {
        const data = await propertiesService.getById(condominiumId)
        if (data) {
            setCondo(data)
            setFormData({
                name: data.name,
                billing_day: data.billing_day,
                units_total: data.units_total,
            })
            fetchAmenities(data.organization_id)
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

            <MpCondominioConfig condominiumId={condominiumId} condominiumName={condo.name} />

            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-indigo-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:to-emerald-500/5 transition-colors duration-700 pointer-events-none" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 relative z-10">
                    <div>
                        <CardTitle className="text-white flex items-center gap-2">
                            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <Zap className="h-5 w-5" />
                            </span>
                            Espacios y Amenidades
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Crea instalaciones reservables (Gimnasio, Salón de Eventos) propias de {isPropiedades ? 'esta propiedad' : 'este condominio'} y configura sus costos y normativas.
                        </CardDescription>
                    </div>
                    <Button
                        onClick={() => { setEditingAmenity(null); setShowAmenityModal(true); }}
                        className="whitespace-nowrap shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-400/30 px-6 transition-all duration-300"
                    >
                        Registrar Amenidad
                    </Button>
                </CardHeader>
                <CardContent className="space-y-6 relative z-10">
                    <div className="grid gap-4 md:grid-cols-2">
                        {loadingAmenities ? (
                            <div className="text-zinc-500 text-sm py-4 animate-pulse md:col-span-2">Cargando amenidades...</div>
                        ) : amenities.length === 0 ? (
                            <div className="border border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-900/50 md:col-span-2">
                                <span className="p-4 bg-zinc-800/80 rounded-full text-zinc-500">
                                    <Plus className="h-8 w-8" />
                                </span>
                                <h3 className="font-bold text-white">Ningún Espacio Registrado</h3>
                                <p className="text-sm text-zinc-400 max-w-sm">No has agregado amenidades a {isPropiedades ? 'esta propiedad' : 'este condominio'}. Comienza creando un espacio para que los residentes puedan reservar.</p>
                            </div>
                        ) : (
                            amenities.map(amenity => (
                                <motion.div
                                    key={amenity.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => { setEditingAmenity(amenity); setShowAmenityModal(true); }}
                                    className={`relative p-5 rounded-2xl border bg-zinc-950 transition-all duration-300 cursor-pointer group/card flex flex-col justify-between overflow-hidden ${amenity.status === 'maintenance' ? 'border-orange-500/30 opacity-80 hover:opacity-100 hover:border-orange-500/60 shadow-[inset_0_0_20px_rgba(249,115,22,0.05)]' : 'border-zinc-800/80 hover:bg-zinc-900/90 shadow-none hover:shadow-[0_8px_30px_rgb(0,0,0,0.4)] hover:-translate-y-1 hover:border-indigo-500/30'}`}
                                >
                                    <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent ${amenity.status === 'maintenance' ? 'via-orange-500' : 'via-indigo-500'} to-transparent opacity-0 group-hover:opacity-100 translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000 ease-in-out`} />
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-inner ${amenity.status === 'maintenance' ? 'from-orange-800 to-orange-950 grayscale-[0.5]' : amenity.color || 'from-zinc-700 to-zinc-900'} text-white`}>
                                                <Zap className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-base font-bold text-white truncate max-w-[140px]">{amenity.name}</h4>
                                                    {amenity.status === 'maintenance' && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center gap-1 shrink-0 animate-pulse">
                                                            Pausado
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${amenity.status === 'maintenance' ? 'text-orange-500/60' : 'text-emerald-400'}`}>
                                                    {amenity.base_price > 0 ? `$${amenity.base_price} • ` : 'Gratis • '}
                                                    Depósito: {amenity.deposit_required ? `$${amenity.deposit_amount}` : 'NO'}
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => handleDeleteAmenity(amenity.id, e)}
                                            className="text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover/card:opacity-100 transition-all rounded-full shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-medium text-zinc-500 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 group-hover/card:border-zinc-700 transition-colors mt-auto">
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="opacity-70">Aforo:</span>
                                            <span className="text-white">{amenity.capacity} pers.</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-zinc-700 shrink-0"></div>
                                        <div className="flex items-center gap-1.5 truncate">
                                            <span className="opacity-70">Horario:</span>
                                            <span className="text-white truncate max-w-[100px]">{amenity.use_hours || 'ND'}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <AmenityModal
                isOpen={showAmenityModal}
                onClose={() => { setShowAmenityModal(false); setEditingAmenity(null); }}
                orgId={condo.organization_id || ''}
                condominiumId={condominiumId}
                amenityToEdit={editingAmenity}
                onSave={handleSaveAmenity}
            />

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
