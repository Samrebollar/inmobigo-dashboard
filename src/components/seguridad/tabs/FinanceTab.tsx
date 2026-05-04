'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Download, Filter, FileText, ArrowUpRight, ArrowDownRight, CheckCircle2, Eye, X, Loader2, FileSpreadsheet } from 'lucide-react'
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

    // Menú de Exportación
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
    const exportMenuRef = useRef<HTMLDivElement>(null)

    // Cierra el menú al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false)
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
        link.setAttribute('download', `Facturas_InmobiGo_${new Date().toISOString().split('T')[0]}.csv`)
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
        doc.text('Reporte de Facturación y Cobranza', 14, 22)
        
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, 14, 30)
        
        // Métricas resumidas
        doc.setFontSize(11)
        doc.setTextColor(60, 60, 60)
        doc.text(`Total Recaudado: $${metrics.recaudado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, 40)
        doc.text(`Por Cobrar: $${metrics.porCobrar.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, 46)
        doc.text(`Vencido: $${metrics.vencido.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 14, 52)

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

        doc.save(`Facturas_InmobiGo_${new Date().toISOString().split('T')[0]}.pdf`)
        showToast('Reporte PDF descargado')
    }

    const showToast = (title: string, type: 'success' | 'error' = 'success') => {
        setToastMessage({ title, type })
        setTimeout(() => setToastMessage(null), 3500)
    }

    const fetchBillingData = async () => {
        try {
            if (condoId.startsWith('demo-')) {
                setMetrics({ facturado: 124500, recaudado: 98200, porCobrar: 26300, vencido: 4500, morosos: 3 })
                return
            }

            const { data, error } = await supabase.rpc('get_billing_summary', { p_condominium_id: condoId })
            
            if (error) {
                console.error('Error cargando métricas de facturación:', error)
            } else if (data && data.length > 0) {
                const summary = data[0]
                setMetrics({
                    facturado: Number(summary.total_facturado) || 0,
                    recaudado: Number(summary.total_recaudado) || 0,
                    porCobrar: Number(summary.total_por_cobrar) || 0,
                    vencido: Number(summary.total_vencido) || 0,
                    morosos: Number(summary.residentes_en_mora) || 0
                })
            }
        } catch (err) {
            console.error('Fetch billing error:', err)
        }
    }

    const fetchInvoices = async () => {
        try {
            if (condoId.startsWith('demo-')) {
                setRecentInvoices([
                    { id: '1', folio: 'INV-2024001', unidad: 'A-101', concepto: 'Mantenimiento Marzo 2024', monto: 2500, estado: 'pending', telefono: '5551234567', atraso: 2, reminder_sent: false, due_date: '2024-03-01' },
                    { id: '2', folio: 'INV-2024002', unidad: 'A-102', concepto: 'Mantenimiento Marzo 2024', monto: 2500, estado: 'paid', telefono: '5551234567', atraso: 0, reminder_sent: false, due_date: '2024-03-01' },
                    { id: '3', folio: 'INV-2024003', unidad: 'B-103', concepto: 'Mantenimiento Marzo 2024', monto: 2800, estado: 'overdue', telefono: '5551234567', atraso: 18, reminder_sent: false, due_date: '2024-03-01' },
                    { id: '4', folio: 'INV-2024004', unidad: 'C-201', concepto: 'Mantenimiento Marzo 2024', monto: 3100, estado: 'paid', telefono: '5551234567', atraso: 0, reminder_sent: false, due_date: '2024-03-01' }
                ])
                setLoading(false)
                return
            }

            const { data: invoicesData, error: invoiceError } = await supabase.from('invoices').select('*').eq('condominium_id', condoId).order('created_at', { ascending: false }).limit(10)

            if (invoiceError) {
                console.error('Error fetching recent invoices details:', JSON.stringify(invoiceError, null, 2))
                return
            }

            const { data: unitsData } = await supabase.from('units').select('*').eq('condominium_id', condoId)
            const { data: residentsData } = await supabase.from('residents').select('*').eq('condominium_id', condoId)

            if (invoicesData) {
                const mappedInvoices = invoicesData.map((inv: any) => {
                    let unitName = 'S/N'
                    let phone = ''
                    
                    if (inv.unit_id && unitsData) {
                        const unit = unitsData.find(u => u.id === inv.unit_id)
                        unitName = unit?.name || unit?.number || unit?.unit_number || 'S/N'
                        const res = residentsData?.find(r => r.unit_number === unitName || r.unit_id === unit?.id)
                        if (res) phone = res.phone || res.whatsapp || ''
                    } else if (inv.resident_id && residentsData) {
                        const res = residentsData.find(r => r.id === inv.resident_id)
                        unitName = res?.unit_number || res?.unit_name || 'S/N'
                        phone = res?.phone || res?.whatsapp || ''
                    }

                    const rawFolio = inv.folio || inv.id || ''
                    const mappedFolio = rawFolio.length > 15 ? rawFolio.substring(0,8).toUpperCase() : rawFolio
                    const mappedConcept = inv.description || inv.concept || 'Sin concepto'

                    const dueDate = inv.due_date ? new Date(inv.due_date) : new Date(inv.created_at)
                    const today = new Date()
                    let delayDays = 0
                    
                    if (inv.status !== 'paid' && today > dueDate) {
                        const diffTime = today.getTime() - dueDate.getTime()
                        delayDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
                    }

                    return {
                        id: inv.id,
                        folio: mappedFolio,
                        unidad: unitName,
                        concepto: mappedConcept,
                        monto: inv.amount,
                        estado: inv.status,
                        telefono: phone,
                        atraso: delayDays,
                        reminder_sent: inv.reminder_sent,
                        due_date: dueDate.toISOString()
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
        fetchBillingData().then(() => fetchInvoices())
    }, [condoId])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-medium text-white">Facturación y Cobranza</h3>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
                        <Filter className="mr-2 h-4 w-4" /> Periodo: Este Mes
                    </Button>
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
                        <CardTitle className="text-sm font-medium text-zinc-400">Total por Cobrar del Periodo</CardTitle>
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
                                    {metrics.facturado > 0 ? ((metrics.recaudado / metrics.facturado) * 100).toFixed(1) : '0'}% del total
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-zinc-400">Por Cobrar</CardTitle>
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
                        <CardTitle className="text-sm font-medium text-zinc-400">Vencido (Morosidad)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Skeleton className="h-8 w-full bg-zinc-800" /> : (
                            <>
                                <div className="text-2xl font-bold text-rose-400">
                                    ${metrics.vencido.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-rose-500 mt-1">
                                    <ArrowDownRight className="h-3 w-3" /> {metrics.morosos} {metrics.morosos === 1 ? 'residente en mora' : 'residentes en mora'}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Invoices Table */}
            <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                    <CardTitle>Facturas Recientes</CardTitle>
                    <CardDescription>Últimos movimientos registrados en el condominio.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-900/80 text-zinc-400">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Folio</th>
                                    <th className="px-4 py-3 font-medium">Unidad</th>
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
                                                                        "first_name": "Residente", // Name not directly in inv object, could be improved
                                                                        "phone": inv.telefono || '',
                                                                        "amount": inv.monto,
                                                                        "due_date": inv.due_date,
                                                                        "payment_link": null, // Not easily available here
                                                                        "condominium": "", // Not easily available here
                                                                        "unit": inv.unidad || 'S/N'
                                                                    }

                                                                    const res = await fetch(webhookUrl, {
                                                                        method: 'POST',
                                                                        headers: { 'Content-Type': 'application/json' },
                                                                        body: JSON.stringify(payload)
                                                                    })
                                                                    
                                                                    if (res.ok) {
                                                                        if (!condoId.startsWith('demo-')) {
                                                                            await supabase.from('invoices').update({ reminder_sent: true }).eq('id', inv.id)
                                                                        }
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
                                                                const { error } = await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString(), paid_amount: inv.monto }).eq('id', inv.id)
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
                        <h3 className="text-xl font-semibold text-white mb-6">Detalle de Factura</h3>
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

