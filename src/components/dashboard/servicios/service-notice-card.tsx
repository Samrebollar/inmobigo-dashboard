'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
    Package, Truck, MessageSquare, CheckCircle2, Loader2, AlertCircle,
    Bike, Wrench, Car, Store, User, Calendar, Clock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createPackageAlertAction } from '@/app/actions/service-actions'
import { createResidentServiceVisitAction } from '@/app/actions/security-ops-actions'

type NoticeTab = 'paqueteria' | 'repartidor' | 'proveedor'

// Mismos colores que las pestañas del panel de Seguridad
const TABS: Record<NoticeTab, {
    label: string
    title: string
    description: string
    icon: typeof Package
    tabActive: string
    iconBox: string
    iconColor: string
    glow: string
    focus: string
    button: string
}> = {
    paqueteria: {
        label: 'Paquetería',
        title: 'Aviso de Paquetería',
        description: 'Notifica a seguridad que esperas recibir un envío importante el día de hoy.',
        icon: Package,
        tabActive: 'bg-amber-500/15 text-amber-400',
        iconBox: 'from-amber-500/20 to-orange-600/10 border-amber-500/20',
        iconColor: 'text-amber-500',
        glow: 'bg-amber-500/10 group-hover:bg-amber-500/20',
        focus: 'focus:border-amber-500/50',
        button: 'bg-amber-600 hover:bg-amber-500 shadow-[0_0_20px_rgba(217,119,6,0.2)]',
    },
    repartidor: {
        label: 'Repartidor',
        title: 'Aviso de Repartidor',
        description: 'Avisa a seguridad que viene un repartidor de comida o mandados (Rappi, Uber Eats, DiDi Food...).',
        icon: Bike,
        tabActive: 'bg-fuchsia-500/15 text-fuchsia-400',
        iconBox: 'from-fuchsia-500/20 to-pink-600/10 border-fuchsia-500/20',
        iconColor: 'text-fuchsia-400',
        glow: 'bg-fuchsia-500/10 group-hover:bg-fuchsia-500/20',
        focus: 'focus:border-fuchsia-500/50',
        button: 'bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_20px_rgba(192,38,211,0.2)]',
    },
    proveedor: {
        label: 'Proveedor',
        title: 'Aviso de Proveedor',
        description: 'Avisa a seguridad que viene un proveedor de servicio (plomero, técnico, gas, agua...).',
        icon: Wrench,
        tabActive: 'bg-violet-500/15 text-violet-400',
        iconBox: 'from-violet-500/20 to-indigo-600/10 border-violet-500/20',
        iconColor: 'text-violet-400',
        glow: 'bg-violet-500/10 group-hover:bg-violet-500/20',
        focus: 'focus:border-violet-500/50',
        button: 'bg-violet-600 hover:bg-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.2)]',
    },
}

const DELIVERY_APPS = ['Rappi', 'Uber Eats', 'DiDi Food', 'Restaurante / Comida', 'Farmacia', 'Supermercado', 'Otro']

const inputBase = 'w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl h-14 text-white placeholder-zinc-600 outline-none transition-all duration-300 font-medium'
const labelBase = 'text-xs font-black text-zinc-500 uppercase tracking-widest pl-2'

function Field({ label, icon: Icon, children }: { label: string; icon?: typeof Package; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <label className={labelBase}>{label}</label>
            <div className="relative">
                {Icon && (
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Icon className="h-5 w-5 text-zinc-500" />
                    </div>
                )}
                {children}
            </div>
        </div>
    )
}

/**
 * Tarjeta de avisos del residente con pestañas Paquetería / Repartidor /
 * Proveedor. Cada aviso llega a seguridad (pestaña correspondiente del panel)
 * y se notifica por WhatsApp a seguridad y administración.
 */
export function ServiceNoticeCard({ resident, onSent }: { resident: any; onSent?: () => void }) {
    const [tab, setTab] = useState<NoticeTab>('paqueteria')
    const [isSending, setIsSending] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    // Paquetería
    const [courier, setCourier] = useState('Mercado Libre')
    const [instructions, setInstructions] = useState('')

    // Repartidor
    const [deliveryApp, setDeliveryApp] = useState('Rappi')
    const [deliveryOther, setDeliveryOther] = useState('')

    // Proveedor
    const [providerName, setProviderName] = useState('')
    const [providerReason, setProviderReason] = useState('')
    const [providerDate, setProviderDate] = useState('')
    const [providerTime, setProviderTime] = useState('')

    // Compartidos por Repartidor y Proveedor
    const [vehicleInfo, setVehicleInfo] = useState('')
    const [serviceNotes, setServiceNotes] = useState('')

    const cfg = TABS[tab]

    const resetForms = () => {
        setInstructions('')
        setDeliveryOther('')
        setProviderName('')
        setProviderReason('')
        setProviderDate('')
        setProviderTime('')
        setVehicleInfo('')
        setServiceNotes('')
    }

    const handleSend = async () => {
        setIsSending(true)
        try {
            let result: { success: boolean; error?: string }

            if (tab === 'paqueteria') {
                const fullName = `${resident.first_name} ${resident.last_name || ''}`.trim()
                const orgId = resident.condominiums?.organization_id || resident.organization_id
                if (!orgId || !resident.unit_id || !resident.user_id) {
                    toast.error('Tu perfil de residente está incompleto. Por favor contacta a administración.')
                    return
                }
                result = await createPackageAlertAction({
                    organization_id: orgId,
                    unit_id: resident.unit_id,
                    resident_id: resident.user_id,
                    resident_name: fullName,
                    unit_name: resident.units?.unit_number || 'N/A',
                    carrier: courier,
                    notes: instructions,
                    status: 'pending',
                })
            } else if (tab === 'repartidor') {
                const name = deliveryApp === 'Otro' ? deliveryOther : deliveryApp
                result = await createResidentServiceVisitAction({
                    type: 'delivery',
                    name,
                    vehicleInfo,
                    notes: serviceNotes,
                })
            } else {
                result = await createResidentServiceVisitAction({
                    type: 'provider',
                    name: providerName,
                    visitDate: providerDate || undefined,
                    startTime: providerTime || undefined,
                    vehicleInfo,
                    notes: [providerReason.trim(), serviceNotes.trim()].filter(Boolean).join(' · '),
                })
            }

            if (!result.success) throw new Error(result.error)

            setShowSuccess(true)
            toast.success(`Aviso de ${cfg.label.toLowerCase()} enviado a seguridad`)
            onSent?.()
            setTimeout(() => {
                setShowSuccess(false)
                resetForms()
            }, 4000)
        } catch (error: any) {
            console.error('Error al enviar aviso:', error)
            toast.error(error.message || 'No se pudo registrar el aviso')
        } finally {
            setIsSending(false)
        }
    }

    const canSend = tab === 'paqueteria'
        ? !!courier
        : tab === 'repartidor'
            ? (deliveryApp !== 'Otro' || !!deliveryOther.trim())
            : (!!providerName.trim() && !!providerReason.trim())

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden flex flex-col group"
        >
            <div className={cn('absolute top-0 right-0 w-64 h-64 blur-[100px] rounded-full pointer-events-none transition-all duration-700', cfg.glow)} />

            {/* Pestañas */}
            <div className="relative z-10 mb-6 flex gap-1 bg-zinc-950/60 border border-zinc-800 p-1 rounded-2xl">
                {(Object.keys(TABS) as NoticeTab[]).map(id => {
                    const t = TABS[id]
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => { setTab(id); setShowSuccess(false) }}
                            className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold rounded-xl transition-all',
                                tab === id ? cn(t.tabActive, 'shadow-lg') : 'text-zinc-500 hover:text-zinc-300'
                            )}
                        >
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                        </button>
                    )
                })}
            </div>

            <div className="flex items-start gap-4 mb-8 relative z-10">
                <div className={cn('h-14 w-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center shadow-inner shrink-0', cfg.iconBox)}>
                    <cfg.icon className={cn('h-7 w-7', cfg.iconColor)} />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-white tracking-tight">{cfg.title}</h2>
                    <p className="text-sm text-zinc-400 font-medium mt-1">{cfg.description}</p>
                </div>
            </div>

            <div className="space-y-6 flex-1 relative z-10">
                {tab === 'paqueteria' && (
                    <>
                        <Field label="Paquetería / Marketplace" icon={Truck}>
                            <select
                                value={courier}
                                onChange={(e) => setCourier(e.target.value)}
                                className={cn(inputBase, cfg.focus, 'pl-12 pr-10 appearance-none cursor-pointer')}
                            >
                                <option value="Mercado Libre">Mercado Libre</option>
                                <option value="Amazon">Amazon</option>
                                <option value="DHL">DHL Express</option>
                                <option value="FedEx">FedEx</option>
                                <option value="Estafeta">Estafeta</option>
                                <option value="Otro">Otra paquetería</option>
                            </select>
                        </Field>
                        <Field label="Clave rastreo / Info. Adicional (Opcional)">
                            <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                                <MessageSquare className="h-5 w-5 text-zinc-500" />
                            </div>
                            <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="Ej. Si no estoy, autorizo que seguridad reciba el paquete bajo mi responsabilidad."
                                className={cn(inputBase, cfg.focus, 'h-auto p-4 pl-12 min-h-[100px] resize-none')}
                            />
                        </Field>
                    </>
                )}

                {tab === 'repartidor' && (
                    <>
                        <Field label="App o negocio" icon={Store}>
                            <select
                                value={deliveryApp}
                                onChange={(e) => setDeliveryApp(e.target.value)}
                                className={cn(inputBase, cfg.focus, 'pl-12 pr-10 appearance-none cursor-pointer')}
                            >
                                {DELIVERY_APPS.map(app => <option key={app} value={app}>{app}</option>)}
                            </select>
                        </Field>
                        {deliveryApp === 'Otro' && (
                            <Field label="¿Cuál?" icon={Store}>
                                <input
                                    value={deliveryOther}
                                    onChange={(e) => setDeliveryOther(e.target.value)}
                                    maxLength={80}
                                    placeholder="Ej. Pizzería Don Luis"
                                    className={cn(inputBase, cfg.focus, 'pl-12 pr-4')}
                                />
                            </Field>
                        )}
                    </>
                )}

                {tab === 'proveedor' && (
                    <>
                        <Field label="Nombre o empresa" icon={User}>
                            <input
                                value={providerName}
                                onChange={(e) => setProviderName(e.target.value)}
                                maxLength={80}
                                placeholder="Ej. Juan Pérez / Totalplay"
                                className={cn(inputBase, cfg.focus, 'pl-12 pr-4')}
                            />
                        </Field>
                        <Field label="Motivo del servicio" icon={Wrench}>
                            <input
                                value={providerReason}
                                onChange={(e) => setProviderReason(e.target.value)}
                                maxLength={120}
                                placeholder="Ej. Reparación de fuga en cocina"
                                className={cn(inputBase, cfg.focus, 'pl-12 pr-4')}
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-4">
                            <Field label="Fecha (opcional)" icon={Calendar}>
                                <input
                                    type="date"
                                    value={providerDate}
                                    onChange={(e) => setProviderDate(e.target.value)}
                                    className={cn(inputBase, cfg.focus, 'pl-12 pr-3 [color-scheme:dark]')}
                                />
                            </Field>
                            <Field label="Hora (opcional)" icon={Clock}>
                                <input
                                    type="time"
                                    value={providerTime}
                                    onChange={(e) => setProviderTime(e.target.value)}
                                    className={cn(inputBase, cfg.focus, 'pl-12 pr-3 [color-scheme:dark]')}
                                />
                            </Field>
                        </div>
                        <p className="text-[11px] text-zinc-500 pl-2 -mt-3">Si no indicas fecha y hora, se avisa que llega hoy, ahorita.</p>
                    </>
                )}

                {tab !== 'paqueteria' && (
                    <>
                        <Field label="Color / Placas del vehículo (Opcional)" icon={Car}>
                            <input
                                value={vehicleInfo}
                                onChange={(e) => setVehicleInfo(e.target.value)}
                                maxLength={80}
                                placeholder={tab === 'repartidor' ? 'Ej. Moto roja' : 'Ej. Camioneta blanca · ABC-123-D'}
                                className={cn(inputBase, cfg.focus, 'pl-12 pr-4')}
                            />
                        </Field>
                        <Field label="Instrucciones para seguridad (Opcional)">
                            <div className="absolute top-4 left-0 pl-4 pointer-events-none">
                                <MessageSquare className="h-5 w-5 text-zinc-500" />
                            </div>
                            <textarea
                                value={serviceNotes}
                                onChange={(e) => setServiceNotes(e.target.value)}
                                maxLength={300}
                                placeholder={tab === 'repartidor' ? 'Ej. Que deje el pedido en caseta.' : 'Ej. Va a entrar con herramienta.'}
                                className={cn(inputBase, cfg.focus, 'h-auto p-4 pl-12 min-h-[90px] resize-none')}
                            />
                        </Field>
                    </>
                )}
            </div>

            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-6 flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl"
                    >
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-bold text-sm tracking-tight">¡Seguridad y administración fueron notificadas!</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                onClick={handleSend}
                disabled={isSending || showSuccess || !canSend}
                className={cn('w-full h-14 mt-6 text-white font-black uppercase tracking-widest text-[11px] rounded-2xl disabled:opacity-50 transition-all duration-300 relative z-10', cfg.button)}
            >
                {isSending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Procesando Aviso</>
                ) : (
                    showSuccess ? 'Aviso Confirmado' : <><AlertCircle className="w-4 h-4 mr-2" /> Avisar a Seguridad</>
                )}
            </Button>
        </motion.div>
    )
}
