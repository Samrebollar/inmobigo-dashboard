'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Send, CheckCircle, Clock, AlertTriangle, CreditCard, Building2, ExternalLink, CalendarDays, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Invoice } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { createClient } from '@/utils/supabase/client'

const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
        return format(parseISO(dateStr), 'dd MMM yyyy', { locale: es })
    } catch {
        return dateStr
    }
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount)
}

export default function InvoiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [residentName, setResidentName] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const supabase = createClient()

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!id) return
            try {
                const data = await financeService.getInvoiceById(id)
                setInvoice(data)
                
                // Fetch actual resident name
                let foundName = ''
                
                if (data?.resident_id) {
                    const { data: resData } = await supabase
                        .from('residents')
                        .select('first_name, last_name')
                        .eq('id', data.resident_id)
                        .maybeSingle()
                    if (resData) {
                        foundName = `${resData.first_name || ''} ${resData.last_name || ''}`.trim()
                    }
                }

                if (!foundName && data?.unit_id) {
                    // Si tenemos unit_id directo
                    const { data: resData } = await supabase
                        .from('residents')
                        .select('first_name, last_name')
                        .eq('unit_id', data.unit_id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                    if (resData) {
                        foundName = `${resData.first_name || ''} ${resData.last_name || ''}`.trim()
                    }
                }
                
                if (!foundName && data?.condominium_id && data?.unit_number) {
                    // Fallback para buscar id de unidad por num y luego residente
                    const { data: unitData } = await supabase
                        .from('units')
                        .select('id')
                        .eq('condominium_id', data.condominium_id)
                        .eq('unit_number', data.unit_number)
                        .limit(1)
                        .maybeSingle()
                        
                    if (unitData?.id) {
                        const { data: resData } = await supabase
                            .from('residents')
                            .select('first_name, last_name')
                            .eq('unit_id', unitData.id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle()
                        if (resData) {
                            foundName = `${resData.first_name || ''} ${resData.last_name || ''}`.trim()
                        }
                    }
                }
                
                if (foundName) setResidentName(foundName)
            } catch (error) {
                console.error('Error loading invoice:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchInvoice()
    }, [id])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
                    <p className="text-zinc-500 text-sm font-medium animate-pulse">Cargando detalles de la factura...</p>
                </div>
            </div>
        )
    }

    if (!invoice) {
        return (
            <div className="mx-auto max-w-3xl p-8 text-center mt-20">
                <div className="bg-zinc-900/50 p-12 rounded-2xl border border-zinc-800 flex flex-col items-center">
                    <AlertTriangle className="h-16 w-16 text-zinc-600 mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Factura no encontrada</h2>
                    <p className="text-zinc-400 mb-8">El documento que buscas no existe o no tienes permisos para verlo.</p>
                    <Link href="/dashboard/finance/billing">
                        <Button className="bg-indigo-600 hover:bg-indigo-700">Volver al historial</Button>
                    </Link>
                </div>
            </div>
        )
    }

    // Calculations
    const today = new Date()
    const dueDate = invoice.due_date ? parseISO(invoice.due_date) : null
    let daysOverdue = 0
    if (dueDate && invoice.status !== 'paid' && today > dueDate) {
        daysOverdue = differenceInDays(today, dueDate)
    }

    const isPaid = invoice.status === 'paid'
    const isOverdue = invoice.status === 'overdue' || daysOverdue > 0
    const isPending = invoice.status === 'pending' && !isOverdue

    // Theme values
    const statusConfig = {
        paid: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle, label: 'Pagada', shadow: 'shadow-emerald-900/20' },
        overdue: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: AlertTriangle, label: 'Vencida', shadow: 'shadow-rose-900/20' },
        pending: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock, label: 'Pendiente', shadow: 'shadow-amber-900/20' }
    }
    
    const currentStatus = isPaid ? statusConfig.paid : isOverdue ? statusConfig.overdue : statusConfig.pending
    const StatusIcon = currentStatus.icon

    const handleDownloadPDF = () => {
        if (!invoice) return
        const doc = new jsPDF()

        // Configuración de encabezado
        doc.setFontSize(22)
        doc.setTextColor(40, 40, 40)
        doc.text(invoice.condominium_name || 'Mi Condominio', 14, 22)

        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(invoice.condominium_address || 'Dirección no registrada', 14, 30)

        // Título "FACTURA" alineado a la derecha
        doc.setFontSize(24)
        doc.setTextColor(79, 70, 229) // Indigo
        doc.text('FACTURA', 196, 22, { align: 'right' })

        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text(`#${invoice.folio}`, 196, 30, { align: 'right' })

        // Cuerpo: Datos del residente
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text('FACTURAR A:', 14, 50)
        
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'bold')
        doc.text(residentName || `Residente ${invoice.unit_number ? `de Unidad ${invoice.unit_number}` : ''}`, 14, 56)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(`Unidad: ${invoice.unit_number || 'General'}`, 14, 62)

        // Fechas
        doc.setTextColor(60, 60, 60)
        doc.text(`Emisión: ${formatDate(invoice.created_at)}`, 196, 50, { align: 'right' })
        doc.text(`Vencimiento: ${formatDate(invoice.due_date)}`, 196, 56, { align: 'right' })

        if (isPaid && invoice.paid_at) {
            doc.setTextColor(16, 185, 129)
            doc.text(`Pagada el: ${formatDate(invoice.paid_at)}`, 196, 62, { align: 'right' })
        } else if (isOverdue) {
            doc.setTextColor(225, 29, 72)
            doc.text(`Días de atraso: ${daysOverdue} días`, 196, 62, { align: 'right' })
        }

        // Tabla de Cargos
        const amountStr = formatCurrency(Number(invoice.amount || 0))
        const totalStr = formatCurrency(isPaid ? Number(invoice.amount) : Number(invoice.balance_due ?? invoice.amount))
        
        const tableBody = [
            [invoice.description || 'Cuota de Mantenimiento', amountStr]
        ]
        
        if (Number(invoice.balance_due) > Number(invoice.amount) && !isPaid) {
            const recargo = Number(invoice.balance_due) - Number(invoice.amount)
            tableBody.push(['Recargos por mora', formatCurrency(recargo)])
        }

        autoTable(doc, {
            startY: 75,
            head: [['Concepto', 'Importe']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            foot: [['Total a pagar', totalStr]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
        })

        // Pie de página: Mensaje de agradecimiento
        const finalY = (doc as any).lastAutoTable.finalY || 100
        
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(40, 40, 40)
        doc.text('¡Gracias por su pago!', 14, finalY + 15)
        
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text('Agradecemos su valiosa contribución para el mantenimiento de nuestro condominio.', 14, finalY + 22)
        doc.text('Para cualquier duda o aclaración sobre este documento, por favor contacte a la administración.', 14, finalY + 28)
        doc.text(`Referencia de documento: ${invoice.folio}`, 14, finalY + 34)

        doc.save(`Factura_${invoice.folio || 'Documento'}.pdf`)
    }

    return (
        <>
            <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="mx-auto max-w-4xl space-y-6 md:space-y-8 p-4 md:p-8 pb-24 print:p-0 print:max-w-none print:m-0"
        >
            {/* Core Print Overrides for Professional Paper Output */}
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body { background: white !important; color: black !important; }
                    #invoice-download-area { background: white !important; padding: 0 !important; display: block !important; }
                    .text-white { color: black !important; }
                    .text-zinc-400, .text-zinc-500, .text-zinc-300, .text-zinc-200 { color: #3f3f46 !important; }
                    .bg-zinc-900\\/50, .bg-zinc-900\\/80, .bg-zinc-950\\/50, .bg-zinc-800\\/20, .bg-[#09090b] { background: transparent !important; }
                    .border-zinc-800\\/80, .border-zinc-800\\/50, .border-zinc-800\\/60, .border-zinc-800 { border-color: #e4e4e7 !important; }
                    /* Reset cards so they don't look boxed awkwardly */
                    .shadow-xl, .shadow-2xl { box-shadow: none !important; }
                    /* Make grid stack nicely like a document */
                    .lg\\:grid-cols-3 { display: block !important; }
                    .lg\\:col-span-2 { width: 100% !important; margin-bottom: 2rem !important; }
                    /* Highlight boxes get a light gray bg */
                    .bg-emerald-500\\/5 { background: #ecfdf5 !important; border-color: #a7f3d0 !important; }
                    .bg-rose-500\\/5 { background: #fff1f2 !important; border-color: #fecdd3 !important; }
                    .bg-indigo-500\\/5 { background: #eef2ff !important; border-color: #c7d2fe !important; }
                    /* Force background graphics */
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                }
            `}} />

            {/* Top Navigation & Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
                <Link href="/dashboard/finance/billing">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white pl-0 gap-2 hover:bg-transparent">
                        <ArrowLeft size={16} /> Volver a Facturas
                    </Button>
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                    <Button 
                        variant="outline" 
                        onClick={handleDownloadPDF} 
                        className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white gap-2"
                    >
                        <Download size={14} /> 
                        <span className="hidden xs:inline">Descargar PDF</span>
                    </Button>
                </div>
            </div>

            <div id="invoice-download-area" className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 rounded-3xl p-1 bg-[#09090b]">
                {/* Main Content Column (Left - 2cols on LG) */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8">
                    
                    {/* Header Card */}
                    <Card className="bg-zinc-900/50 border-zinc-800/80 overflow-hidden shadow-xl rounded-2xl">
                        <CardContent className="p-6 md:p-8 space-y-8">
                            {/* Company & Status */}
                            <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                                <div className="flex items-center gap-4">
                                    {invoice.condominium_logo_url ? (
                                        <div className="h-14 w-14 rounded-xl overflow-hidden bg-white">
                                            <img src={invoice.condominium_logo_url} alt="Logo" className="h-full w-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="h-14 w-14 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-inner">
                                            <Building2 size={24} />
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-xl font-bold text-white tracking-tight">{invoice.condominium_name || 'Mi Condominio'}</h2>
                                        <p className="text-zinc-500 text-sm mt-0.5">{invoice.condominium_address || 'Dirección no registrada'}</p>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col items-start md:items-end gap-2">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-lg ${currentStatus.bg} ${currentStatus.border} ${currentStatus.color} ${currentStatus.shadow}`}>
                                        <StatusIcon size={14} className="animate-pulse" />
                                        <span className="text-xs font-bold uppercase tracking-wider">{currentStatus.label}</span>
                                    </div>
                                    <span className="text-zinc-400 font-mono text-sm">#{invoice.folio}</span>
                                </div>
                            </div>

                            <hr className="border-t border-zinc-800/80" />

                            {/* General Info */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Facturar A</p>
                                        <p className="text-base font-semibold text-white">
                                            {residentName || `Residente ${invoice.unit_number ? `de Unidad ${invoice.unit_number}` : ''}`}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Unidad</p>
                                        <p className="text-sm font-medium text-zinc-300">{invoice.unit_number || 'General'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4 sm:pl-8 sm:border-l border-zinc-800/50">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-zinc-400 flex items-center gap-2"><CalendarDays size={14}/> Emisión</p>
                                        <p className="text-sm font-medium text-white">{formatDate(invoice.created_at)}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm text-zinc-400 flex items-center gap-2"><CalendarDays size={14}/> Vencimiento</p>
                                        <p className="text-sm font-medium text-white">{formatDate(invoice.due_date)}</p>
                                    </div>
                                    {isOverdue && !isPaid && (
                                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex justify-between items-center pt-2">
                                            <p className="text-xs font-medium text-rose-500/80">Días de atraso</p>
                                            <Badge variant="destructive" className="bg-rose-500/10 text-rose-400 border-rose-500/20">{daysOverdue} días</Badge>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Breakdown Table */}
                    <Card className="bg-zinc-900/50 border-zinc-800/80 overflow-hidden shadow-xl rounded-2xl">
                        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/80">
                            <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                                <FileText size={16} className="text-indigo-400" /> Detalle de Cargos
                            </h3>
                        </div>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-zinc-800/60 bg-zinc-900/30">
                                        <th className="text-left font-medium text-zinc-400 py-3 px-6">Concepto</th>
                                        <th className="text-right font-medium text-zinc-400 py-3 px-6">Importe</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/50">
                                    <tr className="hover:bg-zinc-800/20 transition-colors">
                                        <td className="py-4 px-6">
                                            <p className="font-medium text-zinc-200">{invoice.description || 'Cuota de Mantenimiento'}</p>
                                            <p className="text-xs text-zinc-500 mt-1">Cargo base del periodo</p>
                                        </td>
                                        <td className="py-4 px-6 text-right font-medium text-zinc-200">
                                            {formatCurrency(Number(invoice.amount || 0))}
                                        </td>
                                    </tr>
                                    {/* Additional concepts would map here. Assuming simple 1-line for now */}
                                </tbody>
                            </table>
                            <div className="bg-zinc-950/50 p-6 flex flex-col items-end gap-2 border-t border-zinc-800/60">
                                <div className="flex justify-between w-full sm:w-64 text-zinc-400 text-sm">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(Number(invoice.amount || 0))}</span>
                                </div>
                                {(Number(invoice.balance_due) > Number(invoice.amount) && !isPaid) && (
                                    <div className="flex justify-between w-full sm:w-64 text-rose-400 text-sm">
                                        <span>Recargos (Mora)</span>
                                        <span>{formatCurrency(Number(invoice.balance_due) - Number(invoice.amount))}</span>
                                    </div>
                                )}
                                <div className="flex justify-between w-full sm:w-64 text-white text-base font-bold pt-4 border-t border-zinc-800 mt-2">
                                    <span>Total</span>
                                    <span>{formatCurrency(isPaid ? Number(invoice.amount) : Number(invoice.balance_due ?? invoice.amount))}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* Sidebar Column (Right - 1col on LG) */}
                <div className="space-y-6 md:space-y-8">
                    
                    {/* Main Highlight Card */}
                    <motion.div 
                        whileHover={{ y: -4 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Card className={`overflow-hidden border-2 shadow-2xl rounded-2xl ${isPaid ? 'border-emerald-500/20 bg-emerald-500/5' : isOverdue ? 'border-rose-500/20 bg-rose-500/5' : 'border-indigo-500/20 bg-indigo-500/5'} print:shadow-none print:border-zinc-300 print:bg-zinc-50`}>
                            <CardContent className="p-8 pt-10 pb-10 text-center space-y-4">
                                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total a Pagar</p>
                                <h1 className="text-5xl font-extrabold text-white tracking-tighter">
                                    {formatCurrency(isPaid ? Number(invoice.amount) : Number(invoice.balance_due ?? invoice.amount))}
                                </h1>
                                
                                <AnimatePresence mode="wait">
                                    {isPaid ? (
                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pt-2">
                                            <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-sm font-medium border border-emerald-500/20">
                                                <CheckCircle size={16} /> Factura pagada el {formatDate(invoice.paid_at || invoice.updated_at)}
                                            </div>
                                        </motion.div>
                                    ) : isOverdue ? (
                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pt-2">
                                            <p className="text-sm font-medium text-rose-400">Esta factura tiene {daysOverdue} días de atraso. Se recomienda pagar para evitar recargos adicionales.</p>
                                        </motion.div>
                                    ) : (
                                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="pt-2">
                                            <p className="text-sm font-medium text-amber-400/90">Paga antes del {formatDate(invoice.due_date)} para evitar recargos.</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </CardContent>
                        </Card>
                    </motion.div>

                </div>
            </div>
        </motion.div>
        </>
    )
}
