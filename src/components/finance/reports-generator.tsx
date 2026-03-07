'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { FileText, Calendar, Download, FileSpreadsheet, Loader2, CheckCircle2 } from 'lucide-react'

interface ReportsGeneratorModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ReportsGeneratorModal({ isOpen, onClose }: ReportsGeneratorModalProps) {
    const [reportType, setReportType] = useState<'executive' | 'detailed' | 'delinquency'>('executive')
    const [dateRange, setDateRange] = useState<'this-month' | 'last-month' | 'quarter' | 'year'>('this-month')
    const [format, setFormat] = useState<'pdf' | 'excel'>('pdf')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleGenerate = () => {
        setIsGenerating(true)
        // Simulate generation
        setTimeout(() => {
            setIsGenerating(false)
            setIsSuccess(true)
            setTimeout(() => {
                setIsSuccess(false)
                onClose()
            }, 2000)
        }, 2000)
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generar Reporte Ejecutivo">
            <div className="space-y-6">

                {/* Type Selection */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={() => setReportType('executive')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${reportType === 'executive' ? 'bg-indigo-600/20 border-indigo-600/50 text-indigo-300' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                    >
                        <FileText size={20} className="mb-2" />
                        <span className="text-xs font-medium">Ejecutivo</span>
                    </button>
                    <button
                        onClick={() => setReportType('detailed')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${reportType === 'detailed' ? 'bg-indigo-600/20 border-indigo-600/50 text-indigo-300' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                    >
                        <FileSpreadsheet size={20} className="mb-2" />
                        <span className="text-xs font-medium">Detallado</span>
                    </button>
                    <button
                        onClick={() => setReportType('delinquency')}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${reportType === 'delinquency' ? 'bg-indigo-600/20 border-indigo-600/50 text-indigo-300' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                    >
                        <Calendar size={20} className="mb-2" />
                        <span className="text-xs font-medium">Morosidad</span>
                    </button>
                </div>

                {/* Configurations */}
                <div className="space-y-4 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800/50">
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Periodo</label>
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value as any)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-3 pr-8 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none"
                        >
                            <option value="this-month">Este Mes (Mayo 2024)</option>
                            <option value="last-month">Mes Anterior (Abril 2024)</option>
                            <option value="quarter">Este Trimestre (Q2 2024)</option>
                            <option value="year">Año Actual (2024)</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-medium text-zinc-400">Formato</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                                <input type="radio" name="format" checked={format === 'pdf'} onChange={() => setFormat('pdf')} className="accent-indigo-500" />
                                <FileText size={16} className="text-rose-400" /> PDF
                            </label>
                            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                                <input type="radio" name="format" checked={format === 'excel'} onChange={() => setFormat('excel')} className="accent-indigo-500" />
                                <FileSpreadsheet size={16} className="text-emerald-400" /> Excel (.xlsx)
                            </label>
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating || isSuccess}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium transition-all ${isSuccess
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-black hover:bg-zinc-200'
                        }`}
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={18} className="animate-spin" /> Generando Reporte...
                        </>
                    ) : isSuccess ? (
                        <>
                            <CheckCircle2 size={18} /> ¡Reporte Descargado!
                        </>
                    ) : (
                        <>
                            <Download size={18} /> Descargar Reporte
                        </>
                    )}
                </button>

            </div>
        </Modal>
    )
}
