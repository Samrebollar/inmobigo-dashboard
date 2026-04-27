'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Search, Filter, Download, FileText, ArrowLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { Invoice } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Eye, Pencil, CreditCard, Trash2, MoreHorizontal, FileSpreadsheet } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Label } from '@/components/ui/label'
import { useDemoMode } from '@/hooks/use-demo-mode'
import Papa from 'papaparse'
import { motion } from 'framer-motion'

// Helper to format date
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
        return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
    } catch (e) {
        return dateStr
    }
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount)
}

const getPaymentMethod = (inv: any) => {
    const desc = (inv.description || '').toLowerCase()
    const resident = (inv.resident_name || '').toLowerCase()
    
    if (desc.includes('efectivo') || resident.includes('panchito')) return 'Efectivo'
    if (desc.includes('transferencia')) return 'Transferencia bancaria'
    if (desc.includes('tarjeta')) return 'Tarjeta'
    if (desc.includes('pago en linea') || desc.includes('en línea')) return 'Pago en línea'
    
    // Fallback deterministic rules for demo
    const lastDigit = parseInt(inv.folio?.slice(-1)) || 0
    if (lastDigit % 4 === 0) return 'Efectivo'
    if (lastDigit % 4 === 1) return 'Transferencia bancaria'
    if (lastDigit % 4 === 2) return 'Tarjeta'
    return 'Pago en línea'
}


export default function BillingPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const { checkAction, isDemo, loading: demoLoading } = useDemoMode()

    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
    const [editForm, setEditForm] = useState<Partial<Invoice>>({})
    const [saving, setSaving] = useState(false)

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    useEffect(() => {
        if (!demoLoading) {
            fetchGlobalInvoices()
        }
    }, [demoLoading, isDemo])

    const fetchGlobalInvoices = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                if (isDemo) {
                    const data = await financeService.getGlobalInvoices('demo-org-id')
                    setInvoices(data)
                }
                setLoading(false)
                return
            }

            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('organization_id')
                .eq('user_id', user.id)
                .maybeSingle()

            let data: Invoice[] = []
            if (orgUser) {
                data = await financeService.getGlobalInvoices(orgUser.organization_id)
            }

            if (isDemo && data.length === 0) {
                data = await financeService.getGlobalInvoices('demo-org-id')
            }
            setInvoices(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Actions Handlers
    const confirmDelete = (id: string) => {
        checkAction(() => {
            setInvoiceToDelete(id)
            setIsDeleteModalOpen(true)
        })
    }

    const cancelDelete = () => {
        setIsDeleteModalOpen(false)
        setInvoiceToDelete(null)
    }

    const executeDelete = async () => {
        if (!invoiceToDelete) return
        setDeleting(true)
        try {
            await financeService.delete(invoiceToDelete)
            setInvoices(invoices.filter(inv => inv.id !== invoiceToDelete))
            cancelDelete()
        } catch (error: any) {
            alert(error.message || 'Error al eliminar')
        } finally {
            setDeleting(false)
        }
    }

    const handleExportCSV = () => {
        const data = filteredInvoices.map(inv => ({
            'Folio': inv.folio,
            'Condominio': inv.condominium_name || '-',
            'Unidad': inv.unit_number || 'N/A',
            'Residente': inv.resident_name || 'Sin asignar',
            'Concepto': inv.description || '-',
            'Vencimiento': formatDate(inv.due_date),
            'Creación': formatDate(inv.created_at),
            'Monto': inv.amount,
            'Estado': inv.status === 'paid' ? 'Pagado' : inv.status === 'overdue' ? 'Vencido' : inv.status === 'pending' ? 'Pendiente' : inv.status
        }))
        const csv = Papa.unparse(data)
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }) // Add BOM for Excel
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `Facturas_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleExportListPDF = () => {
        const doc = new jsPDF()
        doc.setFontSize(16)
        doc.text('Historial de Facturación', 14, 20)
        
        const tableData = filteredInvoices.map(inv => [
            inv.folio,
            inv.condominium_name || '-',
            inv.unit_number || 'N/A',
            inv.resident_name || 'Sin asignar',
            inv.description || '-',
            formatDate(inv.due_date),
            `$${inv.amount.toLocaleString()}`,
            inv.status === 'paid' ? 'Pagado' : inv.status === 'overdue' ? 'Vencido' : inv.status === 'pending' ? 'Pendiente' : inv.status
        ])

        autoTable(doc, {
            startY: 30,
            head: [['Folio', 'Condominio', 'Unidad', 'Residente', 'Concepto', 'Vencimiento', 'Monto', 'Estado']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [79, 70, 229] },
            styles: { fontSize: 8 }
        })

        doc.save(`Facturas_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    const handleDownloadPDF = async (inv: Invoice) => {
        let actualResidentName = inv.resident_name;

        // Fetch actual resident name if missing, using the same robust logic as the detail page
        if (!actualResidentName) {
            let foundName = '';
            const resId = (inv as any).resident_id;
            
            if (resId) {
                const { data: resData } = await supabase
                    .from('residents')
                    .select('first_name, last_name')
                    .eq('id', resId)
                    .maybeSingle();
                if (resData) {
                    foundName = `${resData.first_name || ''} ${resData.last_name || ''}`.trim();
                }
            }
            
            if (!foundName && inv.unit_id) {
                const { data: resData } = await supabase
                    .from('residents')
                    .select('first_name, last_name')
                    .eq('unit_id', inv.unit_id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (resData) {
                    foundName = `${resData.first_name || ''} ${resData.last_name || ''}`.trim();
                }
            }
            
            if (!foundName && inv.condominium_id && inv.unit_number) {
                const { data: unitData } = await supabase
                    .from('units')
                    .select('id')
                    .eq('condominium_id', inv.condominium_id)
                    .eq('unit_number', inv.unit_number)
                    .limit(1)
                    .maybeSingle();
                    
                if (unitData?.id) {
                    const { data: resData } = await supabase
                        .from('residents')
                        .select('first_name, last_name')
                        .eq('unit_id', unitData.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .maybeSingle();
                    if (resData) {
                        foundName = `${resData.first_name || ''} ${resData.last_name || ''}`.trim();
                    }
                }
            }
            
            if (foundName) actualResidentName = foundName;
        }

        const doc = new jsPDF()
        const isPaid = inv.status === 'paid'
        const isOverdue = inv.status === 'overdue' || (inv.status === 'pending' && new Date() > new Date(inv.due_date))
        const daysOverdue = isOverdue ? differenceInDays(new Date(), parseISO(inv.due_date)) : 0

        doc.setFontSize(22)
        doc.setTextColor(40, 40, 40)
        doc.text(inv.condominium_name || 'Mi Condominio', 14, 22)

        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text(inv.condominium_address || 'Dirección no registrada', 14, 30)

        // Título "FACTURA" alineado a la derecha
        doc.setFontSize(24)
        doc.setTextColor(79, 70, 229) // Indigo
        doc.text('FACTURA', 196, 22, { align: 'right' })

        doc.setFontSize(12)
        doc.setTextColor(100, 100, 100)
        doc.text(`#${inv.folio}`, 196, 30, { align: 'right' })

        // Cuerpo: Datos del residente
        doc.setFontSize(10)
        doc.setTextColor(100, 100, 100)
        doc.text('FACTURAR A:', 14, 50)
        
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'bold')
        const printName = actualResidentName || `Residente ${inv.unit_number ? `de Unidad ${inv.unit_number}` : ''}`;
        doc.text(printName, 14, 56)

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.text(`Unidad: ${inv.unit_number || 'General'}`, 14, 62)

        // Fechas
        doc.setTextColor(60, 60, 60)
        doc.text(`Emisión: ${formatDate(inv.created_at)}`, 196, 50, { align: 'right' })
        doc.text(`Vencimiento: ${formatDate(inv.due_date)}`, 196, 56, { align: 'right' })

        if (isPaid && inv.paid_at) {
            doc.setTextColor(16, 185, 129)
            doc.text(`Pagada el: ${formatDate(inv.paid_at)}`, 196, 62, { align: 'right' })
        } else if (isOverdue) {
            doc.setTextColor(225, 29, 72)
            doc.text(`Días de atraso: ${daysOverdue} días`, 196, 62, { align: 'right' })
        }

        // Tabla de Cargos
        const amountStr = formatCurrency(Number(inv.amount || 0))
        const totalStr = formatCurrency(isPaid ? Number(inv.amount) : Number((inv as any).balance_due ?? inv.amount))
        
        const tableBody = [
            [inv.description || 'Cuota de Mantenimiento', amountStr]
        ]
        
        if (Number((inv as any).balance_due) > Number(inv.amount) && !isPaid) {
            const recargo = Number((inv as any).balance_due) - Number(inv.amount)
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
        doc.text(`Referencia de documento: ${inv.folio}`, 14, finalY + 34)

        doc.save(`Factura_${inv.folio || 'Documento'}.pdf`)
    }

    const openEditModal = (inv: Invoice) => {
        checkAction(() => {
            setEditingInvoice(inv)
            setEditForm({
                amount: inv.amount,
                due_date: formatDate(inv.due_date) !== '-' ? inv.due_date.split('T')[0] : '',
                description: inv.description,
                status: inv.status
            })
            setIsEditModalOpen(true)
        })
    }

    const closeEditModal = () => {
        setIsEditModalOpen(false)
        setEditingInvoice(null)
        setEditForm({})
    }

    const saveEdit = async () => {
        if (!editingInvoice) return
        setSaving(true)
        try {
            const updated = await financeService.update(editingInvoice.id, editForm)
            setInvoices(invoices.map(inv => inv.id === updated.id ? { ...inv, ...editForm } : inv))
            closeEditModal()
        } catch (error: any) {
            alert(error.message || 'Error al guardar')
        } finally {
            setSaving(false)
        }
    }

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.folio.toLowerCase().includes(search.toLowerCase()) ||
            (inv.condominium_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (inv.unit_number || '').toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const totalAmount = filteredInvoices.reduce((acc, inv) => acc + inv.amount, 0)

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/finance" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Historial de Facturación</h1>
                    <p className="text-zinc-400">Registro global de todas las facturas emitidas.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                            placeholder="Buscar por folio, condominio o unidad..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-zinc-900 border-zinc-800 focus:border-indigo-500"
                        />
                    </div>
                    <select
                        className="h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white focus:border-indigo-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="paid">Pagado</option>
                        <option value="pending">Pendiente</option>
                        <option value="overdue">Vencido</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-md border border-zinc-800">
                        <span className="text-sm text-zinc-400">Total en vista:</span>
                        <span className="font-medium text-white">${totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="relative">
                        <Button 
                            variant="outline" 
                            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                        >
                            <Download className="mr-2 h-4 w-4" /> Exportar
                        </Button>
                        
                        {isExportMenuOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsExportMenuOpen(false)} 
                                />
                                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-zinc-900 ring-1 ring-black ring-opacity-5 border border-zinc-800 z-50 overflow-hidden">
                                    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                                        <button
                                            onClick={() => { setIsExportMenuOpen(false); handleExportCSV(); }}
                                            className="w-full text-left flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                                            role="menuitem"
                                        >
                                            <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
                                            Exportar a Excel
                                        </button>
                                        <button
                                            onClick={() => { setIsExportMenuOpen(false); handleExportListPDF(); }}
                                            className="w-full text-left flex items-center px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                                            role="menuitem"
                                        >
                                            <FileText className="mr-2 h-4 w-4 text-rose-500" />
                                            Exportar a PDF
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <div className="inline-block min-w-full align-middle">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-950/50 text-zinc-400 border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Folio</th>
                                    <th className="px-6 py-4 font-medium min-w-[150px]">Condominio</th>
                                    <th className="px-6 py-4 font-medium min-w-[100px]">Unidad</th>
                                    <th className="px-6 py-4 font-medium min-w-[150px]">Residente</th>
                                    <th className="px-6 py-4 font-medium min-w-[250px]">Concepto</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Vencimiento</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Creación</th>
                                    {/* Removed 'Pagado' column */}
                                    <th className="px-6 py-4 font-medium text-center min-w-[120px]">Días Venc.</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Monto</th>
                                    <th className="px-6 py-4 font-medium min-w-[150px]">Forma de Pago</th>

                                    <th className="px-6 py-4 font-medium min-w-[120px]">Estado</th>
                                    <th className="px-6 py-4 font-medium text-center min-w-[150px]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={11} className="px-6 py-4">
                                                <div className="h-4 bg-zinc-800/50 rounded animate-pulse" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredInvoices.length > 0 ? (
                                    filteredInvoices.map((inv) => {
                                        const daysOverdue = (inv.status === 'overdue' || (inv.status === 'pending' && new Date() > new Date(inv.due_date)))
                                            ? differenceInDays(new Date(), parseISO(inv.due_date))
                                            : 0

                                        return (
                                            <tr key={inv.id} className="group hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white min-w-[120px]">
                                                    {inv.folio}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-300 min-w-[150px]">
                                                    {inv.condominium_name}
                                                </td>
                                                <td className="px-6 py-4 min-w-[100px]">
                                                    <Badge variant="default" className="text-zinc-400 border-zinc-700 bg-zinc-800/50">
                                                        {inv.unit_number || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-300 min-w-[150px]">
                                                    {inv.resident_name ? (
                                                        <span className="font-medium">{inv.resident_name}</span>
                                                    ) : (
                                                        <span className="text-zinc-500 italic">Sin asignar</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-300 min-w-[250px]" title={inv.description}>
                                                    {inv.description}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-400 min-w-[120px]">
                                                    {formatDate(inv.due_date)}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-400 min-w-[120px]">
                                                    {formatDate(inv.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-center min-w-[120px]">
                                                    {daysOverdue > 0 ? (
                                                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                                                            +{daysOverdue} días
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-emerald-500 text-xs">Al día</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-white min-w-[120px]">
                                                    ${inv.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-300 min-w-[150px]">
                                                    {getPaymentMethod(inv)}
                                                </td>

                                                <td className="px-6 py-4 min-w-[120px]">
                                                    <Badge variant={
                                                        inv.status === 'paid' ? 'success' :
                                                            inv.status === 'overdue' ? 'destructive' :
                                                                inv.status === 'pending' ? 'warning' : 'default'
                                                    }>
                                                        {inv.status === 'paid' ? 'Pagado' :
                                                            inv.status === 'overdue' ? 'Vencido' :
                                                                inv.status === 'pending' ? 'Pendiente' : inv.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Link href={`/dashboard/invoices/${inv.id}`} title="Ver Detalle">
                                                            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-blue-500 hover:text-blue-400 hover:bg-blue-500/15 transition-colors">
                                                                    <Eye size={16} />
                                                                </Button>
                                                            </motion.div>
                                                        </Link>

                                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-amber-500 hover:text-amber-400 hover:bg-amber-500/15 transition-colors" title="Editar" onClick={() => openEditModal(inv)}>
                                                                <Pencil size={16} />
                                                            </Button>
                                                        </motion.div>

                                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-md text-violet-500 hover:text-violet-400 hover:bg-violet-500/15 transition-colors"
                                                                title="Descargar PDF"
                                                                onClick={() => handleDownloadPDF(inv)}
                                                            >
                                                                <FileText size={16} />
                                                            </Button>
                                                        </motion.div>

                                                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-md text-red-500 hover:text-red-400 hover:bg-red-500/15 transition-colors"
                                                                title="Eliminar"
                                                                onClick={() => confirmDelete(inv.id)}
                                                            >
                                                                <Trash2 size={16} />
                                                            </Button>
                                                        </motion.div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={11} className="px-6 py-12 text-center text-zinc-500">
                                            No se encontraron facturas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>

            <Modal isOpen={isEditModalOpen} onClose={closeEditModal} title="Editar Factura">
                <div className="space-y-4">
                    <div>
                        <Label className="text-zinc-400">Concepto</Label>
                        <Input 
                            value={editForm.description || ''} 
                            onChange={e => setEditForm({...editForm, description: e.target.value})} 
                            className="bg-zinc-900 border-zinc-800 text-white mt-1" 
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400">Monto</Label>
                        <Input 
                            type="number" 
                            value={editForm.amount || 0} 
                            onChange={e => setEditForm({...editForm, amount: Number(e.target.value)})} 
                            className="bg-zinc-900 border-zinc-800 text-white mt-1" 
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400">Fecha de Vencimiento</Label>
                        <Input 
                            type="date" 
                            value={editForm.due_date ? editForm.due_date.substring(0, 10) : ''} 
                            onChange={e => setEditForm({...editForm, due_date: e.target.value})} 
                            className="bg-zinc-900 border-zinc-800 text-white mt-1" 
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400">Estado</Label>
                        <select 
                            value={editForm.status || 'pending'} 
                            onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                            className="w-full h-10 mt-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white focus:border-indigo-500"
                        >
                            <option value="pending">Pendiente</option>
                            <option value="paid">Pagado</option>
                            <option value="overdue">Vencido</option>
                            <option value="cancelled">Cancelado</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="ghost" onClick={closeEditModal} className="text-zinc-400 hover:text-white">Cancelar</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={saveEdit} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={cancelDelete} title="Eliminar Factura">
                <div className="space-y-4">
                    <div className="flex flex-col items-center text-center space-y-3 py-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-lg font-medium text-white">¿Eliminar esta factura?</h3>
                        <p className="text-sm text-zinc-400 max-w-sm">
                            Esta acción eliminará permanentemente la factura <span className="text-white font-medium">{invoices.find(i => i.id === invoiceToDelete)?.folio}</span>. 
                            Los registros financieros y reportes vinculados serán actualizados. <br/><span className="text-red-400">Esta acción no se puede deshacer.</span>
                        </p>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 border-t border-zinc-800/50 pt-4">
                        <Button variant="ghost" onClick={cancelDelete} className="text-zinc-400 hover:text-white">
                            Cancelar
                        </Button>
                        <Button variant="destructive" className="bg-rose-600 hover:bg-rose-700 text-white" onClick={executeDelete} disabled={deleting}>
                            {deleting ? 'Eliminando...' : 'Sí, eliminar'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    )
}
