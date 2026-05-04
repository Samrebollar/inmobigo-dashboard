'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, UserPlus, FileText, AlertCircle } from 'lucide-react'

const activities = [
    { id: 1, type: 'payment', title: 'Pago recibido', description: 'Unidad 101 pagó mantenimiento de Febrero', time: 'Hace 2 horas', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { id: 2, type: 'resident', title: 'Nuevo residente', description: 'Familia Ramírez registrada en Unidad 205', time: 'Hace 5 horas', icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { id: 3, type: 'alert', title: 'Reporte de incidencia', description: 'Fuga de agua reportada en áreas comunes', time: 'Ayer', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    { id: 4, type: 'document', title: 'Contrato renovado', description: 'Unidad 103 renovó contrato de arrendamiento', time: 'Hace 2 días', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
]

export function ActivityTab() {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Actividad Reciente</h3>
            <div className="relative border-l border-zinc-800 ml-3 space-y-8 pb-8">
                {activities.map((item, i) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="relative ml-6"
                    >
                        <span className={`absolute -left-[41px] flex h-8 w-8 items-center justify-center rounded-full border bg-zinc-900 ${item.border}`}>
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                        </span>
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 transition-colors hover:bg-zinc-900/50">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-white">{item.title}</h4>
                                    <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
                                </div>
                                <span className="text-xs text-zinc-600">{item.time}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}

