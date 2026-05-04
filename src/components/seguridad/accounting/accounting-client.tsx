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
    FileType,
    ChevronLeft,
    ShieldCheck,
    Scale as ScaleIcon
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { FinancialRecord, FiscalRegime, REGIME_LABELS } from '@/types/accounting'
import { FinancialSummary } from './financial-summary'
import { MovementManager } from './movement-manager'
import { ReserveFundModule } from './reserve-fund-module'
import { SatTaxProjection } from './sat-tax-projection'
import { RegimeSelector } from './regime-selector'
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
        unitsInRange,
        fundData
    } = data
    
    // VIEW STATE MANAGEMENT via SearchParams for persistence on reload
    const activeView = searchParams.get('view') === 'fiscal' ? 'fiscal' : 'dashboard'
    
    const setView = (v: 'dashboard' | 'fiscal') => {
        const params = new URLSearchParams(searchParams.toString())
        if (v === 'dashboard') params.delete('view')
        else params.set('view', 'fiscal')
        router.push(`/dashboard/contabilidad-inteligente?${params.toString()}`)
    }

    const handleCondoChange = (id: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (id === 'all') params.delete('condo')
        else params.set('condo', id)
        router.push(`/dashboard/contabilidad-inteligente?${params.toString()}`)
    }

    const [isExportMenuOpen, setExportMenuOpen] = useState(false)
    const exportMenuRef = useRef<HTMLDivElement>(null)

    // IA ANALYSIS LOGIC
    const isHealthy = metrics.utilidad >= 0
    const expensesByCategory = records
        .filter((r: any) => r.type === 'egreso')
        .reduce((acc: any, curr: any) => {
            const cat = curr.category || 'Otros'
            acc[cat] = (acc[cat] || 0) + Number(curr.amount)
            return acc
        }, {})

    const categoryArray = Object.keys(expensesByCategory).map(cat => ({
        category: cat,
        amount: expensesByCategory[cat]
    })).sort((a, b) => b.amount - a.amount)

    const topCategory = categoryArray[0]?.category || ''

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setExportMenuOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const generateMagicComment = () => {
        const currentMonth = new Date().toLocaleDateString('es-MX', { month: 'long' })
        if (metrics.totalCollected === 0 && metrics.totalExpenses === 0) {
            return "Sin movimientos registrados este mes. El análisis se activará al procesar la primera factura o gasto."
        }
        
        if (isHealthy) {
            return `Análisis de ${currentMonth}: Operación saludable con un superávit de $${metrics.utilidad.toLocaleString()}. El gasto se concentra principalmente en ${topCategory || 'operación general'}, manteniendo el cumplimiento fiscal.`
        } else {
            return `Alerta Administrativa: El periodo presenta un déficit de $${Math.abs(metrics.utilidad).toLocaleString()}. Se recomienda revisar los gastos de ${topCategory || 'mantenimiento'} y agilizar la cobranza de las facturas pendientes.`
        }
    }

    const getExportFilename = (ext: string) => `reporte_contable_${selectedCondoId}_${new Date().toISOString().split('T')[0]}.${ext}`

    const exportToCSV = () => {
        const headers = ['Fecha', 'Tipo', 'Monto', 'Categoría', 'Descripción', 'Estatus']
        const rows = records.map((r: any) => [
            r.date,
            (r.type || 'movimiento').toUpperCase(),
            r.amount,
            r.category || 'Varios',
            r.description || '-',
            (r.status || 'pagado').toUpperCase()
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
            Tipo: (r.type || 'movimiento').toUpperCase(),
            Monto: r.amount,
            Categoría: r.category || 'Varios',
            Descripción: r.description || '-',
            Estatus: (r.status || 'pagado').toUpperCase()
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
            (r.type || 'movimiento').toUpperCase(), 
            `$${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 
            r.category || 'Varios', 
            r.description || '-', 
            (r.status || 'pagado').toUpperCase()
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
                        {activeView === 'fiscal' ? (
                            <button
                                onClick={() => setView('dashboard')}
                                className="flex items-center gap-2 px-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-400 hover:text-white hover:border-indigo-500 transition-all font-bold text-sm"
                            >
                                <ChevronLeft size={18} />
                                Regresar al Libro
                            </button>
                        ) : (
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
                        )}

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

            <AnimatePresence mode="wait">
                {activeView === 'dashboard' ? (
                    <m.div
                        key="dashboard"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.4 }}
                        className="space-y-8"
                    >
                        {/* 💰 RESERVA SECTION */}
                        <ReserveFundModule 
                            fundData={fundData} 
                            condominiumId={selectedCondoId} 
                            isAdmin={true} 
                        />

                        {/* Smart Assistant Feedback */}
                        <m.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                                "relative overflow-hidden p-6 md:p-10 rounded-[32px] md:rounded-[48px] border transition-all duration-500",
                                isHealthy 
                                    ? "bg-zinc-900/50 border-zinc-800" 
                                    : "bg-rose-500/5 border-rose-500/20"
                            )}
                        >
                            <div className="absolute top-0 right-0 p-8 text-indigo-500/5 select-none">
                                <Sparkles size={80} className="md:w-[120px] md:h-[120px]" />
                            </div>

                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
                                <div className={cn(
                                    "w-16 h-16 md:w-24 md:h-24 rounded-2xl md:rounded-3xl flex items-center justify-center shadow-2xl shrink-0 transition-transform hover:scale-105 duration-300",
                                    isHealthy 
                                        ? "bg-indigo-600 shadow-indigo-600/20 text-white" 
                                        : "bg-rose-600 shadow-rose-600/30 text-white"
                                )}>
                                    <Brain className="w-8 h-8 md:w-12 md:h-12" />
                                </div>
                                
                                <div className="space-y-3 text-center md:text-left flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                                        <h4 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase tracking-widest">
                                            {selectedCondoId === 'all' ? 'Resumen Global' : 'Análisis Inteligente'}
                                        </h4>
                                        <div className={cn(
                                            "inline-flex px-3 py-1 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border self-center md:self-auto",
                                            isHealthy 
                                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                                                : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                                        )}>
                                            {isHealthy ? 'Operación Saludable' : 'Atención Requerida'}
                                        </div>
                                    </div>

                                    <p className={cn(
                                        "text-base md:text-xl font-medium leading-relaxed italic",
                                        isHealthy ? "text-zinc-400" : "text-rose-200/80"
                                    )}>
                                        "{generateMagicComment()}"
                                    </p>
                                    
                                    <div className="pt-2 flex items-center justify-center md:justify-start gap-4 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <span>IA Diagnostic</span>
                                        </div>
                                        <div className="w-1 h-1 rounded-full bg-zinc-800" />
                                        <span>Datos en Tiempo Real</span>
                                    </div>
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
                            condominiums={condominiums}
                            onNewRecord={() => router.refresh()}
                            onDelete={() => router.refresh()}
                            selectedCondoId={selectedCondoId}
                        />

                        {/* 📊 ACCESO A CUMPLIMIENTO FISCAL (TARJETA FINAL) */}
                        <m.button
                            onClick={() => setView('fiscal')}
                            whileHover={{ scale: 0.99, y: 2 }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-indigo-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[32px] md:rounded-[48px]" />
                            <div className="relative p-8 md:p-12 rounded-[32px] md:rounded-[48px] bg-zinc-900/40 border border-zinc-800 group-hover:border-orange-500/30 transition-all flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-sm">
                                <div className="flex items-center gap-6 md:gap-10">
                                    <div className="p-5 md:p-7 rounded-3xl bg-gradient-to-br from-orange-500 to-rose-600 text-white shadow-2xl shadow-orange-500/20 group-hover:scale-110 transition-transform duration-500">
                                        <ShieldCheck size={32} className="md:w-10 md:h-10" />
                                    </div>
                                    <div className="text-center md:text-left space-y-2">
                                        <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight uppercase tracking-widest">Cumplimiento Fiscal</h3>
                                        <p className="text-zinc-500 text-sm md:text-base font-bold uppercase tracking-[0.2em] group-hover:text-amber-400/70 transition-colors">Estimación de obligaciones fiscales en tiempo real</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-orange-500 font-black text-xs uppercase tracking-[0.3em] group-hover:translate-x-2 transition-transform">
                                    <span>Ver Proyección SAT</span>
                                    <ArrowRight size={20} />
                                </div>
                            </div>
                        </m.button>
                    </m.div>
                ) : (
                    <m.div
                        key="fiscal"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.4 }}
                    >
                        {!regime && selectedCondoId !== 'all' ? (
                            <m.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="py-12"
                            >
                                <RegimeSelector 
                                    condominiumId={selectedCondoId}
                                    condominiumName={condominiums.find((c: any) => c.id === selectedCondoId)?.name}
                                />
                            </m.div>
                        ) : (
                            <SatTaxProjection 
                                records={records}
                                regime={regime}
                                condominiums={condominiums}
                            />
                        )}
                        
                        <div className="mt-12 p-8 rounded-[32px] bg-indigo-500/5 border border-indigo-500/10 text-center space-y-4">
                            <p className="text-zinc-500 text-sm font-medium italic">
                                {selectedCondoId === 'all' 
                                    ? "La estimación global combina los regímenes individuales de cada propiedad."
                                    : `La estimación fiscal utiliza el régimen configurado para ${condominiums.find((c: any) => c.id === selectedCondoId)?.name || 'la propiedad'}.`}
                            </p>
                            <button 
                                onClick={() => setView('dashboard')}
                                className="inline-flex items-center gap-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest hover:text-white transition-colors"
                            >
                                <ChevronLeft size={14} />
                                Regresar al resumen financiero
                            </button>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

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

