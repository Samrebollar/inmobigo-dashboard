'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { demoDb } from '@/utils/demo-db'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Filter, FileText, ArrowUpRight, ArrowDownRight, CheckCircle2, Eye, X, Loader2, FileSpreadsheet, Calendar, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
    </svg>
)

export function FinanceTab() {
    const params = useParams()
    const condoId = params.id as string
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [recentInvoices, setRecentInvoices] = useState<any[]>([])
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
    const [sendingReminderId, setSendingReminderId] = useState<string | null>(null)
    const [toastMessage, setToastMessage] = useState<{title: string, type: 'success' | 'error'} | null>(null)
    const [metrics, setMetrics] = useState({
        facturado: 0,
        recaudado: 0,
        porCobrar: 0,
        vencido: 0,
        morosos: 0
    })

    // Menú de Exportación y Periodo
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
    const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false)
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ]
        const currentMonth = new Date().getMonth()
        return {
            month: currentMonth,
            year: new Date().getFullYear(),
            label: monthNames[currentMonth]
        }
    })
    const exportMenuRef = useRef<HTMLDivElement>(null)
    const periodMenuRef = useRef<HTMLDivElement>(null)

    // Cierra el menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false)
            }
            if (periodMenuRef.current && !periodMenuRef.current.contains(event.target as Node)) {
                setIsPeriodMenuOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const exportToCSV = () => {
        setIsExportMenuOpen(false)
        if (!recentInvoices || recentInvoices.length === 0) {
            showToast('No hay datos para exportar', 'error')
            return
        }

        const dataToExport = recentInvoices.map(inv => ({
            'Folio': inv.folio,
            'Unidad': inv.unidad,
            'Concepto': inv.concepto,
            'Monto (MXN)': inv.monto,
            'Estado': inv.estado === 'paid' ? 'Pagada' : inv.estado === 'overdue' ? 'Vencida' : 'Pendiente',
            'Días de Atraso': inv.estado === 'paid' ? 0 : inv.atraso,
            'Vencimiento': new Date(inv.due_date).toLocaleDateString('es-MX')
        }))

        // CSV con BOM explícito para Excel (Codificación UTF-8 para acentos felices)
        const csv = Papa.unparse(dataToExport)
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Movimientos_InmobiGo_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        showToast('Exportación Excel completada')
    }

    const exportToPDF = () => {
        setIsExportMenuOpen(false)
        if (!recentInvoices || recentInvoices.length === 0) {
            showToast('No hay datos para exportar', 'error')
            return
        }

        const doc = new jsPDF()
        
        // Cabecera Reporte
        doc.setFontSize(18)
        doc.setTextColor(40, 40, 40)
        doc.text('Reporte de Gestión de Cobranza', 14, 22)
        
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 30)
        
        // Métricas resumidas
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text(`Total Recaudado: $${metrics.recaudado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, 40)
        doc.text(`Pendiente: $${metrics.porCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, 46)
        doc.text(`Morosidad: $${metrics.vencido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, 52)

        const tableColumn = ["Folio", "Unidad", "Concepto", "Monto", "Estado", "Atraso", "Vence"]
        const tableRows: any[] = []

        recentInvoices.forEach(inv => {
            const estadoTexto = inv.estado === 'paid' ? 'Pagada' : inv.estado === 'overdue' ? 'Vencida' : 'Pendiente'
            tableRows.push([
                inv.folio,
                inv.unidad,
                inv.concepto,
                `$${Number(inv.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
                estadoTexto,
                inv.estado === 'paid' ? '-' : `${inv.atraso}d`,
                new Date(inv.due_date).toLocaleDateString('es-MX')
            ])
        })

        // Tabla automatizada
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 60,
            styles: { fontSize: 9, cellPadding: 3 },
            headStyles: { fillColor: [79, 70, 229] }, // Color Índigo de InmobiGo
            alternateRowStyles: { fillColor: [245, 245, 245] },
        })

        doc.save(`Movimientos_InmobiGo_${new Date().toISOString().split('T')[0]}.pdf`)
        showToast('Reporte PDF descargado')
    }

    const showToast = (title: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ title, type })
        setTimeout(() => setToastMessage(null), 3500)
    }

    const periods = [
        { label: 'Todos los meses', month: -1, year: new Date().getFullYear() },
        { label: 'Enero', month: 0, year: new Date().getFullYear() },
        { label: 'Febrero', month: 1, year: new Date().getFullYear() },
        { label: 'Marzo', month: 2, year: new Date().getFullYear() },
        { label: 'Abril', month: 3, year: new Date().getFullYear() },
        { label: 'Mayo', month: 4, year: new Date().getFullYear() },
        { label: 'Junio', month: 5, year: new Date().getFullYear() },
        { label: 'Julio', month: 6, year: new Date().getFullYear() },
        { label: 'Agosto', month: 7, year: new Date().getFullYear() },
        { label: 'Septiembre', month: 8, year: new Date().getFullYear() },
        { label: 'Octubre', month: 9, year: new Date().getFullYear() },
        { label: 'Noviembre', month: 10, year: new Date().getFullYear() },
        { label: 'Diciembre', month: 11, year: new Date().getFullYear() },
    ]

    const fetchBillingData = async () => {
        try {
            if (condoId.startsWith('demo-')) {
                const demoUnits = demoDb.getUnits(condoId)
                const demoSum = demoUnits.reduce((acc, u) => acc + (u.monto_mensual || 0), 0)
                
                let demoRecaudado = 98200
                let unpaid = Math.max(0, demoSum - demoRecaudado)
                let morosos = 3

                if (selectedPeriod.month === -1) {
                    demoRecaudado = 284500
                    unpaid = 45000
                    morosos = 5
                } else {
                    const monthFactor = (selectedPeriod.month + 1) / 12
                    demoRecaudado = Math.floor(98200 * monthFactor)
                    unpaid = Math.floor(unpaid * monthFactor)
                    morosos = Math.max(1, Math.floor(3 * monthFactor))
                }

                setMetrics({
                    facturado: (demoRecaudado + unpaid),
                    recaudado: demoRecaudado,
                    porCobrar: Math.floor(unpaid * 0.3),
                    vencido: Math.floor(unpaid * 0.7),
                    morosos: morosos
                })
                return
            }

            let totalPeriodo = 0
            let recaudado = 0
            let porCobrar = 0
            let vencido = 0
            const debtorResidents = new Set<string>()

            if (selectedPeriod.month !== -1) {
                // Fetch expected monthly income (totalPeriodo) from units (active only)
                const { data: unitsData, error: unitsError } = await supabase
                    .from('units')
                    .select('monto_mensual')
                    .eq('condominium_id', condoId)
                    .neq('billing_status', 'suspended')
                
                if (unitsError) throw unitsError
                totalPeriodo = unitsData?.reduce((acc, u) => acc + Number(u.monto_mensual || 0), 0) || 0

                // Fetch invoices of selected month (strictly maintenance type to avoid manual payment duplicates)
                const startOfPeriod = new Date(selectedPeriod.year, selectedPeriod.month, 1).toISOString()
                const endOfPeriod = new Date(selectedPeriod.year, selectedPeriod.month + 1, 0, 23, 59, 59).toISOString()
                
                const { data: invoices, error: invoiceError } = await supabase
                    .from('resident_invoices')
                    .select('amount, balance_due, status, resident_id, invoice_type')
                    .eq('condominium_id', condoId)
                    .eq('invoice_type', 'maintenance')
                    .gte('created_at', startOfPeriod)
                    .lte('created_at', endOfPeriod)

                if (invoiceError) throw invoiceError

                invoices?.forEach(inv => {
                    const bal = Number(inv.balance_due || 0)
                    
                    if (inv.status === 'pending') {
                        porCobrar += bal
                    } else if (inv.status === 'overdue') {
                        vencido += bal
                        if (bal > 0 && inv.resident_id) {
                            debtorResidents.add(inv.resident_id)
                        }
                    }
                })

                // Recaudado is the complement of outstanding debt
                recaudado = Math.max(0, totalPeriodo - porCobrar - vencido)
            } else {
                // All time aggregation (Todos los meses)
                const { data: invoices, error: invoiceError } = await supabase
                    .from('resident_invoices')
                    .select('amount, balance_due, status, resident_id')
                    .eq('condominium_id', condoId)

                if (invoiceError) throw invoiceError

                invoices?.forEach(inv => {
                    const amt = Number(inv.amount || 0)
                    const bal = Number(inv.balance_due || 0)
                    
                    totalPeriodo += amt
                    recaudado += Math.max(0, amt - bal)
                    
                    if (inv.status === 'overdue') {
                        vencido += bal
                        if (bal > 0 && inv.resident_id) debtorResidents.add(inv.resident_id)
                    } else if (inv.status === 'pending') {
                        porCobrar += bal
                        if (bal > 0 && inv.resident_id) debtorResidents.add(inv.resident_id)
                    }
                })
            }

            setMetrics({
                facturado: totalPeriodo,
                recaudado,
                porCobrar,
                vencido,
                morosos: debtorResidents.size
            })
        } catch (err) {
            console.error('Fetch billing error:', err)
        }
    }

    const fetchInvoices = async () => {
        try {
            if (condoId.startsWith('demo-')) {
                const allDemoInvoices = [
                    { id: '1', folio: 'FAC-DEMO0001', unidad: 'A-101', concepto: 'Mantenimiento Enero 2026', monto: 2500, paid_amount: 2500, estado: 'paid', telefono: '5551234567', atraso: 0, reminder_sent: false, due_date: '2026-01-10', fecha: '2026-01-01T08:00:00.000Z' },
                    { id: '2', folio: 'FAC-DEMO0002', unidad: 'A-102', concepto: 'Mantenimiento Febrero 2026', monto: 2500, paid_amount: 2500, estado: 'paid', telefono: '5551234567', atraso: 0, reminder_sent: false, due_date: '2026-02-10', fecha: '2026-02-01T08:00:00.000Z' },
                    { id: '3', folio: 'FAC-DEMO0003', unidad: 'B-103', concepto: 'Mantenimiento Marzo 2026', monto: 2800, paid_amount: 0, estado: 'overdue', telefono: '5551234567', atraso: 18, reminder_sent: false, due_date: '2026-03-10', fecha: '2026-03-01T08:00:00.000Z' },
                    { id: '4', folio: 'FAC-DEMO0004', unidad: 'C-201', concepto: 'Mantenimiento Abril 2026', monto: 3100, paid_amount: 3100, estado: 'paid', telefono: '5551234567', atraso: 0, reminder_sent: false, due_date: '2026-04-10', fecha: '2026-04-01T08:00:00.000Z' },
                    { id: '5', folio: 'FAC-DEMO0005', unidad: 'D-404', concepto: 'Mantenimiento Mayo 2026', monto: 3500, paid_amount: 1500, estado: 'pending', telefono: '5551234567', atraso: 0, reminder_sent: false, due_date: '2026-05-10', fecha: '2026-05-01T08:00:00.000Z' },
                ]

                if (selectedPeriod.month === -1) {
                    setRecentInvoices(allDemoInvoices)
                } else {
                    const filtered = allDemoInvoices.filter(inv => {
                        const date = new Date(inv.fecha)
                        return date.getMonth() === selectedPeriod.month && date.getFullYear() === selectedPeriod.year
                    })
                    setRecentInvoices(filtered)
                }
                setLoading(false)
                return
            }

            // Real DB query
            let query = supabase
                .from('resident_invoices')
                .select(`
                    id, amount, balance_due, status, created_at, due_date, description, invoice_type,
                    residents (
                        first_name, last_name, phone,
                        units (unit_number)
                    )
                `)
                .eq('condominium_id', condoId)

            if (selectedPeriod.month !== -1) {
                const startOfPeriod = new Date(selectedPeriod.year, selectedPeriod.month, 1).toISOString()
                const endOfPeriod = new Date(selectedPeriod.year, selectedPeriod.month + 1, 0, 23, 59, 59).toISOString()
                query = query.gte('created_at', startOfPeriod).lte('created_at', endOfPeriod)
                query = query.eq('invoice_type', 'maintenance')
            }

            const { data: invoicesData, error: invoiceError } = await query
                .order('created_at', { ascending: false })
                .limit(100)

            if (invoiceError) {
                console.error('Error fetching resident_invoices details:', JSON.stringify(invoiceError, null, 2))
                return
            }

            if (invoicesData) {
                const mappedInvoices = invoicesData.map((inv: any) => {
                    const resident = inv.residents
                    const unitName = resident?.units?.unit_number || 'S/N'
                    const phone = resident?.phone || ''
                    const folio = `FAC-${inv.id.substring(0, 8).toUpperCase()}`
                    const concept = inv.description || 'Cuota de mantenimiento'

                    // paid_amount calculated from amount - balance_due
                    const paidAmount = Math.max(0, Number(inv.amount || 0) - Number(inv.balance_due || 0))

                    const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at)
                    const today = new Date()
                    let delayDays = 0
                    
                    if (inv.status !== 'paid' && today > dueDate) {
                        const diffTime = today.getTime() - dueDate.getTime()
                        delayDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                    }

                    const isPaid = inv.status === 'paid'
                    const isPartiallyPaid = inv.status !== 'paid' && Number(inv.balance_due) > 0 && Number(inv.balance_due) < Number(inv.amount)
                    const monto = isPaid 
                        ? inv.amount 
                        : (isPartiallyPaid ? (Number(inv.amount) - Number(inv.balance_due)) : (inv.balance_due ?? inv.amount))

                    return {
                        id: inv.id,
                        folio,
                        unidad: unitName,
                        concepto: concept,
                        monto: monto,
                        paid_amount: paidAmount,
                        estado: inv.status,
                        telefono: phone,
                        atraso: delayDays,
                        reminder_sent: false,
                        due_date: dueDate.toISOString(),
                        fecha: inv.created_at,
                        resident_name: resident ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim() : 'Residente',
                    }
                })
                
                setRecentInvoices(mappedInvoices)
            }
        } catch (err) {
            console.error('Fetch invoices error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (!condoId) return
        setLoading(true)
        fetchBillingData().then(() => fetchInvoices())
    }, [condoId, selectedPeriod])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-medium text-white">Gestión de Cobranza</h3>
                <div className="flex gap-2">
                    <div className="relative" ref={periodMenuRef}>
                        <Button 
                            variant="outline" 
                            className="border-zinc-700/80 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800/80 hover:text-white transition-all duration-200 shadow-md flex items-center gap-2"
                            onClick={() => setIsPeriodMenuOpen(!isPeriodMenuOpen)}
                        >
                            <Calendar className="h-4 w-4 text-indigo-400" />
                            <span>Periodo: {selectedPeriod.label}</span>
                            <ChevronDown className={`h-3.5 w-3.5 text-zinc-500 transition-transform duration-200 ${isPeriodMenuOpen ? 'rotate-180 text-white' : ''}`} />
                        </Button>
                        <AnimatePresence>
                            {isPeriodMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    className="absolute left-0 mt-2 w-64 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md p-2 shadow-2xl z-50 ring-1 ring-white/5"
                                >
                                    {/* Option: Todos los meses */}
                                    <button 
                                        onClick={() => {
                                            setSelectedPeriod({ month: -1, year: new Date().getFullYear(), label: 'Todos los meses' })
                                            setIsPeriodMenuOpen(false)
                                        }}
                                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-all duration-150 ${selectedPeriod.month === -1 ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-500/20' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`h-1.5 w-1.5 rounded-full ${selectedPeriod.month === -1 ? 'bg-white' : 'bg-zinc-500'}`} />
                                            <span>Todos los meses</span>
                                        </div>
                                        <span className="text-xs opacity-60">Anual</span>
                                    </button>

                                    <div className="h-px bg-zinc-800/60 my-1.5" />

                                    {/* Monthly Grid */}
                                    <div className="grid grid-cols-2 gap-1 px-1 pb-1">
                                        {periods.filter(p => p.month !== -1).map((p) => (
                                            <button 
                                                key={p.label}
                                                onClick={() => {
                                                    setSelectedPeriod(p)
                                                    setIsPeriodMenuOpen(false)
                                                }}
                                                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all duration-150 ${selectedPeriod.month === p.month ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-500/20' : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'}`}
                                            >
                                                <div className={`h-1.5 w-1.5 rounded-full ${selectedPeriod.month === p.month ? 'bg-white' : 'bg-indigo-400'}`} />
                                                <span>{p.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    <div className="relative" ref={exportMenuRef}>
                        <Button 
                            variant="outline" 
                            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        >
                            <Download className="mr-2 h-4 w-4" /> Exportar
                        </Button>
                        <AnimatePresence>
                            {isExportMenuOpen && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 mt-2 w-48 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl z-50 ring-1 ring-white/5"
                                >
                                    <button 
                                        onClick={exportToPDF}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white"
                                    >
                                        <FileText className="h-4 w-4 text-rose-400" /> 
                                        Exportar PDF
                                    </button>
                                    <button 
                                        onClick={exportToCSV}
                                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-900 hover:text-white"
                                    >
                                        <FileSpreadsheet className="h-4 w-4 text-emerald-400" /> 
                                        Exportar Excel
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Total del Periodo</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-full bg-zinc-800" /> : (
                            <>
                                <div className="text-2xl font-bold text-white">
                                    ${metrics.facturado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-emerald-500 mt-1">
                                    <ArrowUpRight className="h-3 w-3" /> Este mes
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Recaudado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-full bg-zinc-800" /> : (
                            <>
                                <div className="text-2xl font-bold text-emerald-400">
                                    ${metrics.recaudado.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Pagada ({metrics.facturado > 0 ? ((metrics.recaudado / metrics.facturado) * 100).toFixed(1) : '0'}%)
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Pendiente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-full bg-zinc-800" /> : (
                            <>
                                <div className="text-2xl font-bold text-amber-400">
                                    ${metrics.porCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-zinc-500 mt-1">En tiempo para pago</p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Morosidad</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-full bg-zinc-800" /> : (
                            <>
                                <div className="text-2xl font-bold text-rose-400">
                                    ${metrics.vencido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-rose-500 mt-1">
                                    <ArrowDownRight className="h-3 w-3" /> {metrics.morosos} {metrics.morosos === 1 ? 'residente en atraso' : 'residentes en atraso'}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle>Movimientos recientes</CardTitle>
                    <CardDescription>Últimos movimientos registrados en el condominio.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-900/80 text-zinc-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Folio</th>
                                    <th className="px-4 py-3 font-medium">Unidad</th>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium">Concepto</th>
                                    <th className="px-4 py-3 font-medium">Monto</th>
                                    <th className="px-4 py-3 font-medium">Atraso</th>
                                    <th className="px-4 py-3 font-medium">Estado</th>
                                    <th className="px-4 py-3 font-medium">Recordatorio</th>
                                    <th className="px-4 py-3 font-medium text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                                            Cargando facturas recientes...
                                        </td>
                                    </tr>
                                ) : recentInvoices.length > 0 ? (
                                    recentInvoices.map((inv, index) => (
                                        <tr key={inv.folio || index} className="hover:bg-zinc-900/50 transition-colors">
                                            <td className="px-4 py-3 text-white font-medium uppercase">
                                                {inv.folio?.length > 15 ? inv.folio.substring(0, 8) : inv.folio}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-300 font-medium">{inv.unidad}</td>
                                            <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">
                                                {new Date(inv.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400">{inv.concepto}</td>
                                            <td className="px-4 py-3 text-white font-bold">
                                                ${Number(inv.monto).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {inv.estado === 'paid' ? (
                                                    <span className="text-zinc-500">-</span>
                                                ) : inv.atraso > 0 ? (
                                                    <span className={
                                                        inv.atraso > 15 ? 'text-rose-500 font-bold' : 
                                                        inv.atraso >= 5 ? 'text-orange-500' : 
                                                        'text-yellow-400'
                                                    }>
                                                        {inv.atraso} {inv.atraso === 1 ? 'día' : 'días'}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <Badge variant={inv.estado === 'overdue' ? 'destructive' : inv.estado === 'paid' ? 'success' : 'warning'} className="whitespace-nowrap">
                                                    {inv.estado === 'overdue' ? 'Vencida' : inv.estado === 'paid' ? 'Pagada' : 'Pendiente'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-3 font-medium">
                                                {inv.estado !== 'paid' ? (
                                                    inv.reminder_sent ? (
                                                        <span className="text-emerald-400 text-xs whitespace-nowrap">🟢 Enviado</span>
                                                    ) : (
                                                        <span className="text-rose-400 text-xs whitespace-nowrap">🔴 Pendiente</span>
                                                    )
                                                ) : (
                                                    <span className="text-zinc-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center items-center gap-3">
                                                    {inv.estado !== 'paid' && (
                                                        <Button 
                                                            variant="ghost"
                                                            size="icon"
                                                            title={inv.reminder_sent ? "Reenviar WhatsApp n8n" : "Enviar WhatsApp n8n"}
                                                            className="h-10 w-10 rounded-full bg-zinc-900/50 hover:bg-[#25D366]/20 transition-all duration-300 transform hover:scale-110 active:scale-95 group"
                                                            disabled={sendingReminderId === inv.id}
                                                            onClick={async () => {
                                                                setSendingReminderId(inv.id)
                                                                try {
                                                                    const webhookUrl = 'https://n8n.srv1286224.hstgr.cloud/webhook/send-morosidad-whatsapp'
                                                                    console.log('Enviando recordatorio a:', webhookUrl)

                                                                    const payload = {
                                                                        "tipo": "recordatorio",
                                                                        "resident_name": inv.resident_name || 'Residente',
                                                                        "phone": inv.telefono || '',
                                                                        "amount": inv.monto - inv.paid_amount, // Saldo real pendiente
                                                                        "due_date": inv.due_date,
                                                                        "payment_link": `${window.location.origin}/residente/payments/${inv.id}`,
                                                                        "condominium": "", // Not easily available here
                                                                        "unit": inv.unidad || 'S/N'
                                                                    }

                                                                    const res = await fetch(webhookUrl, {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify(payload)
                                                                    })
                                                                    
                                                                    if (res.ok) {
                                                                        setRecentInvoices(prev => prev.map(p => p.id === inv.id ? {...p, reminder_sent: true} : p))
                                                                        showToast('Recordatorio de Whatsapp enviado')
                                                                    } else {
                                                                        showToast('Error al enviar recordatorio', 'error')
                                                                    }
                                                                } catch (error) {
                                                                    console.error(error)
                                                                    showToast('Error de conexión', 'error')
                                                                } finally {
                                                                    setSendingReminderId(null)
                                                                }
                                                            }}
                                                        >
                                                            {sendingReminderId === inv.id ? (
                                                                <Loader2 className="h-5 w-5 animate-spin text-[#25D366]" />
                                                            ) : (
                                                                <WhatsAppIcon className={`h-5 w-5 transition-colors ${inv.reminder_sent ? 'text-[#25D366]' : 'text-zinc-400 group-hover:text-[#25D366]'}`} />
                                                            )}
                                                        </Button>
                                                    )}
                                                    
                                                    {inv.estado !== 'paid' && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            title="Marcar como pagada"
                                                            className="h-10 w-10 rounded-full bg-zinc-900/50 hover:bg-emerald-500/20 transition-all duration-300 transform hover:scale-110 active:scale-95 group"
                                                            onClick={async () => {
                                                                if (condoId.startsWith('demo-')) {
                                                                    setRecentInvoices(prev => prev.map(p => p.id === inv.id ? {...p, estado: 'paid'} : p))
                                                                    return
                                                                }
                                                                const { error } = await supabase
                                                                    .from('resident_invoices')
                                                                    .update({ status: 'paid', balance_due: 0 })
                                                                    .eq('id', inv.id)
                                                                if (!error) {
                                                                    setRecentInvoices(prev => prev.map(p => p.id === inv.id ? {...p, estado: 'paid'} : p))
                                                                    fetchBillingData() // Actualiza KPIs arrriba
                                                                }
                                                            }}
                                                        >
                                                            <CheckCircle2 className="h-5 w-5 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                                                        </Button>
                                                    )}

                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        title="Ver detalles"
                                                        className="h-10 w-10 rounded-full bg-zinc-900/50 hover:bg-blue-500/20 transition-all duration-300 transform hover:scale-110 active:scale-95 group"
                                                        onClick={() => setSelectedInvoice(inv)}
                                                    >
                                                        <Eye className="h-5 w-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                                            Aún no hay facturas registradas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Modal de Detalles */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute right-4 top-4 text-zinc-400 hover:text-white"
                            onClick={() => setSelectedInvoice(null)}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cerrar</span>
                        </Button>
                        <h3 className="text-xl font-semibold text-white mb-6">Detalle de Movimiento</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-zinc-500">Folio / ID</p>
                                <p className="text-sm font-medium text-white break-all">{selectedInvoice.folio}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500">Unidad</p>
                                <p className="text-sm font-medium text-white">{selectedInvoice.unidad}</p>
                            </div>
                            <div>
                                <p className="text-xs text-zinc-500">Concepto</p>
                                <p className="text-sm font-medium text-white">{selectedInvoice.concepto}</p>
                            </div>
                            <div className="pt-2">
                                <p className="text-xs text-zinc-500">Monto</p>
                                <p className="text-3xl font-bold text-white">
                                    ${Number(selectedInvoice.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                            <div className="pt-2">
                                <p className="text-xs text-zinc-500 mb-2">Estado Actual</p>
                                <div className="flex items-center gap-3">
                                    <Badge variant={selectedInvoice.estado === 'overdue' ? 'destructive' : selectedInvoice.estado === 'paid' ? 'success' : 'warning'} className="text-xs">
                                        {selectedInvoice.estado === 'overdue' ? 'Vencida' : selectedInvoice.estado === 'paid' ? 'Pagada' : 'Pendiente'}
                                    </Badge>
                                    
                                    {selectedInvoice.estado !== 'paid' && selectedInvoice.atraso > 0 && (
                                        <span className={`text-sm font-medium ${
                                            selectedInvoice.atraso > 15 ? 'text-rose-500' : 
                                            selectedInvoice.atraso >= 5 ? 'text-orange-500' : 
                                            'text-yellow-400'
                                        }`}>
                                            ({selectedInvoice.atraso} {selectedInvoice.atraso === 1 ? 'día' : 'días'} de atraso)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="mt-8">
                            <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white" onClick={() => setSelectedInvoice(null)}>
                                Cerrar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Premium Toast Notification */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                        className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-md ${
                            toastMessage.type === 'success' 
                                ? 'bg-[#25D366]/10 border-[#25D366]/20 text-[#25D366]' 
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}
                    >
                        {toastMessage.type === 'success' ? <CheckCircle2 className="h-6 w-6" /> : <X className="h-6 w-6" />}
                        <span className="font-semibold text-sm">{toastMessage.title}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
