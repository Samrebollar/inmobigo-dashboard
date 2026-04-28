'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal } from '@/components/ui/modal'
import { FileText, Calendar, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X, ChevronDown } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/utils/supabase/client'
import { financeService } from '@/services/finance-service'
import { formatCurrency } from '@/utils/format'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ReportsGeneratorModalProps {
    isOpen: boolean
    reportType?: 'executive' | 'delinquency' | 'whatsapp'
    onClose: () => void
    onSuccess?: (report: any) => void
}

export function ReportsGeneratorModal({ isOpen, reportType = 'executive', onClose, onSuccess }: ReportsGeneratorModalProps) {
    const [dateRange, setDateRange] = useState<'this-month' | 'last-month' | 'quarter' | 'year'>('this-month')
    const [formatOption, setFormatOption] = useState<'pdf' | 'excel'>('pdf')
    const [selectedCondo, setSelectedCondo] = useState<string>('all')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const [organizationId, setOrganizationId] = useState<string | null>(null)
    const [condominiums, setCondominiums] = useState<{ id: string, name: string }[]>([])

    useEffect(() => {
        const fetchContext = async () => {
            if (!isOpen) return
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setOrganizationId('demo-org-id')
                return
            }

            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('organization_id')
                .eq('user_id', user.id)
                .single()

            if (orgUser?.organization_id) {
                setOrganizationId(orgUser.organization_id)
                const { data: condos } = await supabase
                    .from('condominiums')
                    .select('id, name')
                    .eq('organization_id', orgUser.organization_id)
                    .eq('status', 'active')
                if (condos) setCondominiums(condos)
            }
        }
        fetchContext()
    }, [isOpen])

    const getDates = () => {
        const now = new Date()
        switch (dateRange) {
            case 'this-month': return { start: startOfMonth(now), end: endOfMonth(now) }
            case 'last-month': {
                const last = subMonths(now, 1)
                return { start: startOfMonth(last), end: endOfMonth(last) }
            }
            case 'quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) }
            case 'year': return { start: startOfYear(now), end: endOfYear(now) }
            default: return { start: startOfMonth(now), end: endOfMonth(now) }
        }
    }

    const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'Anonymous'
        img.onload = () => resolve(img)
        img.onerror = (e) => reject(e)
        img.src = url
    })

    // ------------------------------------------------------------------------------------------------ //
    // ------------------------------------- REPORTE EJECUTIVO ---------------------------------------- //
    // ------------------------------------------------------------------------------------------------ //

    const generateExecutivePDF = async (invoices: any[], summary: any) => {
        const doc = new jsPDF()

        try {
            const logo = await loadImage('/logo-inmobigo.png')
            const targetHeight = 16
            const targetWidth = targetHeight * (logo.width / logo.height)
            doc.addImage(logo, 'PNG', 14, 15, targetWidth, targetHeight)
        } catch (e) {
            console.warn("Could not load logo", e)
        }

        doc.setFontSize(24)
        doc.setTextColor(15, 23, 42) // Slate 900
        doc.text('Reporte Financiero', 14, 45)

        doc.setFontSize(10)
        doc.setTextColor(100, 113, 129) // Slate 500
        doc.text(`Periodo: ${summary.periodName}`, 14, 52)
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 57)

        doc.setDrawColor(226, 232, 240) // Slate 200
        doc.setFillColor(248, 250, 252) // Slate 50
        doc.roundedRect(14, 65, 182, 28, 4, 4, 'FD')

        doc.setFontSize(9)
        doc.setTextColor(100, 113, 129)
        doc.text('TOTAL COBRADO (MXN)', 20, 74)
        doc.text('TOTAL PENDIENTE (MXN)', 80, 74)
        doc.text('RESUMEN DE FACTURAS', 140, 74)

        doc.setFontSize(16)
        doc.setTextColor(16, 185, 129) // Emerald 500
        doc.text(formatCurrency(summary.totalPaid), 20, 84)
        doc.setTextColor(244, 63, 94) // Rose 500
        doc.text(formatCurrency(summary.totalPending), 80, 84)

        doc.setFontSize(10)
        doc.setTextColor(15, 23, 42)
        doc.text(`${summary.numInvoices} Emitidas`, 140, 81)
        doc.setFontSize(9)
        doc.setTextColor(100, 113, 129)
        doc.text(`${summary.numPaid} Pagadas • ${summary.numOverdue} Vencidas`, 140, 87)

        const tableData = invoices.map(i => [
            i.folio || String(i.id).substring(0, 8),
            i.condominium_name || '-',
            i.unit_number || '-',
            format(new Date(i.due_date), 'dd/MM/yyyy'),
            i.status === 'paid' ? 'Pagada' : i.status === 'overdue' ? 'Vencida' : 'Pendiente',
            formatCurrency(Number(i.amount)),
            formatCurrency(Number(i.balance_due !== undefined ? i.balance_due : Math.max(0, i.amount - (i.paid_amount || 0))))
        ])

        autoTable(doc, {
            startY: 105,
            head: [['Folio', 'Condominio', 'Unidad', 'Vence', 'Estado', 'Subtotal', 'Adeudo MXN']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
                fillColor: [79, 70, 229], // Indigo 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            }, 
            styles: { 
                fontSize: 8,
                cellPadding: 3,
                lineColor: [226, 232, 240], // Slate 200 borders
                lineWidth: 0.1,
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate 50
            columnStyles: {
                5: { halign: 'right' },
                6: { halign: 'right', fontStyle: 'bold' } 
            }
        })

        doc.save(`Reporte_Financiero_${format(new Date(), 'yyyyMMdd')}.pdf`)
    }

    const generateExecutiveExcel = async (invoices: any[], summary: any) => {
        const wb = XLSX.utils.book_new()
        const summaryData = [
            ["InmobiGo - Plataforma de Administración"],
            ["REPORTE FINANCIERO EJECUTIVO"],
            [],
            ["Fecha de Generación:", format(new Date(), 'dd/MM/yyyy HH:mm')],
            ["Periodo:", summary.periodName],
            [],
            ["MÉTRICA", "VALOR"],
            ["Total Cobrado (MXN)", formatCurrency(summary.totalPaid)],
            ["Total Pendiente (MXN)", formatCurrency(summary.totalPending)],
            ["Facturas Emitidas", summary.numInvoices],
            ["Facturas Pagadas", summary.numPaid],
            ["Facturas Vencidas", summary.numOverdue],
        ]
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, ws1, "Resumen")

        const detailsData = invoices.map(i => ({
            "Folio": i.folio || i.id,
            "Condominio": i.condominium_name || "-",
            "Unidad": i.unit_number || "-",
            "Residente": i.resident_name || "-",
            "Concepto": i.description || "-",
            "Tipo": i.type === 'maintenance' ? 'Mantenimiento' : 'Extraordinaria',
            "Fecha Venc.": format(new Date(i.due_date), 'dd/MM/yyyy'),
            "Estado": i.status === 'paid' ? 'Pagada' : i.status === 'overdue' ? 'Vencida' : 'Pendiente',
            "Monto Total": Number(i.amount),
            "Pagado": Number(i.paid_amount || 0),
            "Adeudo": Number(i.balance_due !== undefined ? i.balance_due : Math.max(0, i.amount - (i.paid_amount || 0)))
        }))
        const ws2 = XLSX.utils.json_to_sheet(detailsData)
        XLSX.utils.book_append_sheet(wb, ws2, "Detalle de Facturas")
        XLSX.writeFile(wb, `Reporte_Financiero_${format(new Date(), 'yyyyMMdd')}.xlsx`)
    }

    // ------------------------------------------------------------------------------------------------ //
    // ------------------------------------- REPORTE MOROSIDAD ---------------------------------------- //
    // ------------------------------------------------------------------------------------------------ //

    const generateDelinquencyPDF = async (invoices: any[], summary: any) => {
        const doc = new jsPDF()

        try {
            const logo = await loadImage('/logo-inmobigo.png')
            const targetHeight = 16
            const targetWidth = targetHeight * (logo.width / logo.height)
            doc.addImage(logo, 'PNG', 14, 15, targetWidth, targetHeight)
        } catch (e) {
            console.warn("Could not load logo", e)
        }

        doc.setFontSize(24)
        doc.setTextColor(15, 23, 42) // Slate 900
        doc.text('Reporte de Morosidad', 14, 45)

        doc.setFontSize(10)
        doc.setTextColor(100, 113, 129) // Slate 500
        doc.text(`Corte a Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 52)
        doc.text(`Condominio: ${selectedCondo === 'all' ? 'Todos los condominios' : invoices[0]?.condominium_name || 'Desconocido'}`, 14, 57)

        // Totals Box (Ruby red tint)
        doc.setDrawColor(241, 245, 249) // Slate 100
        doc.setFillColor(255, 241, 242) // Rose 50
        doc.roundedRect(14, 65, 182, 28, 4, 4, 'FD')

        doc.setFontSize(9)
        doc.setTextColor(100, 113, 129)
        doc.text('TOTAL DE DEUDA (MXN)', 20, 74)
        doc.text('RESIDENTES MOROSOS', 100, 74)

        doc.setFontSize(16)
        doc.setTextColor(225, 29, 72) // Rose 600
        doc.text(formatCurrency(summary.totalDebt), 20, 84)
        
        doc.setTextColor(15, 23, 42) // Slate 900
        doc.text(`${summary.numDebtors} residentes`, 100, 84)

        // Table
        const tableData = invoices.map(i => [
            i.condominium_name || '-',
            i.unit_number || '-',
            i.resident_name || '-',
            i.description || '-',
            i.folio || String(i.id).substring(0, 8),
            `${i.days_overdue} días`,
            format(new Date(i.due_date), 'dd/MM/yyyy'),
            formatCurrency(i.calculated_balance)
        ])

        autoTable(doc, {
            startY: 105,
            head: [['Condominio', 'Unidad', 'Residente', 'Concepto', 'Folio', 'Atraso', 'Vence', 'Adeudo']],
            body: tableData,
            theme: 'grid',
            headStyles: { 
                fillColor: [225, 29, 72], // Rose 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            }, 
            styles: { 
                fontSize: 7, // Smaller to fit columns
                cellPadding: 3,
                lineColor: [226, 232, 240], // Slate 200 borders
                lineWidth: 0.1,
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate 50
            columnStyles: {
                5: { halign: 'right', textColor: [225, 29, 72], fontStyle: 'bold' }, // Atraso en rojo
                7: { halign: 'right', fontStyle: 'bold' } // Adeudo
            }
        })

        doc.save(`Reporte_Morosidad_${format(new Date(), 'yyyyMMdd')}.pdf`)
    }

    const generateDelinquencyExcel = async (invoices: any[], summary: any) => {
        const wb = XLSX.utils.book_new()
        const summaryData = [
            ["InmobiGo - Plataforma de Administración"],
            ["REPORTE DE MOROSIDAD Y CARTERA VENCIDA"],
            [],
            ["Corte a Fecha:", format(new Date(), 'dd/MM/yyyy HH:mm')],
            ["Condominio:", selectedCondo === 'all' ? 'Todos los condominios' : invoices[0]?.condominium_name || 'Desconocido'],
            [],
            ["MÉTRICA", "VALOR"],
            ["Total Adeudado Vencido (MXN)", formatCurrency(summary.totalDebt)],
            ["Total de Residentes", summary.numDebtors],
            ["Facturas Vencidas Activas", invoices.length]
        ]
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, ws1, "Resumen")

        const detailsData = invoices.map(i => ({
            "Condominio": i.condominium_name || "-",
            "Unidad": i.unit_number || "-",
            "Residente": i.resident_name || "-",
            "Concepto": i.description || "-",
            "Folio": i.folio || i.id,
            "Días de Atraso": i.days_overdue,
            "Fecha Venc.": format(new Date(i.due_date), 'dd/MM/yyyy'),
            "Adeudo Pendiente (MXN)": i.calculated_balance
        }))
        const ws2 = XLSX.utils.json_to_sheet(detailsData)
        XLSX.utils.book_append_sheet(wb, ws2, "Detalle de Morosos")
        XLSX.writeFile(wb, `Reporte_Morosidad_${format(new Date(), 'yyyyMMdd')}.xlsx`)
    }

    // ------------------------------------------------------------------------------------------------ //

    const handleGenerate = async () => {
        if (!organizationId) {
            setErrorMsg('Cargando contexto, por favor espera...')
            return
        }
        setIsGenerating(true)
        setErrorMsg('')

        try {
            let fileSummary: any = {}
            let finalTypeLabel = 'Reporte Especial'

            if (reportType === 'executive') {
                const { start, end } = getDates()
                const invoices = await financeService.getInvoicesForReport(
                    organizationId,
                    selectedCondo,
                    start.toISOString(),
                    end.toISOString()
                )

                if (invoices.length === 0) {
                    setErrorMsg('No hay facturas registradas en este periodo.')
                    setIsGenerating(false)
                    return
                }

                let totalPaid = 0, totalPending = 0, numPaid = 0, numOverdue = 0

                invoices.forEach(inv => {
                    const amount = Number(inv.amount || 0)
                    const paid = Number(inv.paid_amount || 0)
                    const balance = inv.balance_due !== undefined ? Number(inv.balance_due) : Math.max(0, amount - paid)

                    totalPaid += paid
                    totalPending += balance
                    if (inv.status === 'paid') numPaid++
                    if (inv.status === 'overdue') numOverdue++
                })

                const periodName = dateRange === 'this-month' ? `Mes Actual (${format(start, 'MMMM yyyy', { locale: es })})`
                            : dateRange === 'last-month' ? `Mes Anterior (${format(start, 'MMMM yyyy', { locale: es })})`
                            : dateRange === 'quarter' ? `Trimestre (Q${Math.floor(start.getMonth()/3)+1} ${start.getFullYear()})`
                            : `Año ${start.getFullYear()}`

                fileSummary = { periodName: periodName.toUpperCase(), totalPaid, totalPending, numInvoices: invoices.length, numPaid, numOverdue }
                finalTypeLabel = 'Reporte Financiero'

                if (formatOption === 'excel') await generateExecutiveExcel(invoices, fileSummary)
                else await generateExecutivePDF(invoices, fileSummary)

            } else if (reportType === 'delinquency') {
                const rawInvoices = await financeService.getDelinquentInvoices(organizationId, selectedCondo)
                const now = new Date()
                
                // Procesar saldos > 0 y calcular days_overdue
                const processed = rawInvoices.map(inv => {
                    const amount = Number(inv.amount || 0)
                    const paid = Number(inv.paid_amount || 0)
                    const balance = inv.balance_due !== undefined ? Number(inv.balance_due) : Math.max(0, amount - paid)
                    
                    const due = new Date(inv.due_date)
                    const diffTime = now.getTime() - due.getTime()
                    const days_overdue = diffTime > 0 ? Math.floor(diffTime / (1000 * 60 * 60 * 24)) : 0
                    
                    return { ...inv, calculated_balance: balance, days_overdue }
                }).filter(inv => inv.calculated_balance > 0)

                if (processed.length === 0) {
                    setErrorMsg('Para este condominio no hay facturas vencidas con saldo activo. ¡Excelente!')
                    setIsGenerating(false)
                    return
                }

                // Sorting
                processed.sort((a, b) => b.days_overdue - a.days_overdue)

                // Summarize
                const totalDebt = processed.reduce((acc, curr) => acc + curr.calculated_balance, 0)
                const totalDebtorsCount = processed.length

                fileSummary = { totalDebt, numDebtors: totalDebtorsCount }
                finalTypeLabel = 'Reporte de Morosidad'

                if (formatOption === 'excel') await generateDelinquencyExcel(processed, fileSummary)
                else await generateDelinquencyPDF(processed, fileSummary)
            } else if (reportType === 'whatsapp') {
                // Mock behavior for whatsapp type explicitly until full hookup
                setErrorMsg('Funcionalidad de Enviar por WhatsApp en construcción.')
                setIsGenerating(false)
                return
            }

            if (onSuccess) {
                onSuccess({
                    id: Date.now().toString(),
                    type: finalTypeLabel,
                    periodName: reportType === 'delinquency' ? 'Histórico' : fileSummary.periodName,
                    date: format(new Date(), 'yyyy-MM-dd HH:mm'),
                    size: formatOption === 'pdf' ? '~1.2 MB' : '~150 KB',
                    format: formatOption === 'pdf' ? 'PDF' : 'Excel'
                })
            }

            setIsSuccess(true)
            setTimeout(() => {
                setIsSuccess(false)
                setErrorMsg('')
                onClose()
            }, 2000)
        } catch (error: any) {
            console.error(error)
            setErrorMsg(error.message || 'Error al generar el reporte')
        } finally {
            setIsGenerating(false)
        }
    }

    const titlePrefix = reportType === 'executive' ? 'Reporte Financiero' : reportType === 'delinquency' ? 'Reporte de Morosidad' : 'Reporte de Whatsapp'

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative bg-zinc-950 border border-white/10 rounded-[2rem] p-6 md:p-8 max-w-md w-full shadow-2xl overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">Generar Reporte</h3>
                                    <p className="text-zinc-500 text-xs">{titlePrefix}</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="space-y-4 mb-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    Condominio
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedCondo}
                                        onChange={(e) => setSelectedCondo(e.target.value)}
                                        disabled={condominiums.length === 0}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-indigo-500 transition-all appearance-none disabled:opacity-50 cursor-pointer"
                                    >
                                        <option value="all" className="bg-zinc-900">Todos los condominios</option>
                                        {condominiums.map(c => (
                                            <option key={c.id} value={c.id} className="bg-zinc-900">{c.name}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                                        <ChevronDown size={16} />
                                    </div>
                                </div>
                            </div>

                            {reportType === 'executive' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                        Periodo
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={dateRange}
                                            onChange={(e) => setDateRange(e.target.value as any)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                                        >
                                            <option value="this-month" className="bg-zinc-900">Este Mes</option>
                                            <option value="last-month" className="bg-zinc-900">Mes Anterior</option>
                                            <option value="quarter" className="bg-zinc-900">Este Trimestre</option>
                                            <option value="year" className="bg-zinc-900">Año Actual</option>
                                        </select>
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-zinc-500">
                                            <ChevronDown size={16} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    Formato de Descarga
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => setFormatOption('pdf')}
                                        className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all font-bold text-sm ${formatOption === 'pdf' ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:border-white/10'}`}
                                    >
                                        <FileText size={18} className={formatOption === 'pdf' ? 'text-rose-400' : 'text-zinc-500'} />
                                        <span>PDF</span>
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormatOption('excel')}
                                        className={`flex items-center justify-center gap-3 p-4 rounded-xl border transition-all font-bold text-sm ${formatOption === 'excel' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/[0.03] border-white/5 text-zinc-500 hover:border-white/10'}`}
                                    >
                                        <FileSpreadsheet size={18} className={formatOption === 'excel' ? 'text-emerald-400' : 'text-zinc-500'} />
                                        <span>Excel</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || isSuccess}
                            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg disabled:opacity-50 ${isSuccess
                                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                                    : 'bg-white text-black hover:bg-zinc-200'
                                }`}
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin text-zinc-400" /> 
                                    <span>Generando Reporte...</span>
                                </>
                            ) : isSuccess ? (
                                <>
                                    <CheckCircle2 size={18} /> 
                                    <span>¡Reporte Descargado!</span>
                                </>
                            ) : (
                                <>
                                    <Download size={18} /> 
                                    <span>Descargar Reporte</span>
                                </>
                            )}
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
