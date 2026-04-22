'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Download, Sparkles, CheckCircle2, TrendingUp, TrendingDown, ChevronDown, FileSpreadsheet, FileType, FileDown } from 'lucide-react'
import { clsx } from 'clsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { cn } from '@/lib/utils'

interface SmartMonthlyReportProps {
    metrics: {
        totalCollected: number
        totalExpenses: number
        utilidad: number
    }
    topCategory: string
    movements: any[]
    isAdmin?: boolean
}

export function SmartMonthlyReport({ metrics, topCategory, movements, isAdmin = true }: SmartMonthlyReportProps) {
    const isHealthy = metrics.utilidad >= 0
    const currentMonth = new Date().toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })

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

    const generateCommentary = () => {
        if (metrics.totalCollected === 0 && metrics.totalExpenses === 0) {
            return "Aún no se registran movimientos para este periodo. La información se actualizará conforme la administración procese los pagos y gastos."
        }
        
        if (isHealthy) {
            return `Durante el mes de ${currentMonth}, el condominio mantuvo una operación estable, logrando cubrir el 100% de los compromisos operativos y generando un excedente de $${metrics.utilidad.toLocaleString()}. El recurso se destinó principalmente a ${topCategory || 'gastos generales'}.`
        } else {
            return `Este periodo presenta un balance negativo de $${Math.abs(metrics.utilidad).toLocaleString()}. La administración está utilizando fondos de reserva o saldos anteriores para cubrir la diferencia, principalmente en el área de ${topCategory || 'mantenimiento'}.`
        }
    }

    const getExportFilename = (ext: string) => `reporte_transparencia_${currentMonth.replace(' ', '_')}.${ext}`

    const exportToExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet(movements.map((m: any) => ({
            Fecha: m.date,
            Tipo: m.type === 'ingreso' ? 'INGRESO' : 'GASTO',
            Monto: m.amount,
            Categoría: m.category,
            Descripción: m.description,
            Estatus: m.status || 'PAGADO'
        })))
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, "Transparencia")
        XLSX.writeFile(workbook, getExportFilename('xlsx'))
        setExportMenuOpen(false)
    }

    const exportToPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(20)
        doc.text("Reporte de Transparencia Financiera", 14, 20)
        
        doc.setFontSize(10)
        doc.setTextColor(100)
        doc.text(`Periodo: ${currentMonth}`, 14, 30)
        
        doc.setFontSize(12)
        doc.setTextColor(0)
        doc.text("Resumen Ejecutivo:", 14, 45)
        
        doc.setFontSize(10)
        const splitCommentary = doc.splitTextToSize(generateCommentary(), 180)
        doc.text(splitCommentary, 14, 55)

        const tableColumn = ["Fecha", "Tipo", "Monto", "Categoría", "Descripción"]
        const tableRows = movements.map((m: any) => [
            m.date, 
            m.type === 'ingreso' ? 'INGRESO' : 'GASTO', 
            `$${Number(m.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
            m.category, 
            m.description
        ])

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 80,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [79, 70, 229] }
        })
        
        doc.save(getExportFilename('pdf'))
        setExportMenuOpen(false)
    }

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group relative overflow-hidden bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-xl"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col gap-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">Reporte del Mes</h3>
                            <p className="text-zinc-500 text-sm font-medium capitalize">{currentMonth}</p>
                        </div>
                    </div>
                    
                    {isAdmin && (
                        <div className="relative" ref={exportMenuRef}>
                            <button 
                                onClick={() => setExportMenuOpen(!isExportMenuOpen)}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-zinc-700 transition-all text-sm group shadow-lg"
                            >
                                <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                                <span>Descargar Reporte</span>
                                <ChevronDown size={14} className={cn("transition-transform duration-300", isExportMenuOpen && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                                {isExportMenuOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                        className="absolute right-0 top-full mt-3 w-56 bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-1 z-50 pointer-events-auto"
                                    >
                                        <button onClick={exportToPDF} className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold text-zinc-300 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all group">
                                            <div className="flex items-center gap-2">
                                                <FileType size={16} />
                                                <span>Exportar PDF</span>
                                            </div>
                                            <span className="text-[8px] font-black opacity-40">.PDF</span>
                                        </button>
                                        <button onClick={exportToExcel} className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all group mt-1">
                                            <div className="flex items-center gap-2">
                                                <FileSpreadsheet size={16} />
                                                <span>Exportar Excel</span>
                                            </div>
                                            <span className="text-[8px] font-black opacity-40">.XLSX</span>
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2">Ingresado</p>
                        <div className="flex items-center gap-2 text-emerald-400">
                            <TrendingUp size={16} />
                            <span className="text-lg font-black">${metrics.totalCollected.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2">Gastado</p>
                        <div className="flex items-center gap-2 text-rose-400">
                            <TrendingDown size={16} />
                            <span className="text-lg font-black">${metrics.totalExpenses.toLocaleString()}</span>
                        </div>
                    </div>
                    <div className="p-5 rounded-[1.5rem] bg-white/[0.03] border border-white/5">
                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-2">Balance</p>
                        <div className={clsx("flex items-center gap-2", isHealthy ? "text-emerald-400" : "text-rose-400")}>
                            <CheckCircle2 size={16} />
                            <span className="text-lg font-black">${metrics.utilidad.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 text-indigo-500/20">
                        <Sparkles size={48} />
                    </div>
                    <div className="relative z-10 flex flex-col gap-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/80">Comentario Automático</span>
                        <p className="text-zinc-300 text-sm leading-relaxed font-medium italic">
                            "{generateCommentary()}"
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
