'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Modal } from '@/components/ui/modal'
import { FileText, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, X, ChevronDown, Check } from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/utils/supabase/client'
import { financeService } from '@/services/finance-service'
import { formatCurrency } from '@/utils/format'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getBitacoraEntriesAction } from '@/app/actions/bitacora-actions'
import { EVENT_TYPE_CONFIG, STATUS_CONFIG } from '@/types/bitacora'
import { getPaymentAgreementsAction } from '@/app/actions/payment-agreement-actions'
import { getAllAnnouncementViewsAction } from '@/app/actions/announcement-actions'

interface ReportsGeneratorModalProps {
    isOpen: boolean
    reportType?: 'executive' | 'delinquency' | 'bitacora' | 'convenios' | 'lectura'
    onClose: () => void
    onSuccess?: (report: any) => void
}

const AGREEMENT_STATUS_LABEL: Record<string, string> = {
    pending: 'Pendiente',
    awaiting_signature: 'Esperando Firma',
    pending_final_approval: 'En Revisión',
    approved: 'Aprobado',
    rejected: 'Rechazado',
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export function ReportsGeneratorModal({ isOpen, reportType = 'executive', onClose, onSuccess }: ReportsGeneratorModalProps) {
    const [dateRange, setDateRange] = useState<'this-month' | 'last-month' | 'quarter' | 'year'>('this-month')
    const [selectedMonths, setSelectedMonths] = useState<number[]>(Array.from({ length: 12 }, (_, i) => i))
    const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false)
    const monthDropdownRef = useRef<HTMLDivElement>(null)
    const [formatOption, setFormatOption] = useState<'pdf' | 'excel'>('pdf')
    const [selectedCondo, setSelectedCondo] = useState<string>('all')
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')

    const [organizationId, setOrganizationId] = useState<string | null>(null)
    const [condominiums, setCondominiums] = useState<{ id: string, name: string }[]>([])

    const toggleMonth = (idx: number) => {
        setSelectedMonths(prev => prev.includes(idx) ? prev.filter(m => m !== idx) : [...prev, idx].sort((a, b) => a - b))
    }

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
                setIsMonthDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const monthsSummaryLabel = selectedMonths.length === 0
        ? 'Selecciona meses...'
        : selectedMonths.length === 12
            ? 'Todos los meses'
            : selectedMonths.length <= 3
                ? selectedMonths.map(idx => MONTH_NAMES[idx]).join(', ')
                : `${selectedMonths.length} meses seleccionados`

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
    // ------------------------------------- REPORTE DE BITÁCORA -------------------------------------- //
    // ------------------------------------------------------------------------------------------------ //

    const generateBitacoraPDF = async (entries: any[], summary: any) => {
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
        doc.text('Reporte de Bitácora', 14, 45)

        doc.setFontSize(10)
        doc.setTextColor(100, 113, 129) // Slate 500
        doc.text(`Periodo: ${summary.periodName}`, 14, 52)
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 57)

        doc.setDrawColor(226, 232, 240) // Slate 200
        doc.setFillColor(248, 250, 252) // Slate 50
        doc.roundedRect(14, 65, 182, 28, 4, 4, 'FD')

        doc.setFontSize(9)
        doc.setTextColor(100, 113, 129)
        doc.text('TOTAL DE MOVIMIENTOS', 20, 74)
        doc.text('ACCESOS', 80, 74)
        doc.text('ENTREGAS', 115, 74)
        doc.text('AMENIDADES', 150, 74)

        doc.setFontSize(16)
        doc.setTextColor(79, 70, 229) // Indigo 600
        doc.text(String(summary.total), 20, 84)
        doc.setFontSize(13)
        doc.setTextColor(15, 23, 42)
        doc.text(String(summary.accesos), 80, 84)
        doc.text(String(summary.entregas), 115, 84)
        doc.text(String(summary.amenidades), 150, 84)

        const tableData = entries.map(e => [
            e.checked_in_at ? format(new Date(e.checked_in_at), 'dd/MM/yyyy HH:mm') : '-',
            EVENT_TYPE_CONFIG[e.event_type as keyof typeof EVENT_TYPE_CONFIG]?.label || e.event_type,
            e.person_name || '-',
            e.condominium_name || '-',
            e.unit_number || '-',
            e.authorized_by || '-',
            e.guard_name || '-',
            e.checked_out_at ? format(new Date(e.checked_out_at), 'dd/MM/yyyy HH:mm') : '-',
            STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG]?.label || e.status,
        ])

        autoTable(doc, {
            startY: 105,
            head: [['Entrada', 'Tipo', 'Persona/Visitante', 'Condominio', 'Unidad', 'Autorizó', 'Guardia', 'Salida', 'Estado']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229], // Indigo 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 6.5,
            },
            styles: {
                fontSize: 6.5,
                cellPadding: 2,
                lineColor: [226, 232, 240], // Slate 200 borders
                lineWidth: 0.1,
                overflow: 'linebreak',
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }, // Slate 50
        })

        doc.save(`Reporte_Bitacora_${format(new Date(), 'yyyyMMdd')}.pdf`)
    }

    const generateBitacoraExcel = async (entries: any[], summary: any) => {
        const wb = XLSX.utils.book_new()
        const summaryData = [
            ["InmobiGo - Plataforma de Administración"],
            ["REPORTE DE BITÁCORA"],
            [],
            ["Fecha de Generación:", format(new Date(), 'dd/MM/yyyy HH:mm')],
            ["Periodo:", summary.periodName],
            [],
            ["MÉTRICA", "VALOR"],
            ["Total de Movimientos", summary.total],
            ["Accesos", summary.accesos],
            ["Entregas", summary.entregas],
            ["Amenidades", summary.amenidades],
        ]
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, ws1, "Resumen")

        const detailsData = entries.map(e => ({
            "Entrada": e.checked_in_at ? format(new Date(e.checked_in_at), 'dd/MM/yyyy HH:mm') : '-',
            "Tipo": EVENT_TYPE_CONFIG[e.event_type as keyof typeof EVENT_TYPE_CONFIG]?.label || e.event_type,
            "Persona/Visitante": e.person_name || '-',
            "Condominio": e.condominium_name || '-',
            "Unidad": e.unit_number || '-',
            "Autorizó": e.authorized_by || '-',
            "Guardia": e.guard_name || '-',
            "Checkpoint": e.checkpoint || '-',
            "Salida": e.checked_out_at ? format(new Date(e.checked_out_at), 'dd/MM/yyyy HH:mm') : '-',
            "Duración (min)": e.duration_minutes ?? '-',
            "Estado": STATUS_CONFIG[e.status as keyof typeof STATUS_CONFIG]?.label || e.status,
        }))
        const ws2 = XLSX.utils.json_to_sheet(detailsData)
        XLSX.utils.book_append_sheet(wb, ws2, "Detalle de Bitácora")
        XLSX.writeFile(wb, `Reporte_Bitacora_${format(new Date(), 'yyyyMMdd')}.xlsx`)
    }

    // ------------------------------------------------------------------------------------------------ //
    // ------------------------------------- REPORTE DE CONVENIOS ------------------------------------- //
    // ------------------------------------------------------------------------------------------------ //

    const generateConveniosPDF = async (agreements: any[], summary: any) => {
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
        doc.setTextColor(15, 23, 42)
        doc.text('Reporte de Convenios', 14, 45)

        doc.setFontSize(10)
        doc.setTextColor(100, 113, 129)
        doc.text(`Periodo: ${summary.periodName}  •  Condominio: ${summary.condoName}`, 14, 52)
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 57)

        doc.setDrawColor(226, 232, 240)
        doc.setFillColor(255, 251, 235) // Amber 50
        doc.roundedRect(14, 65, 182, 28, 4, 4, 'FD')

        doc.setFontSize(9)
        doc.setTextColor(100, 113, 129)
        doc.text('CONVENIOS TOTALES', 20, 74)
        doc.text('APROBADOS', 65, 74)
        doc.text('EN PROCESO', 105, 74)
        doc.text('ADEUDO CUBIERTO (MXN)', 150, 74)

        doc.setFontSize(16)
        doc.setTextColor(15, 23, 42)
        doc.text(String(summary.total), 20, 84)
        doc.setTextColor(16, 185, 129)
        doc.text(String(summary.approved), 65, 84)
        doc.setTextColor(217, 119, 6) // Amber 600
        doc.text(String(summary.inProgress), 105, 84)
        doc.setFontSize(13)
        doc.setTextColor(15, 23, 42)
        doc.text(formatCurrency(summary.totalDebt), 150, 84)

        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text('Desglose Mensual', 14, 102)

        const monthlyTableData = summary.monthlyBreakdown.map((m: any) => [
            m.month,
            String(m.total),
            String(m.approved),
            String(m.rejected),
            String(m.inProgress),
            formatCurrency(m.totalDebt),
        ])

        autoTable(doc, {
            startY: 107,
            head: [['Mes', 'Convenios', 'Aprobados', 'Rechazados', 'En Proceso', 'Adeudo Cubierto']],
            body: monthlyTableData,
            foot: [['TOTAL', String(summary.total), String(summary.approved), String(summary.rejected), String(summary.inProgress), formatCurrency(summary.totalDebt)]],
            theme: 'grid',
            headStyles: {
                fillColor: [217, 119, 6], // Amber 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            footStyles: {
                fillColor: [255, 251, 235], // Amber 50
                textColor: [15, 23, 42],
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineColor: [226, 232, 240],
                lineWidth: 0.1,
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                5: { halign: 'right', fontStyle: 'bold' },
            }
        })

        const detailStartY = (doc as any).lastAutoTable.finalY + 15
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text('Detalle de Convenios', 14, detailStartY)

        const tableData = agreements.map(a => [
            a.resident_name || '-',
            a.condominium_name || '-',
            a.unit_number || '-',
            formatCurrency(Number(a.total_debt || 0)),
            String(a.num_installments ?? '-'),
            AGREEMENT_STATUS_LABEL[a.status] || a.status,
            format(new Date(a.created_at), 'dd/MM/yyyy'),
            a.approved_at ? format(new Date(a.approved_at), 'dd/MM/yyyy') : '-',
        ])

        autoTable(doc, {
            startY: detailStartY + 5,
            head: [['Residente', 'Condominio', 'Unidad', 'Adeudo', 'Cuotas', 'Estatus', 'Creado', 'Aprobado']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [217, 119, 6], // Amber 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 7.5,
                cellPadding: 3,
                lineColor: [226, 232, 240],
                lineWidth: 0.1,
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                3: { halign: 'right', fontStyle: 'bold' },
            }
        })

        doc.save(`Reporte_Convenios_${summary.year}_${format(new Date(), 'yyyyMMdd')}.pdf`)
    }

    const generateConveniosExcel = async (agreements: any[], summary: any) => {
        const wb = XLSX.utils.book_new()
        const summaryData = [
            ["InmobiGo - Plataforma de Administración"],
            ["REPORTE DE CONVENIOS"],
            [],
            ["Fecha de Generación:", format(new Date(), 'dd/MM/yyyy HH:mm')],
            ["Periodo:", summary.periodName],
            ["Condominio:", summary.condoName],
            [],
            ["MÉTRICA", "VALOR"],
            ["Convenios Totales", summary.total],
            ["Aprobados", summary.approved],
            ["En Proceso", summary.inProgress],
            ["Rechazados", summary.rejected],
            ["Adeudo Cubierto por Convenios (MXN)", formatCurrency(summary.totalDebt)],
        ]
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, ws1, "Resumen")

        const monthlyData = summary.monthlyBreakdown.map((m: any) => ({
            "Mes": m.month,
            "Convenios": m.total,
            "Aprobados": m.approved,
            "Rechazados": m.rejected,
            "En Proceso": m.inProgress,
            "Adeudo Cubierto (MXN)": m.totalDebt,
        }))
        const wsMonthly = XLSX.utils.json_to_sheet(monthlyData)
        XLSX.utils.book_append_sheet(wb, wsMonthly, "Desglose Mensual")

        const detailsData = agreements.map(a => ({
            "Residente": a.resident_name || '-',
            "Condominio": a.condominium_name || '-',
            "Unidad": a.unit_number || '-',
            "Adeudo Total": Number(a.total_debt || 0),
            "Número de Cuotas": a.num_installments ?? '-',
            "Estatus": AGREEMENT_STATUS_LABEL[a.status] || a.status,
            "Detalles": a.agreement_details || '-',
            "Fecha de Creación": format(new Date(a.created_at), 'dd/MM/yyyy'),
            "Aprobado por": a.approved_by || '-',
            "Fecha de Aprobación": a.approved_at ? format(new Date(a.approved_at), 'dd/MM/yyyy') : '-',
        }))
        const ws2 = XLSX.utils.json_to_sheet(detailsData)
        XLSX.utils.book_append_sheet(wb, ws2, "Detalle de Convenios")
        XLSX.writeFile(wb, `Reporte_Convenios_${summary.year}_${format(new Date(), 'yyyyMMdd')}.xlsx`)
    }

    // ------------------------------------------------------------------------------------------------ //
    // ------------------------------------- REPORTE DE CONTROL DE LECTURA ---------------------------- //
    // ------------------------------------------------------------------------------------------------ //

    const generateLecturaPDF = async (views: any[], summary: any) => {
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
        doc.setTextColor(15, 23, 42)
        doc.text('Reporte de Control de Lectura', 14, 45)

        doc.setFontSize(10)
        doc.setTextColor(100, 113, 129)
        doc.text(`Periodo: ${summary.periodName}`, 14, 52)
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 57)

        doc.setDrawColor(226, 232, 240)
        doc.setFillColor(236, 254, 255) // Cyan 50
        doc.roundedRect(14, 65, 182, 28, 4, 4, 'FD')

        doc.setFontSize(9)
        doc.setTextColor(100, 113, 129)
        doc.text('CONFIRMACIONES', 20, 74)
        doc.text('AVISOS CON LECTURA', 70, 74)
        doc.text('RESIDENTES QUE LEYERON', 125, 74)
        doc.text('COBERTURA', 170, 74)

        doc.setFontSize(16)
        doc.setTextColor(8, 145, 178) // Cyan 600
        doc.text(String(summary.total), 20, 84)
        doc.setTextColor(15, 23, 42)
        doc.text(String(summary.uniqueAnnouncements), 70, 84)
        doc.text(String(summary.uniqueResidents), 125, 84)
        doc.text(summary.totalResidents > 0 ? `${Math.round((summary.uniqueResidents / summary.totalResidents) * 100)}%` : 'N/A', 170, 84)

        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text('Desglose Mensual', 14, 102)

        const monthlyTableData = summary.monthlyBreakdown.map((m: any) => [
            m.month,
            String(m.total),
            String(m.uniqueAnnouncements),
            String(m.uniqueResidents),
        ])

        autoTable(doc, {
            startY: 107,
            head: [['Mes', 'Confirmaciones', 'Avisos con Lectura', 'Residentes que Leyeron']],
            body: monthlyTableData,
            foot: [['TOTAL', String(summary.total), String(summary.uniqueAnnouncements), String(summary.uniqueResidents)]],
            theme: 'grid',
            headStyles: {
                fillColor: [8, 145, 178], // Cyan 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            footStyles: {
                fillColor: [236, 254, 255], // Cyan 50
                textColor: [15, 23, 42],
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineColor: [226, 232, 240],
                lineWidth: 0.1,
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        })

        const detailStartY = (doc as any).lastAutoTable.finalY + 15
        doc.setFontSize(11)
        doc.setTextColor(15, 23, 42)
        doc.text('Detalle de Confirmaciones', 14, detailStartY)

        const tableData = views.map(v => [
            v.announcement_title || '-',
            v.resident_name || 'Desconocido',
            v.property_name || '-',
            v.unit_name || '-',
            v.acknowledged_at ? format(new Date(v.acknowledged_at), 'dd/MM/yyyy HH:mm') : '-',
        ])

        autoTable(doc, {
            startY: detailStartY + 5,
            head: [['Aviso', 'Residente', 'Condominio', 'Unidad', 'Confirmado el']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [8, 145, 178], // Cyan 600
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                lineColor: [226, 232, 240],
                lineWidth: 0.1,
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        })

        doc.save(`Reporte_Control_Lectura_${summary.year}_${format(new Date(), 'yyyyMMdd')}.pdf`)
    }

    const generateLecturaExcel = async (views: any[], summary: any) => {
        const wb = XLSX.utils.book_new()
        const summaryData = [
            ["InmobiGo - Plataforma de Administración"],
            ["REPORTE DE CONTROL DE LECTURA"],
            [],
            ["Fecha de Generación:", format(new Date(), 'dd/MM/yyyy HH:mm')],
            ["Periodo:", summary.periodName],
            [],
            ["MÉTRICA", "VALOR"],
            ["Confirmaciones de Lectura", summary.total],
            ["Avisos con al menos una Lectura", summary.uniqueAnnouncements],
            ["Residentes que Confirmaron", summary.uniqueResidents],
            ["Total de Residentes Registrados", summary.totalResidents],
            ["% de Cobertura", summary.totalResidents > 0 ? `${Math.round((summary.uniqueResidents / summary.totalResidents) * 100)}%` : 'N/A'],
        ]
        const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
        XLSX.utils.book_append_sheet(wb, ws1, "Resumen")

        const monthlyData = summary.monthlyBreakdown.map((m: any) => ({
            "Mes": m.month,
            "Confirmaciones": m.total,
            "Avisos con Lectura": m.uniqueAnnouncements,
            "Residentes que Leyeron": m.uniqueResidents,
        }))
        const wsMonthly = XLSX.utils.json_to_sheet(monthlyData)
        XLSX.utils.book_append_sheet(wb, wsMonthly, "Desglose Mensual")

        const detailsData = views.map(v => ({
            "Aviso": v.announcement_title || '-',
            "Residente": v.resident_name || 'Desconocido',
            "Condominio": v.property_name || '-',
            "Unidad": v.unit_name || '-',
            "Confirmado el": v.acknowledged_at ? format(new Date(v.acknowledged_at), 'dd/MM/yyyy HH:mm') : '-',
        }))
        const ws2 = XLSX.utils.json_to_sheet(detailsData)
        XLSX.utils.book_append_sheet(wb, ws2, "Detalle de Confirmaciones")
        XLSX.writeFile(wb, `Reporte_Control_Lectura_${summary.year}_${format(new Date(), 'yyyyMMdd')}.xlsx`)
    }

    // ------------------------------------------------------------------------------------------------ //

    const handleGenerate = async () => {
        if (!organizationId) {
            setErrorMsg('Cargando contexto, por favor espera...')
            return
        }
        if ((reportType === 'convenios' || reportType === 'lectura') && selectedMonths.length === 0) {
            setErrorMsg('Selecciona al menos un mes.')
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
            } else if (reportType === 'bitacora') {
                const { start, end } = getDates()
                const result = await getBitacoraEntriesAction(
                    organizationId,
                    {
                        date_from: format(start, 'yyyy-MM-dd'),
                        date_to: format(end, 'yyyy-MM-dd'),
                        condominium_id: selectedCondo !== 'all' ? selectedCondo : undefined,
                    },
                    0,
                    10000
                )

                if (!result.success) {
                    setErrorMsg(result.error || 'Error al obtener la bitácora')
                    setIsGenerating(false)
                    return
                }

                if (result.entries.length === 0) {
                    setErrorMsg('No hay movimientos de bitácora registrados en este periodo.')
                    setIsGenerating(false)
                    return
                }

                const entries = result.entries
                const accesos = entries.filter(e => e.event_type === 'access').length
                const entregas = entries.filter(e => e.event_type === 'delivery').length
                const amenidades = entries.filter(e => e.event_type === 'amenity').length

                const periodName = dateRange === 'this-month' ? `Mes Actual (${format(start, 'MMMM yyyy', { locale: es })})`
                            : dateRange === 'last-month' ? `Mes Anterior (${format(start, 'MMMM yyyy', { locale: es })})`
                            : dateRange === 'quarter' ? `Trimestre (Q${Math.floor(start.getMonth()/3)+1} ${start.getFullYear()})`
                            : `Año ${start.getFullYear()}`

                fileSummary = { periodName: periodName.toUpperCase(), total: entries.length, accesos, entregas, amenidades }
                finalTypeLabel = 'Reporte de Bitácora'

                if (formatOption === 'excel') await generateBitacoraExcel(entries, fileSummary)
                else await generateBitacoraPDF(entries, fileSummary)
            } else if (reportType === 'convenios') {
                const currentYear = new Date().getFullYear()
                const result = await getPaymentAgreementsAction()
                if (!result.success) {
                    setErrorMsg(result.error || 'Error al obtener los convenios')
                    setIsGenerating(false)
                    return
                }

                const supabase = createClient()
                const { data: residentsData } = await supabase
                    .from('residents')
                    .select('id, condominium_id, unit_id')
                const residentToCondo: Record<string, string> = {}
                const residentToUnit: Record<string, string> = {}
                ;(residentsData || []).forEach((r: any) => {
                    if (r.condominium_id) residentToCondo[r.id] = r.condominium_id
                    if (r.unit_id) residentToUnit[r.id] = r.unit_id
                })

                const condoNameById: Record<string, string> = {}
                condominiums.forEach(c => { condoNameById[c.id] = c.name })

                const unitIds = Array.from(new Set(Object.values(residentToUnit)))
                let unitNumberById: Record<string, string> = {}
                if (unitIds.length > 0) {
                    const { data: unitsData } = await supabase.from('units').select('id, unit_number').in('id', unitIds)
                    ;(unitsData || []).forEach((u: any) => { unitNumberById[u.id] = u.unit_number })
                }

                let agreements = (result.data || []).map((a: any) => ({
                    ...a,
                    condominium_id: residentToCondo[a.resident_id],
                    condominium_name: condoNameById[residentToCondo[a.resident_id]] || '-',
                    unit_number: unitNumberById[residentToUnit[a.resident_id]] || '-',
                }))

                if (selectedCondo !== 'all') {
                    agreements = agreements.filter((a: any) => a.condominium_id === selectedCondo)
                }

                agreements = agreements.filter((a: any) => {
                    const created = new Date(a.created_at)
                    return created.getFullYear() === currentYear && selectedMonths.includes(created.getMonth())
                })

                if (agreements.length === 0) {
                    setErrorMsg(`No hay convenios registrados en los meses seleccionados de ${currentYear} para este condominio.`)
                    setIsGenerating(false)
                    return
                }

                const approved = agreements.filter((a: any) => a.status === 'approved').length
                const rejected = agreements.filter((a: any) => a.status === 'rejected').length
                const inProgress = agreements.length - approved - rejected
                const totalDebt = agreements
                    .filter((a: any) => a.status === 'approved')
                    .reduce((acc: number, a: any) => acc + Number(a.total_debt || 0), 0)

                const monthlyBreakdown = selectedMonths.map((idx) => {
                    const name = MONTH_NAMES[idx]
                    const monthAgreements = agreements.filter((a: any) => new Date(a.created_at).getMonth() === idx)
                    const monthApproved = monthAgreements.filter((a: any) => a.status === 'approved')
                    const monthRejected = monthAgreements.filter((a: any) => a.status === 'rejected').length
                    const monthInProgress = monthAgreements.length - monthApproved.length - monthRejected
                    const monthDebt = monthApproved.reduce((acc: number, a: any) => acc + Number(a.total_debt || 0), 0)
                    return { month: name, total: monthAgreements.length, approved: monthApproved.length, rejected: monthRejected, inProgress: monthInProgress, totalDebt: monthDebt }
                })

                const monthsLabel = selectedMonths.length === 12 ? `Enero - Diciembre ${currentYear}` : `${selectedMonths.map(idx => MONTH_NAMES[idx]).join(', ')} ${currentYear}`

                fileSummary = {
                    condoName: selectedCondo === 'all' ? 'Todos los condominios' : (condoNameById[selectedCondo] || 'Desconocido'),
                    periodName: monthsLabel.toUpperCase(),
                    year: currentYear,
                    total: agreements.length,
                    approved,
                    rejected,
                    inProgress,
                    totalDebt,
                    monthlyBreakdown,
                }
                finalTypeLabel = 'Reporte de Convenios'

                if (formatOption === 'excel') await generateConveniosExcel(agreements, fileSummary)
                else await generateConveniosPDF(agreements, fileSummary)
            } else if (reportType === 'lectura') {
                const currentYear = new Date().getFullYear()
                const supabase = createClient()

                const { data: announcementsData } = await supabase
                    .from('announcements')
                    .select('id, title')
                    .eq('organization_id', organizationId)
                const announcementTitleById: Record<string, string> = {}
                ;(announcementsData || []).forEach((a: any) => { announcementTitleById[a.id] = a.title })

                const viewsResult = await getAllAnnouncementViewsAction(organizationId)
                if (!viewsResult.success) {
                    setErrorMsg(viewsResult.error || 'Error al obtener las confirmaciones de lectura')
                    setIsGenerating(false)
                    return
                }

                const selectedCondoName = selectedCondo !== 'all' ? condominiums.find(c => c.id === selectedCondo)?.name : null

                let views = (viewsResult.data || [])
                    .filter((v: any) => {
                        if (!v.acknowledged_at) return false
                        const ackDate = new Date(v.acknowledged_at)
                        return ackDate.getFullYear() === currentYear && selectedMonths.includes(ackDate.getMonth())
                    })
                    .filter((v: any) => !selectedCondoName || v.property_name === selectedCondoName)
                    .map((v: any) => ({ ...v, announcement_title: announcementTitleById[v.announcement_id] }))
                    .sort((a: any, b: any) => new Date(b.acknowledged_at).getTime() - new Date(a.acknowledged_at).getTime())

                if (views.length === 0) {
                    setErrorMsg(`No hay confirmaciones de lectura registradas en los meses seleccionados de ${currentYear}.`)
                    setIsGenerating(false)
                    return
                }

                let totalResidentsQuery = supabase
                    .from('residents')
                    .select('*, condominiums!inner(organization_id)', { count: 'exact', head: true })
                    .eq('condominiums.organization_id', organizationId)
                if (selectedCondo !== 'all') totalResidentsQuery = totalResidentsQuery.eq('condominium_id', selectedCondo)
                const { count: totalResidentsCount } = await totalResidentsQuery

                const uniqueAnnouncements = new Set(views.map(v => v.announcement_id)).size
                const uniqueResidents = new Set(views.map(v => v.resident_name)).size

                const monthlyBreakdown = selectedMonths.map((idx) => {
                    const name = MONTH_NAMES[idx]
                    const monthViews = views.filter((v: any) => new Date(v.acknowledged_at).getMonth() === idx)
                    const monthAnnouncements = new Set(monthViews.map((v: any) => v.announcement_id)).size
                    const monthResidents = new Set(monthViews.map((v: any) => v.resident_name)).size
                    return { month: name, total: monthViews.length, uniqueAnnouncements: monthAnnouncements, uniqueResidents: monthResidents }
                })

                const monthsLabel = selectedMonths.length === 12 ? `Enero - Diciembre ${currentYear}` : `${selectedMonths.map(idx => MONTH_NAMES[idx]).join(', ')} ${currentYear}`

                fileSummary = {
                    periodName: monthsLabel.toUpperCase(),
                    year: currentYear,
                    total: views.length,
                    uniqueAnnouncements,
                    uniqueResidents,
                    totalResidents: totalResidentsCount || 0,
                    monthlyBreakdown,
                }
                finalTypeLabel = 'Reporte de Control de Lectura'

                if (formatOption === 'excel') await generateLecturaExcel(views, fileSummary)
                else await generateLecturaPDF(views, fileSummary)
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

    const titlePrefix = reportType === 'executive' ? 'Reporte Financiero'
        : reportType === 'delinquency' ? 'Reporte de Morosidad'
        : reportType === 'bitacora' ? 'Reporte de Bitácora'
        : reportType === 'convenios' ? 'Reporte de Convenios'
        : 'Reporte de Control de Lectura'

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

                            {(reportType === 'executive' || reportType === 'bitacora') && (
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

                            {(reportType === 'convenios' || reportType === 'lectura') && (
                                <div className="space-y-1.5" ref={monthDropdownRef}>
                                    <label className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                                        Meses a incluir ({new Date().getFullYear()})
                                    </label>
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsMonthDropdownOpen(o => !o)}
                                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-indigo-500 transition-all flex items-center justify-between cursor-pointer"
                                        >
                                            <span className="truncate text-left">{monthsSummaryLabel}</span>
                                            <ChevronDown size={16} className={`text-zinc-500 shrink-0 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>

                                        {isMonthDropdownOpen && (
                                            <div className="absolute z-20 mt-2 w-full bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedMonths(selectedMonths.length === 12 ? [] : Array.from({ length: 12 }, (_, i) => i))}
                                                    className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-400 hover:bg-white/5 border-b border-white/10 transition-colors"
                                                >
                                                    {selectedMonths.length === 12 ? 'Quitar todos' : 'Seleccionar todos'}
                                                </button>
                                                <div className="max-h-56 overflow-y-auto">
                                                    {MONTH_NAMES.map((name, idx) => (
                                                        <button
                                                            type="button"
                                                            key={name}
                                                            onClick={() => toggleMonth(idx)}
                                                            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                                                        >
                                                            <span>{name}</span>
                                                            <span className={`flex h-4 w-4 items-center justify-center rounded border ${selectedMonths.includes(idx) ? 'bg-indigo-500 border-indigo-500' : 'border-white/20'}`}>
                                                                {selectedMonths.includes(idx) && <Check size={12} className="text-white" />}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
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
