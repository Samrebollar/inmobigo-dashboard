'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { motion as m, AnimatePresence as AP, AnimatePresence } from 'framer-motion'
import { 
    Sparkles, 
    FileDown, 
    Brain, 
    AlertCircle,
    Building2,
    ChevronDown,
    ArrowRight,
    FileSpreadsheet,
    FileType
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { FinancialRecord, FiscalRegime, REGIME_LABELS } from '@/types/accounting'
import { FinancialSummary } from './financial-summary'
import { MovementManager } from './movement-manager'
import { cn } from '@/lib/utils'

export function AccountingClient({ 
    data,
    organizationId
}: { 
    data: any,
    organizationId: string
}) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { 
        movements: records, 
        metrics, 
        condominiums, 
        regime, 
        selectedCondoId,
        unitsInRange
    } = data

    const handleCondoChange = (id: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (id === 'all') params.delete('condo')
        else params.set('condo', id)
        router.push(`/dashboard/contabilidad-inteligente?${params.toString()}`)
    }

    const [isExportMenuOpen, setExportMenuOpen] = useState(false)
    const exportMenuRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setExportMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const getExportFilename = (ext: string) => `reporte_contable_${selectedCondoId}_${new Date().toISOString().split('T')[0]}.${ext}`

    const exportToCSV = () => {
        const headers = ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Descripción', 'Estatus']
        const rows = records.map((r: any) => [
            r.date,
            r.type.toUpperCase(),
            r.amount,
            r.category,
            r.description,
            r.status
        ])

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", getExportFilename('csv'))
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setExportMenuOpen(false)
    }

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(records.map((r: any) => ({
            Fecha: r.date,
            Tipo: r.type.toUpperCase(),
            Monto: r.amount,
            Categoría: r.category,
            Descripción: r.description,
            Estatus: r.status
        })))
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Contabilidad")
        XLSX.writeFile(workbook, getExportFilename('xlsx'))
        setExportMenuOpen(false)
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        doc.text("Reporte Contable Inteligente", 14, 15)
        
        const tableColumn = ["Fecha", "Tipo", "Monto", "Categoría", "Descripción", "Estatus"]
        const tableRows = records.map((r: any) => [
            r.date, 
            r.type.toUpperCase(), 
            `$${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
            r.category, 
            r.description, 
            r.status.toUpperCase()
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] } // Indigo 500
        })
        doc.save(getExportFilename('pdf'))
        setExportMenuOpen(false)
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header with Property Selector */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-4 w-full md:w-auto">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-widest">
                            <Brain size={14} />
                            <span>Contabilidad Inteligente</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
                            Libro <span className="text-indigo-500">Financiero</span>
                        </h1>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative group">
                            <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-hover:text-indigo-400 transition-colors" size={18} />
                            <select 
                                value={selectedCondoId}
                                onChange={(e) => handleCondoChange(e.target.value)}
                                className="pl-12 pr-10 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-indigo-500 transition-all appearance-none min-w-[240px] shadow-xl"
                            >
                                <option value="all">Todas las Propiedades</option>
                                {condominiums.map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                        </div>

                        {regime && (
                            <div className="px-4 py-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/10 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-indigo-200 text-xs font-black uppercase tracking-widest">
                                    {REGIME_LABELS[regime]}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative z-20" ref={exportMenuRef}>
                    <button
                        onClick={() => setExportMenuOpen(!isExportMenuOpen)}
                        className="flex items-center gap-3 px-5 py-3.5 rounded-[20px] bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 transform hover:-translate-y-0.5"
                    >
                        <FileDown size={18} />
                        <span>Exportar</span>
                        <div className="w-px h-4 bg-white/20 mx-1" />
                        <ChevronDown size={16} className={cn("transition-transform duration-300", isExportMenuOpen && "rotate-180")} />
                    </button>
                    
                    <AnimatePresence>
                        {isExportMenuOpen && (
                            <m.div
                                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                                className="absolute right-0 top-full mt-3 w-64 bg-zinc-950/80 backdrop-blur-2xl border border-white/10 rounded-[28px] shadow-2xl overflow-hidden p-2 ring-1 ring-white/5"
                            >
                                <div className="px-4 py-3 mb-1">
                                    <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Selecciona el Formato</p>
                                </div>
                                <button onClick={exportToExcel} className="w-full flex items-center justify-between px-3 py-3.5 rounded-2xl text-sm font-bold text-zinc-300 hover:bg-emerald-500/15 hover:text-emerald-400 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                                            <FileSpreadsheet size={16} />
                                        </div>
                                        <span>Reporte Excel</span>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500/40">.XLSX</span>
                                </button>
                                <button onClick={exportToPDF} className="w-full flex items-center justify-between px-3 py-3.5 rounded-2xl text-sm font-bold text-zinc-300 hover:bg-rose-500/15 hover:text-rose-400 transition-all group mt-1">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
                                            <FileType size={16} />
                                        </div>
                                        <span>Documento PDF</span>
                                    </div>
                                    <span className="text-[10px] font-black text-rose-500/40">.PDF</span>
                                </button>
                                <div className="h-px bg-white/5 my-2 mx-3" />
                                <button onClick={exportToCSV} className="w-full flex items-center justify-between px-3 py-3.5 rounded-2xl text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-500 group-hover:bg-zinc-700 transition-colors">
                                            <FileDown size={16} />
                                        </div>
                                        <span>Datos Crudos</span>
                                    </div>
                                    <span className="text-[10px] font-black text-zinc-600">.CSV</span>
                                </button>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Smart Assistant Feedback */}
            <m.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden p-6 rounded-[32px] bg-zinc-900/50 border border-zinc-800"
            >
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 text-white shrink-0">
                        <Sparkles size={28} />
                    </div>
                    <div className="space-y-1 text-center md:text-left">
                        <h4 className="text-lg font-black text-white tracking-tight">Análisis bajo Demanda</h4>
                        <p className="text-zinc-500 text-sm font-medium">
                            {selectedCondoId === 'all' 
                                ? "Visualizando flujo consolidado de toda la organización." 
                                : `Resumen financiero y fiscal basado en facturación emitida para ${condominiums.find((c:any) => c.id === selectedCondoId)?.name || 'la propiedad'}.`}
                        </p>
                    </div>
                </div>
            </m.div>

            {/* Summary Grid with New Metrics */}
            <FinancialSummary metrics={metrics} regime={regime} />

            {/* Movement Manager - Updated for Hybrid Data */}
            <MovementManager 
                records={records} 
                regime={regime} 
                organizationId={organizationId}
                units={unitsInRange}
                onNewRecord={() => router.refresh()}
                onDelete={() => router.refresh()}
                selectedCondoId={selectedCondoId}
            />

            {/* Footer / Disclaimer */}
            <div className="pt-12 pb-8 border-t border-zinc-900 flex flex-col items-center text-center space-y-4">
                <div className="flex items-center gap-2 text-amber-500/80">
                    <AlertCircle size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest italic tracking-tighter">Cumplimiento Fiscal Informativo</span>
                </div>
                <p className="text-zinc-600 text-[13px] max-w-3xl leading-relaxed font-semibold">
                    "Toda la información de ingresos proviene automáticamente del módulo de Facturación. Los cálculos de utilidad e ISR son proyecciones informativas sujetas a validación por un contador certificado."
                </p>
            </div>
        </div>
    )
}
