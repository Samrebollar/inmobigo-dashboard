'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-presence' // Wait, I use framer-motion in other files
import { motion as m, AnimatePresence as AP } from 'framer-motion'
import { 
    Sparkles, 
    FileDown, 
    Plus, 
    Brain, 
    AlertCircle,
    DownloadIndestrucible // I'll use FileDown
} from 'lucide-react'
import { FinancialRecord, FiscalRegime, REGIME_LABELS } from '@/types/accounting'
import { FinancialSummary } from './financial-summary'
import { MovementManager } from './movement-manager'
import { cn } from '@/lib/utils'

export function AccountingClient({ 
    initialData, 
    regime, 
    organizationId 
}: { 
    initialData: FinancialRecord[], 
    regime: FiscalRegime,
    organizationId: string
}) {
    const [view, setView] = useState<'movimientos' | 'reporte'>('movimientos')
    const [records, setRecords] = useState(initialData)

    const handleNewRecord = (record: FinancialRecord) => {
        setRecords([record, ...records])
    }

    const handleDeleteRecord = (id: string) => {
        setRecords(records.filter(r => r.id !== id))
    }

    const exportToCSV = () => {
        const headers = ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Descripción']
        const rows = records.map(r => [
            r.date,
            r.type.toUpperCase(),
            r.amount,
            r.category,
            r.description
        ])

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", `reporte_contable_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                        <Brain size={14} />
                        <span>Contabilidad Inteligente</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                            Libro <span className="text-indigo-500">Financiero</span>
                        </h1>
                        <span className="hidden md:block px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold">
                            Régimen: {REGIME_LABELS[regime || '']}
                        </span>
                    </div>
                    <p className="text-zinc-500 text-sm max-w-xl">
                        Control total de ingresos y egresos para {regime === 'condominio_no_lucrativo' ? 'administración de condominios.' : 'gestión fiscal inteligente.'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-zinc-901 border border-zinc-800 text-zinc-400 font-bold hover:bg-zinc-800 hover:text-white transition-all text-sm"
                    >
                        <FileDown size={18} />
                        <span>Exportar CSV</span>
                    </button>
                </div>
            </div>

            {/* Smart Assistant Placeholder */}
            <m.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden group p-6 rounded-[32px] bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20"
            >
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white shrink-0">
                        <Sparkles size={32} />
                    </div>
                    <div className="space-y-1 text-center md:text-left">
                        <h4 className="text-xl font-bold text-white tracking-tight">Asistente Fiscal IA</h4>
                        <p className="text-indigo-300/80 text-sm font-medium">
                            Estamos entrenando a tu asistente. Pronto podrá realizar análisis complejos, detección de anomalías y proyecciones fiscales automáticas.
                        </p>
                    </div>
                    <div className="md:ml-auto">
                        <button className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest cursor-not-allowed opacity-50">
                            Fase 2 - Próximamente
                        </button>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] -z-10" />
            </m.div>

            {/* Summary Grid */}
            <FinancialSummary records={records} regime={regime} />

            {/* Movement Manager */}
            <MovementManager 
                records={records} 
                regime={regime} 
                organizationId={organizationId}
                onNewRecord={handleNewRecord}
                onDelete={handleDeleteRecord}
            />

            {/* Footer / Disclaimer */}
            <div className="pt-12 pb-8 border-t border-zinc-900 flex flex-col items-center text-center space-y-4">
                <div className="flex items-center gap-2 text-amber-500/80">
                    <AlertCircle size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest italic">Aviso Legal y Fiscal</span>
                </div>
                <p className="text-zinc-600 text-sm max-w-3xl leading-relaxed font-medium">
                    "Este módulo proporciona información financiera de apoyo y no sustituye asesoría fiscal profesional ni la presentación oficial ante el SAT. Los cálculos realizados son estimaciones informativas basadas en los datos ingresados."
                </p>
            </div>
        </div>
    )
}
