'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Filter, AlertCircle, FileText, Download, ChevronRight, ChevronDown, Table as TableIcon, Loader2, MessageCircle, CheckCircle2 } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
)

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
    condominiumIds: string[]
    availableCondos: { id: string, name: string }[]
    onStatsUpdate?: (stats: { 
        totalMorosos: number, 
        deudaTotal: number, 
        facturasVencidas: number,
        topRiskCount: number,
        topRiskLevel: 'low' | 'medium' | 'critical',
        maxDaysOverdue: number
    }) => void
}

interface DelinquentResident extends Resident {
    daysOverdue: number
    calculatedDebt: number
    riskLevel: 'low' | 'medium' | 'critical'
    unpaidInvoices: Invoice[]
    paymentHistory: Invoice[] // Paid invoices
}

export function DelinquencyReportModal({ 
    isOpen, 
    onClose, 
    condominiumIds, 
    availableCondos,
    onStatsUpdate 
}: DelinquencyReportModalProps) {
    const [loading, setLoading] = useState(true)
    const [residents, setResidents] = useState<DelinquentResident[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCondoFilter, setSelectedCondoFilter] = useState<string>('all')
    const [expandedRow, setExpandedRow] = useState<string | null>(null)
    const [sendingReminderIds, setSendingReminderIds] = useState<Set<string>>(new Set())
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null)

    // Helper for Toast
    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        setNotification({ message, type })
        setTimeout(() => setNotification(null), 4000)
    }

    const handleWhatsAppReminder = async (resident: any) => {
        if (sendingReminderIds.has(resident.id)) return

        // 1. Get Oldest Invoice or some valid reference
        const oldestInvoice = resident.unpaidInvoices?.length > 0 
            ? resident.unpaidInvoices.reduce((prev: any, curr: any) => 
                new Date(prev.due_date) < new Date(curr.due_date) ? prev : curr)
            : null

        // 2. Prepare Payload
        const payload = {
            tipo: "recordatorio",
            first_name: `${resident.first_name} ${resident.last_name}`,
            phone: resident.phone || '',
            amount: resident.calculatedDebt,
            due_date: oldestInvoice?.due_date || '',
            payment_link: oldestInvoice?.payment_link || null,
            condominium: availableCondos.find(c => c.id === resident.condominium_id)?.name || '',
            unit: resident.unit_number || 'S/N'
        }

        const webhookUrl = 'https://n8n.srv1286224.hstgr.cloud/webhook/send-morosidad-whatsapp'
        console.log('--- Envio de Recordatorio ---')
        console.log('Webhook URL a usar:', webhookUrl)
        console.log('Payload:', payload)

        setSendingReminderIds(prev => new Set(prev).add(resident.id))

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (response.ok) {
                showNotification('Recordatorio enviado por WhatsApp')
                return true
            } else {
                throw new Error('Error en la respuesta del servidor')
            }
        } catch (error) {
            console.error('Error sending WhatsApp reminder:', error)
            showNotification('Error al enviar mensaje', 'error')
            return false
        } finally {
            setSendingReminderIds(prev => {
                const next = new Set(prev)
                next.delete(resident.id)
                return next
            })
        }
    }

    useEffect(() => {
        if (isOpen && condominiumIds && condominiumIds.length > 0) {
            fetchReportData()
        }
    }, [isOpen, condominiumIds])

    const fetchReportData = async () => {
        setLoading(true)
        try {
            const [allResidents, allInvoices] = await Promise.all([
                residentsService.getByCondominiums(condominiumIds),
                financeService.getByCondominiums(condominiumIds)
            ])

            // Process data
            const delinquencyReport: DelinquentResident[] = []

            allResidents.forEach(resident => {
                const residentInvoices = allInvoices.filter(inv => inv.resident_id === resident.id)

                // Separate paid vs unpaid
                const unpaid = residentInvoices.filter(inv => inv.status === 'overdue' || inv.status === 'pending')
                const paid = residentInvoices.filter(inv => inv.status === 'paid')

                // ONLY include if they have actual UNPAID invoices
                if (unpaid.length === 0) return

                // Calculate Totals using balance_due if available, fallback to amount
                const totalDebt = unpaid.reduce((sum, inv) => sum + (inv.balance_due ?? inv.amount), 0)

                // Calculate Days Overdue (from oldest unpaid invoice)
                let maxDays = 0
                if (unpaid.length > 0) {
                    // Find oldest due date
                    const oldestDueDate = unpaid.reduce((oldest, inv) => {
                        return new Date(inv.due_date) < new Date(oldest) ? inv.due_date : oldest
                    }, unpaid[0].due_date)

                    maxDays = differenceInDays(new Date(), parseISO(oldestDueDate))
                }

                // Determine Risk Level
                let risk: 'low' | 'medium' | 'critical' = 'low'
                if (maxDays > 15) risk = 'critical'
                else if (maxDays > 7) risk = 'medium'

                // Only include if there is debt
                if (totalDebt > 0) {
                    delinquencyReport.push({
                        ...resident,
                        daysOverdue: maxDays,
                        calculatedDebt: totalDebt,
                        riskLevel: risk,
                        unpaidInvoices: unpaid,
                        paymentHistory: paid
                    })
                }
            })

            // Sort by risk (critical first) then debt amount
            delinquencyReport.sort((a, b) => {
                const riskScore = { critical: 3, medium: 2, low: 1 }
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

    const filteredResidents = React.useMemo(() => {
        return residents.filter(r => {
            const matchesSearch = r.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                r.phone?.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesCondo = selectedCondoFilter === 'all' || r.condominium_id === selectedCondoFilter
            
            return matchesSearch && matchesCondo
        })
    }, [residents, searchTerm, selectedCondoFilter])

    // Effect to notify parent about stats changes (for the KPI cards)
    useEffect(() => {
        if (onStatsUpdate && !loading) {
            const totalMorosos = filteredResidents.length
            const deudaTotal = filteredResidents.reduce((sum, r) => sum + r.calculatedDebt, 0)
            const facturasVencidas = filteredResidents.reduce((sum, r) => sum + r.unpaidInvoices.length, 0)
            
            // Top Risk Level Aggregation
            let topRiskLevel: 'low' | 'medium' | 'critical' = 'low'
            if (filteredResidents.some(r => r.riskLevel === 'critical')) topRiskLevel = 'critical'
            else if (filteredResidents.some(r => r.riskLevel === 'medium')) topRiskLevel = 'medium'

            const topRiskCount = filteredResidents.filter(r => r.riskLevel === topRiskLevel).length
            const maxDaysOverdue = filteredResidents.length > 0 
                ? Math.max(...filteredResidents.map(r => r.daysOverdue))
                : 0

            onStatsUpdate({
                totalMorosos,
                deudaTotal,
                facturasVencidas,
                topRiskCount,
                topRiskLevel,
                maxDaysOverdue
            })
        }
    }, [filteredResidents, loading, onStatsUpdate])

    const toggleRow = (id: string) => {
        setExpandedRow(expandedRow === id ? null : id)
    }

    const getRiskBadge = (level: string) => {
        switch (level) {
            case 'critical': return <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/50 text-[10px] py-0 px-2">Crítico (+15 días)</Badge>
            case 'medium': return <Badge className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border-yellow-500/50 text-[10px] py-0 px-2">Medio (8-15 días)</Badge>
            default: return <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/50 text-[10px] py-0 px-2">Bajo (0-7 días)</Badge>
        }
    }

    const [exporting, setExporting] = useState(false)
    const [showExportMenu, setShowExportMenu] = useState(false)

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
            doc.text('InmobiGo - Reporte de Morosidad', 15, 20)

            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Fecha de generación: ${dateStr}`, 15, 28)

            // Subheader / Summary
            doc.setTextColor(50, 50, 50)
            const totalDebt = residents.reduce((sum, r) => sum + r.calculatedDebt, 0)
            const criticalCount = residents.filter(r => r.riskLevel === 'critical').length

            doc.setFontSize(11)
            doc.setFont('helvetica', 'normal')
            doc.text(`Total de residentes con deuda: ${residents.length}`, 15, 65)
            doc.text(`Monto total adeudado: $${totalDebt.toLocaleString()}`, 15, 72)
            doc.text(`Casos de riesgo crítico (+60 días): ${criticalCount}`, 15, 79)

            // Table
            const riskTranslations: Record<string, string> = {
                low: 'BAJO',
                medium: 'MEDIO',
                critical: 'CRÍTICO'
            }

            const tableBody = filteredResidents.map(r => [
                availableCondos.find(c => c.id === r.condominium_id)?.name || 'N/A',
                `${r.first_name} ${r.last_name}`,
                r.unit_number || 'N/A',
                r.phone || 'S/N',
                `$${r.calculatedDebt.toLocaleString()}`,
                `${r.daysOverdue} días`,
                riskTranslations[r.riskLevel] || r.riskLevel.toUpperCase()
            ])

            autoTable(doc, {
                startY: 90,
                head: [['Propiedad', 'Residente', 'Unidad', 'Teléfono', 'Deuda Total', 'Días Vencido', 'Riesgo']],
                body: tableBody,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [245, 247, 250] },
                margin: { top: 90 },
                styles: { fontSize: 9, cellPadding: 5 }
            })

            // Save PDF
            doc.save(`Reporte_Morosidad_${format(now, "yyyyMMdd_HHmm")}.pdf`)

        } catch (error) {
            console.error('Error generating PDF:', error)
            alert('Hubo un error al generar el PDF. Por favor, intente de nuevo.')
        } finally {
            setExporting(false)
            setShowExportMenu(false)
        }
    }

    const handleExportExcel = () => {
        setExporting(true)
        try {
            const now = new Date()
            
            const riskTranslations: Record<string, string> = {
                low: 'BAJO',
                medium: 'MEDIO',
                critical: 'CRÍTICO'
            }

            // Prepare data for Excel
            const excelData = filteredResidents.map(r => ({
                'Propiedad': availableCondos.find(c => c.id === r.condominium_id)?.name || 'N/A',
                'Residente': `${r.first_name} ${r.last_name}`,
                'Unidad': r.unit_number || 'N/A',
                'Teléfono': r.phone || 'S/N',
                'Deuda Total': r.calculatedDebt,
                'Días Vencido': r.daysOverdue,
                'Riesgo': riskTranslations[r.riskLevel] || r.riskLevel.toUpperCase()
            }))

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(excelData)
            const wb = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(wb, ws, "Morosidad")

            // Save Excel
            XLSX.writeFile(wb, `Reporte_Morosidad_${format(now, "yyyyMMdd_HHmm")}.xlsx`)
        } catch (error) {
            console.error('Error generating Excel:', error)
            alert('Hubo un error al generar el Excel.')
        } finally {
            setExporting(false)
            setShowExportMenu(false)
        }
    }


    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full h-full flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 p-6 bg-zinc-900/90 backdrop-blur">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <AlertCircle className="h-6 w-6 text-indigo-500" />
                        Reporte de Morosidad Inteligente
                    </h2>
                    <p className="text-zinc-400 mt-1">
                        Análisis de antigüedad, riesgo y comportamiento de pago
                    </p>
                </div>
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
                            <div className="relative flex-1 max-w-xs">
                                <select 
                                    value={selectedCondoFilter}
                                    onChange={(e) => setSelectedCondoFilter(e.target.value)}
                                    className="w-full bg-zinc-800/50 border border-zinc-700 text-sm text-zinc-300 rounded-md py-2 pl-3 pr-8 focus:ring-1 focus:ring-indigo-500 appearance-none outline-none cursor-pointer"
                                >
                                    <option value="all">Todas las propiedades</option>
                                    {availableCondos.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1"></div>

                            <div className="relative">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    disabled={exporting}
                                >
                                    {exporting ? <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> : <Download className="h-4 w-4" />}
                                    <span>Exportar</span>
                                    <ChevronDown className={`h-3 w-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
                                </Button>

                                <AnimatePresence>
                                    {showExportMenu && (
                                        <>
                                            <div 
                                                className="fixed inset-0 z-10" 
                                                onClick={() => setShowExportMenu(false)}
                                            />
                                            <motion.div
                                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                className="absolute right-0 mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl z-20 overflow-hidden"
                                            >
                                                <div className="p-1.5 space-y-1">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleExportPDF()
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors group"
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 group-hover:bg-red-500/20">
                                                            <FileText size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="font-medium">Documento PDF</div>
                                                            <div className="text-[10px] text-zinc-500 italic">Formato oficial</div>
                                                        </div>
                                                    </button>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleExportExcel()
                                                        }}
                                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors group"
                                                    >
                                                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                                                            <TableIcon size={16} />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="font-medium">Hoja de Cálculo</div>
                                                            <div className="text-[10px] text-zinc-500 italic">Formato Excel</div>
                                                        </div>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        </>
                                    )}
                                </AnimatePresence>
                            </div>
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
                                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Propiedad</th>
                                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Residente / Unidad</th>
                                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Teléfono</th>
                                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Deuda Total</th>
                                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Días Vencido</th>
                                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider">Nivel de Riesgo</th>
                                                            <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-center">Acciones</th>
                                                        </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-800">
                                                    {filteredResidents.map((resident, index) => (
                                                        <React.Fragment key={resident.id}>
                                                            <motion.tr
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.05 }}
                                                                whileHover={{ backgroundColor: 'rgba(79, 70, 229, 0.05)', x: 4 }}
                                                                className={`group transition-all cursor-pointer relative ${expandedRow === resident.id ? 'bg-zinc-800/30' : ''}`}
                                                                onClick={() => toggleRow(resident.id)}
                                                            >
                                                                <td className="px-6 py-4 text-zinc-300 font-medium relative">
                                                                    {/* Hover indicator bar */}
                                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    {availableCondos.find(c => c.id === resident.condominium_id)?.name || 'Desconocido'}
                                                                </td>
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
                                                                <td className="px-6 py-4 text-zinc-400">
                                                                    {resident.phone || 'S/N'}
                                                                </td>
                                                                <td className="px-6 py-4 text-white font-bold">
                                                                    <span className="font-bold text-white">${resident.calculatedDebt.toLocaleString()}</span>
                                                                </td>
                                                                <td className="px-6 py-4 text-zinc-300">
                                                                    {resident.daysOverdue} días
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    {getRiskBadge(resident.riskLevel)}
                                                                </td>
                                                                <td className="px-6 py-4 text-center">
                                                                    <div className="flex items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
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
                                                                            onClick={() => handleWhatsAppReminder(resident)}
                                                                            disabled={sendingReminderIds.has(resident.id)}
                                                                            className={`p-2 rounded-full transition-colors border shadow-sm ${
                                                                                sendingReminderIds.has(resident.id) 
                                                                                    ? 'bg-zinc-800 border-zinc-700 text-zinc-500' 
                                                                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border-emerald-500/20'
                                                                            }`}
                                                                            title="Enviar WhatsApp"
                                                                        >
                                                                            {sendingReminderIds.has(resident.id) ? (
                                                                                <Loader2 size={16} className="animate-spin" />
                                                                            ) : (
                                                                                <WhatsAppIcon className="h-4 w-4" />
                                                                            )}
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
                                                            </motion.tr>
                                                            {/* Expanded Details */}
                                                            {expandedRow === resident.id && (
                                                                <tr className="bg-zinc-900/80">
                                                                    <td colSpan={7} className="px-6 py-4">
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

                            {/* Toast Notification */}
                            <AnimatePresence>
                                {notification && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
                                            notification.type === 'success'
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                        }`}
                                    >
                                        {notification.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />}
                                        <span className="font-medium text-sm">{notification.message}</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
        </motion.div>
    )
}
