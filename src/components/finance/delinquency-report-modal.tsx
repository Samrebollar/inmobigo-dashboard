'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Filter, AlertCircle, FileText, Download, ChevronRight, ChevronDown, Loader2 } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { residentsService } from '@/services/residents-service'
import { financeService } from '@/services/finance-service'
import { Resident } from '@/types/residents'
import { Invoice } from '@/types/finance'

interface DelinquencyReportModalProps {
    isOpen: boolean
    onClose: () => void
    condominiumId: string
}

interface DelinquentResident extends Resident {
    daysOverdue: number
    calculatedDebt: number
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
    unpaidInvoices: Invoice[]
    paymentHistory: Invoice[] // Paid invoices
}

export function DelinquencyReportModal({ isOpen, onClose, condominiumId }: DelinquencyReportModalProps) {
    const [loading, setLoading] = useState(true)
    const [residents, setResidents] = useState<DelinquentResident[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [expandedRow, setExpandedRow] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && condominiumId) {
            fetchReportData()
        }
    }, [isOpen, condominiumId])

    const fetchReportData = async () => {
        setLoading(true)
        try {
            const [allResidents, allInvoices] = await Promise.all([
                residentsService.getByCondominium(condominiumId),
                financeService.getByCondominium(condominiumId)
            ])

            // Process data
            const delinquencyReport: DelinquentResident[] = []

            allResidents.forEach(resident => {
                if (!resident.unit_id) return // Skip residents without unit

                const unitInvoices = allInvoices.filter(inv => inv.unit_id === resident.unit_id)

                // Separate paid vs unpaid
                const unpaid = unitInvoices.filter(inv => inv.status === 'overdue' || inv.status === 'pending')
                const paid = unitInvoices.filter(inv => inv.status === 'paid')

                if (unpaid.length === 0 && resident.debt_amount <= 0) return // Skip if no debt

                // Calculate Totals
                const totalDebt = unpaid.reduce((sum, inv) => sum + inv.amount, 0)

                // Calculate Days Overdue (from oldest unpaid invoice)
                let maxDays = 0
                if (unpaid.length > 0) {
                    // Find oldest due date
                    const oldestDueDate = unpaid.reduce((oldest, inv) => {
                        return new Date(inv.due_date) < new Date(oldest) ? inv.due_date : oldest
                    }, unpaid[0].due_date)

                    maxDays = differenceInDays(new Date(), parseISO(oldestDueDate))
                } else if (resident.debt_amount > 0) {
                    // Fallback if debt exists but no linked invoices (legacy debt)
                    // We assume a default generic age or 30 days if not tracked
                    maxDays = 30
                }

                // Determine Risk Level
                let risk: 'low' | 'medium' | 'high' | 'critical' = 'low'
                if (maxDays > 60) risk = 'critical'
                else if (maxDays > 30) risk = 'high'
                else if (maxDays > 15) risk = 'medium'

                // Only include if there is debt (calculated or legacy)
                if (totalDebt > 0 || resident.debt_amount > 0) {
                    delinquencyReport.push({
                        ...resident,
                        daysOverdue: maxDays,
                        calculatedDebt: totalDebt > 0 ? totalDebt : resident.debt_amount,
                        riskLevel: risk,
                        unpaidInvoices: unpaid,
                        paymentHistory: paid
                    })
                }
            })

            // Sort by risk (critical first) then debt amount
            delinquencyReport.sort((a, b) => {
                const riskScore = { critical: 4, high: 3, medium: 2, low: 1 }
                if (riskScore[b.riskLevel] !== riskScore[a.riskLevel]) {
                    return riskScore[b.riskLevel] - riskScore[a.riskLevel]
                }
                return b.calculatedDebt - a.calculatedDebt
            })

            setResidents(delinquencyReport)
        } catch (error) {
            console.error("Error fetching delinquency report:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredResidents = residents.filter(r =>
        r.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.unit_number?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const toggleRow = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id)
    }

    const getRiskBadge = (level: string) => {
        switch (level) {
            case 'critical': return <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/50">Crítico (+60 días)</Badge>
            case 'high': return <Badge className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border-orange-500/50">Alto (31-60 días)</Badge>
            case 'medium': return <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border-yellow-500/50">Medio (16-30 días)</Badge>
            default: return <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/50">Bajo (0-15 días)</Badge>
        }
    }

    const [exporting, setExporting] = useState(false)

    const handleExportPDF = () => {
        setExporting(true)

        try {
            const doc = new jsPDF()
            const now = new Date()
            const dateStr = format(now, "dd/MM/yyyy HH:mm")

            // Header
            doc.setFillColor(30, 30, 30)
            doc.rect(0, 0, 210, 40, 'F')

            doc.setTextColor(255, 255, 255)
            doc.setFontSize(22)
            doc.setFont('helvetica', 'bold')
            doc.text('InmobiGo - Reporte de Morosidad', 15, 25)

            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Fecha de generación: ${dateStr}`, 140, 25)

            // Subheader / Summary
            doc.setTextColor(50, 50, 50)
            doc.setFontSize(14)
            doc.setFont('helvetica', 'bold')
            doc.text('Resumen Ejecutivo', 15, 55)

            const totalDebt = residents.reduce((sum, r) => sum + r.calculatedDebt, 0)
            const criticalCount = residents.filter(r => r.riskLevel === 'critical').length

            doc.setFontSize(11)
            doc.setFont('helvetica', 'normal')
            doc.text(`Total de residentes con deuda: ${residents.length}`, 15, 65)
            doc.text(`Monto total adeudado: $${totalDebt.toLocaleString()}`, 15, 72)
            doc.text(`Casos de riesgo crítico (+60 días): ${criticalCount}`, 15, 79)

            // Table
            const tableData = filteredResidents.map(r => [
                `${r.first_name} ${r.last_name}`,
                r.unit_number || 'N/A',
                `$${r.calculatedDebt.toLocaleString()}`,
                `${r.daysOverdue} días`,
                r.riskLevel.toUpperCase()
            ])

            autoTable(doc, {
                startY: 90,
                head: [['Residente', 'Unidad', 'Deuda Total', 'Días Vencido', 'Riesgo']],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { top: 90 },
                styles: { fontSize: 10, cellPadding: 5 }
            })

            // Save PDF
            doc.save(`Reporte_Morosidad_${format(now, "yyyyMMdd_HHmm")}.pdf`)

        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Hubo un error al generar el PDF. Por favor, intente de nuevo.')
        } finally {
            setExporting(false)
        }
    }

    const handleNotifyAll = () => {
        alert('Se han enviado notificaciones de recordatorio a todos los residentes con pagos pendientes.')
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-zinc-800 p-6 bg-zinc-900/90 backdrop-blur">
                            <div>
                                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                    <AlertCircle className="h-6 w-6 text-indigo-500" />
                                    Reporte de Morosidad Inteligente
                                </h2>
                                <p className="text-zinc-400 mt-1">
                                    Análisis automático de riesgo y antigüedad de deuda.
                                </p>
                            </div>
                            <button onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Controls */}
                        <div className="p-4 border-b border-zinc-800 flex gap-4 bg-zinc-900/50">
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <Input
                                    placeholder="Buscar residente o unidad..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-zinc-800/50 border-zinc-700"
                                />
                            </div>
                            <div className="flex-1"></div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleNotifyAll}
                                className="gap-2 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                            >
                                <AlertCircle size={14} /> Notificar a Todos
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-2 border-zinc-700 text-zinc-300"
                                onClick={handleExportPDF}
                                disabled={exporting}
                            >
                                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                {exporting ? 'Generando...' : 'Exportar PDF'}
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-auto p-6">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-zinc-500">
                                    Cargando análisis financiero...
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredResidents.length === 0 ? (
                                        <div className="text-center py-20 text-zinc-500">
                                            No se encontraron residentes con deuda pendiente.
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-zinc-800 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-zinc-800/50 text-zinc-400 font-medium">
                                                    <tr>
                                                        <th className="px-6 py-4">Residente / Unidad</th>
                                                        <th className="px-6 py-4">Deuda Total</th>
                                                        <th className="px-6 py-4">Días Vencido</th>
                                                        <th className="px-6 py-4">Nivel de Riesgo</th>
                                                        <th className="px-6 py-4 text-right">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800">
                                                    {filteredResidents.map((resident) => (
                                                        <React.Fragment key={resident.id}>
                                                            <tr
                                                                className={`group hover:bg-zinc-800/30 transition-colors cursor-pointer ${expandedRow === resident.id ? 'bg-zinc-800/30' : ''}`}
                                                                onClick={() => toggleRow(resident.id)}
                                                            >
                                                                <td className="px-6 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold 
                                                                            ${resident.riskLevel === 'critical' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800 text-zinc-400'}`}>
                                                                            {resident.first_name.charAt(0)}{resident.last_name.charAt(0)}
                                                                        </div>
                                                                        <div>
                                                                            <div className="font-medium text-white">{resident.first_name} {resident.last_name}</div>
                                                                            <div className="text-xs text-zinc-500">Unidad {resident.unit_number || 'N/A'}</div>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <span className="font-bold text-white">${resident.calculatedDebt.toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-zinc-300">
                                                                    {resident.daysOverdue} días
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {getRiskBadge(resident.riskLevel)}
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1 }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => alert(`Recordatorio enviado exitosamente a ${resident.first_name}.`)}
                                                                            className="p-2 rounded-full bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-300 transition-colors border border-indigo-500/20 shadow-sm"
                                                                            title="Ver/Enviar Factura"
                                                                        >
                                                                            <FileText size={16} />
                                                                        </motion.button>

                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
                                                                            whileTap={{ scale: 0.95 }}
                                                                            onClick={() => window.open(`https://wa.me/${resident.phone?.replace(/\D/g, '')}`, '_blank')}
                                                                            className="p-2 rounded-full bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors border border-emerald-500/20 shadow-sm"
                                                                            title="Enviar WhatsApp"
                                                                        >
                                                                            <svg
                                                                                viewBox="0 0 24 24"
                                                                                fill="currentColor"
                                                                                height="16"
                                                                                width="16"
                                                                                xmlns="http://www.w3.org/2000/svg"
                                                                            >
                                                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                                            </svg>
                                                                        </motion.button>

                                                                        <div className="w-px h-4 bg-zinc-800 mx-1" />

                                                                        <motion.button
                                                                            whileHover={{ scale: 1.1, backgroundColor: 'rgba(39, 39, 42, 0.8)' }}
                                                                            whileTap={{ scale: 0.9 }}
                                                                            onClick={() => toggleRow(resident.id)}
                                                                            className="p-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                                                        >
                                                                            {expandedRow === resident.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                                        </motion.button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                            {/* Expanded Details */}
                                                            {expandedRow === resident.id && (
                                                                <tr className="bg-zinc-900/80">
                                                                    <td colSpan={5} className="px-6 py-4">
                                                                        <motion.div
                                                                            initial={{ opacity: 0, height: 0 }}
                                                                            animate={{ opacity: 1, height: 'auto' }}
                                                                            className="pl-14 space-y-4"
                                                                        >
                                                                            {/* Unpaid Invoices */}
                                                                            <div>
                                                                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Facturas Pendientes</h4>
                                                                                {resident.unpaidInvoices.length > 0 ? (
                                                                                    <div className="grid gap-2">
                                                                                        {resident.unpaidInvoices.map(inv => (
                                                                                            <div key={inv.id} className="flex items-center justify-between text-sm p-2 rounded border border-zinc-800 bg-zinc-950/50">
                                                                                                <div className="flex gap-4">
                                                                                                    <span className="text-white font-mono">{inv.folio}</span>
                                                                                                    <span className="text-zinc-400">{inv.description}</span>
                                                                                                </div>
                                                                                                <div className="flex gap-4">
                                                                                                    <span className="text-rose-400 font-medium">Vence: {format(parseISO(inv.due_date), 'dd MMM yyyy', { locale: es })}</span>
                                                                                                    <span className="text-white font-bold">${inv.amount.toLocaleString()}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-sm text-zinc-500 italic">No hay facturas detalladas (Deuda histórica).</p>
                                                                                )}
                                                                            </div>

                                                                            {/* Payment History */}
                                                                            <div>
                                                                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 mt-4">Historial de Pagos Recientes</h4>
                                                                                {resident.paymentHistory.length > 0 ? (
                                                                                    <div className="grid gap-2">
                                                                                        {resident.paymentHistory.slice(0, 3).map(inv => (
                                                                                            <div key={inv.id} className="flex items-center justify-between text-sm p-2 rounded border border-zinc-800/50 bg-zinc-900">
                                                                                                <div className="flex gap-4">
                                                                                                    <span className="text-zinc-400 font-mono">{inv.folio}</span>
                                                                                                    <span className="text-zinc-500">{inv.description}</span>
                                                                                                </div>
                                                                                                <div className="flex gap-4">
                                                                                                    <span className="text-emerald-500/80 text-xs flex items-center">Pagado el {inv.paid_at ? format(parseISO(inv.paid_at), 'dd MMM', { locale: es }) : '-'}</span>
                                                                                                    <span className="text-zinc-400 line-through text-xs">${inv.amount.toLocaleString()}</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                ) : (
                                                                                    <p className="text-sm text-zinc-500 italic">No hay historial de pagos recientes.</p>
                                                                                )}
                                                                            </div>
                                                                        </motion.div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
