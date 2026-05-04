'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Building2, Home, Briefcase, ChevronRight, CheckCircle2 } from 'lucide-react'
import { FiscalRegime, REGIME_LABELS } from '@/types/accounting'
import { updateFiscalRegime } from '@/app/actions/accounting-server-actions'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const REGIMES = [
    {
        id: 'condominio_no_lucrativo',
        title: 'Condominio',
        subtitle: 'Asociaciones Civiles / No Lucrativo',
        description: 'Enfocado en superávit/déficit, cuotas de mantenimiento y administración de áreas comunes. Sin cálculos de utilidad comercial.',
        icon: Building2,
        color: 'from-blue-500 to-indigo-600'
    },
    {
        id: 'arrendamiento',
        title: 'Arrendamiento',
        subtitle: 'Administración de Rentas',
        description: 'Para dueños o administradores de propiedades en renta. Cálculos de utilidad, gastos deducibles y estimación de ISR.',
        icon: Home,
        color: 'from-emerald-500 to-teal-600'
    },
    {
        id: 'actividad_empresarial',
        title: 'Actividad Empresarial',
        subtitle: 'Gestión Comercial',
        description: 'Gestión completa para administradoras profesionales. Control de ingresos gravables, egresos deducibles y proyecciones fiscales.',
        icon: Briefcase,
        color: 'from-amber-500 to-orange-600'
    }
]

export function RegimeSelector({ 
    condominiumId = null, 
    condominiumName = null 
}: { 
    condominiumId?: string | null,
    condominiumName?: string | null
}) {
    const [selected, setSelected] = useState<FiscalRegime>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleConfirm = async () => {
        if (!selected) return
        setIsSubmitting(true)

        try {
            const result = await updateFiscalRegime(selected, condominiumId)

            if (result.success) {
                window.location.reload()
            } else {
                toast.error('No se pudo actualizar', {
                    description: result.error || 'Ocurrió un error inesperado.',
                })
                setIsSubmitting(false)
            }
        } catch (error: any) {
            toast.error('Error de conexión', {
                description: 'No se pudo contactar con el servidor.',
            })
            setIsSubmitting(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto py-12 px-6">
            <div className="text-center mb-12 space-y-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4"
                >
                    <CheckCircle2 size={14} />
                    <span>Configuración {condominiumName ? `para ${condominiumName}` : 'Fiscal'}</span>
                </motion.div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                    ¿Cómo funciona {condominiumName ? <span className="text-indigo-500">{condominiumName}</span> : 'tu Contabilidad'}?
                </h1>
                <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                    Selecciona el régimen fiscal {condominiumName ? 'de esta propiedad' : 'principal'} para adaptar el dashboard y fórmulas de cálculo.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                {REGIMES.map((regime) => (
                    <motion.button
                        key={regime.id}
                        whileHover={{ y: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelected(regime.id as FiscalRegime)}
                        className={cn(
                            "relative group text-left p-6 rounded-[32px] border transition-all duration-500 flex flex-col h-full",
                            selected === regime.id 
                                ? "bg-zinc-800 border-indigo-500 shadow-2xl shadow-indigo-500/10" 
                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                        )}
                    >
                        <div className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br shadow-lg",
                            regime.color
                        )}>
                            <regime.icon size={28} className="text-white" />
                        </div>

                        <div className="space-y-2 flex-grow">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-bold text-white tracking-tight">{regime.title}</h3>
                                {selected === regime.id && (
                                    <CheckCircle2 size={20} className="text-indigo-500" />
                                )}
                            </div>
                            <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{regime.subtitle}</p>
                            <p className="text-zinc-400 text-sm leading-relaxed pt-2">
                                {regime.description}
                            </p>
                        </div>

                        <div className={cn(
                            "mt-6 flex items-center gap-2 text-xs font-bold transition-all duration-300",
                            selected === regime.id ? "text-white" : "text-zinc-500 opacity-0 group-hover:opacity-100"
                        )}>
                            <span>Seleccionar</span>
                            <ChevronRight size={14} />
                        </div>
                    </motion.button>
                ))}
            </div>

            <div className="flex justify-center">
                <button
                    disabled={!selected || isSubmitting}
                    onClick={handleConfirm}
                    className={cn(
                        "group relative px-12 py-4 rounded-2xl font-black transition-all overflow-hidden flex items-center gap-3",
                        selected 
                            ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 scale-105" 
                            : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    )}
                >
                    {isSubmitting ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>Comenzar a Administrar</span>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>
            </div>

            <p className="text-center text-zinc-500 text-xs mt-8 max-w-lg mx-auto leading-relaxed italic">
                Nota: Esta configuración adaptará tus categorías y fórmulas de cálculo. Puedes cambiarla más tarde en la configuración avanzada.
            </p>
        </div>
    )
}

