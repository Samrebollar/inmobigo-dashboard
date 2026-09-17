'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
    Search, 
    Filter, 
    CreditCard, 
    CheckCircle2, 
    Clock, 
    XCircle, 
    DollarSign, 
    Receipt,
    Building2,
    Home,
    User,
    ArrowUpRight,
    Download
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface AdminPaymentsClientProps {
    payments: any[]
}

export function AdminPaymentsClient({ payments }: AdminPaymentsClientProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('todos')
    const [methodFilter, setMethodFilter] = useState<string>('todos')

    // Filter payments
    const filteredPayments = useMemo(() => {
        return payments.filter((item) => {
            const matchesSearch = 
                (item.resident_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.unit_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.concept || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.id || '').toLowerCase().includes(searchQuery.toLowerCase())

            const normalizedStatus = (item.status || '').toLowerCase()
            const matchesStatus = 
                statusFilter === 'todos' ||
                (statusFilter === 'aprobado' && ['approved', 'completed', 'paid', 'aprobado'].includes(normalizedStatus)) ||
                (statusFilter === 'pendiente' && ['pending', 'in_process', 'pendiente'].includes(normalizedStatus)) ||
                (statusFilter === 'rechazado' && ['rejected', 'failed', 'rechazado'].includes(normalizedStatus))

            const method = (item.payment_method || item.provider || '').toLowerCase()
            const matchesMethod =
                methodFilter === 'todos' ||
                (methodFilter === 'mercadopago' && (method.includes('mercado') || method.includes('mp'))) ||
                (methodFilter === 'transferencia' && (method.includes('transfer') || method.includes('bank'))) ||
                (methodFilter === 'manual' && method.includes('manual'))

            return matchesSearch && matchesStatus && matchesMethod
        })
    }, [payments, searchQuery, statusFilter, methodFilter])

    // Metrics calculations
    const metrics = useMemo(() => {
        const approvedList = payments.filter(p => ['approved', 'completed', 'paid', 'aprobado'].includes((p.status || '').toLowerCase()))
        const totalAmount = approvedList.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
        const avgAmount = approvedList.length > 0 ? totalAmount / approvedList.length : 0

        return {
            totalAmount,
            approvedCount: approvedList.length,
            totalCount: payments.length,
            avgAmount
        }
    }, [payments])

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—'
        try {
            const d = new Date(dateStr)
            return d.toLocaleDateString('es-MX', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return dateStr
        }
    }

    const renderStatusBadge = (status: string) => {
        const norm = (status || '').toLowerCase()
        if (['approved', 'completed', 'paid', 'aprobado'].includes(norm)) {
            return (
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold inline-flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 size={12} /> Aprobado
                </span>
            )
        }
        if (['pending', 'in_process', 'pendiente'].includes(norm)) {
            return (
                <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-bold inline-flex items-center gap-1.5 uppercase tracking-wider">
                    <Clock size={12} /> Pendiente
                </span>
            )
        }
        return (
            <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-bold inline-flex items-center gap-1.5 uppercase tracking-wider">
                <XCircle size={12} /> Rechazado
            </span>
        )
    }

    const renderMethodBadge = (methodStr: string, providerStr: string) => {
        const text = methodStr || providerStr || 'Mercado Pago'
        const lower = text.toLowerCase()
        let iconColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
        
        if (lower.includes('transfer') || lower.includes('bank')) {
            iconColor = 'text-purple-400 bg-purple-500/10 border-purple-500/20'
        } else if (lower.includes('cash') || lower.includes('efectivo')) {
            iconColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        }

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${iconColor} inline-flex items-center gap-1.5`}>
                <CreditCard size={12} />
                {text}
            </span>
        )
    }

    const handleDownloadPDF = (payment: any) => {
        try {
            const doc = new jsPDF()
            doc.setFillColor(79, 70, 229)
            doc.rect(0, 0, 210, 35, 'F')
            doc.setFontSize(22)
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.text('COMPROBANTE DE PAGO', 14, 22)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`ID Pago: ${payment.id?.slice(0, 8)}`, 140, 16)
            doc.text(`Fecha: ${formatDate(payment.created_at)}`, 140, 23)

            doc.setFontSize(12)
            doc.setTextColor(40, 40, 40)
            doc.setFont('helvetica', 'bold')
            doc.text('INFORMACIÓN DEL REGISTRO', 14, 50)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Residente: ${payment.resident_name || 'N/A'}`, 14, 60)
            doc.text(`Unidad: ${payment.unit_number || 'N/A'}`, 14, 66)
            doc.text(`Condominio: ${payment.condominium_name || 'N/A'}`, 14, 72)

            doc.setDrawColor(220, 220, 220)
            doc.line(14, 82, 196, 82)

            const tableColumn = ["ID Transacción", "Concepto", "Método", "Monto"]
            const tableRows = [[
                payment.id?.slice(0, 12) || 'N/A',
                payment.concept || 'Cuota de Mantenimiento',
                payment.payment_method || payment.provider || 'Mercado Pago',
                `$${Number(payment.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
            ]]

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 90,
                styles: { fontSize: 10, cellPadding: 5 },
                headStyles: { fillColor: [79, 70, 229] },
            })

            doc.save(`Pago_${payment.resident_name?.replace(/\s+/g, '_') || 'Transaccion'}.pdf`)
        } catch (e) {
            console.error('Error generating PDF:', e)
        }
    }

    return (
        <div className="space-y-8">
            {/* Top Bar / Title */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 border border-indigo-500/20">
                            <Receipt size={28} />
                        </div>
                        Historial General de Pagos
                    </h1>
                    <p className="text-zinc-400 text-sm mt-1">
                        Listado en tiempo real de las transacciones registradas en la tabla <code className="text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded font-mono text-xs">payments</code>.
                    </p>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest">Total Procesado</span>
                        <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><DollarSign size={18} /></div>
                    </div>
                    <div className="text-3xl font-black text-white">${metrics.totalAmount.toLocaleString('es-MX')}</div>
                    <p className="text-[11px] text-zinc-500 mt-2">Monto total de pagos liquidados</p>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest">Pagos Exitosos</span>
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl"><CheckCircle2 size={18} /></div>
                    </div>
                    <div className="text-3xl font-black text-white">{metrics.approvedCount} <span className="text-sm font-normal text-zinc-500">/ {metrics.totalCount}</span></div>
                    <p className="text-[11px] text-zinc-500 mt-2">Transacciones aprobadas con éxito</p>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest">Promedio por Pago</span>
                        <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl"><CreditCard size={18} /></div>
                    </div>
                    <div className="text-3xl font-black text-white">${metrics.avgAmount.toLocaleString('es-MX', { maximumFractionDigits: 0 })}</div>
                    <p className="text-[11px] text-zinc-500 mt-2">Monto promedio transaccionado</p>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden">
                    <div className="flex items-center justify-between text-zinc-400 mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest">Total Transacciones</span>
                        <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl"><Receipt size={18} /></div>
                    </div>
                    <div className="text-3xl font-black text-white">{metrics.totalCount}</div>
                    <p className="text-[11px] text-zinc-500 mt-2">Registros de pago en la base de datos</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-zinc-900/40 p-4 border border-zinc-800/80 rounded-2xl">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Buscar por residente, unidad, concepto o ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl pl-11 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all placeholder:text-zinc-600"
                    />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Status filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                        <option value="todos">Todos los Estados</option>
                        <option value="aprobado">Aprobados / Pagados</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="rechazado">Rechazados</option>
                    </select>

                    {/* Method filter */}
                    <select
                        value={methodFilter}
                        onChange={(e) => setMethodFilter(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                    >
                        <option value="todos">Todos los Métodos</option>
                        <option value="mercadopago">Mercado Pago</option>
                        <option value="transferencia">Transferencia Bancaria</option>
                        <option value="manual">Validación Manual</option>
                    </select>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="border-b border-zinc-800 bg-zinc-950/50">
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Residente / Unidad</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Concepto</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Método de Pago</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Fecha & Hora</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-right">Monto</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-wider text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="p-4 bg-zinc-900 rounded-full text-zinc-600 border border-zinc-800">
                                                <Receipt size={32} />
                                            </div>
                                            <p className="text-zinc-400 font-bold text-sm">No se encontraron pagos en la tabla <code className="text-zinc-500 font-mono">payments</code>.</p>
                                            <p className="text-zinc-600 text-xs">Intenta ajustar los filtros de búsqueda o registra una transacción.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white flex items-center gap-2">
                                                    <User size={14} className="text-indigo-400" />
                                                    {payment.resident_name || 'Residente General'}
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {payment.unit_number && (
                                                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-mono font-bold flex items-center gap-1">
                                                            <Home size={10} /> {payment.unit_number}
                                                        </span>
                                                    )}
                                                    {payment.condominium_name && (
                                                        <span className="text-[11px] text-zinc-500 font-medium">
                                                            • {payment.condominium_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-zinc-300 max-w-[200px] truncate">
                                                    {payment.concept || 'Cuota de Mantenimiento'}
                                                </span>
                                                <span className="text-[10px] font-mono text-zinc-600">
                                                    ID Factura: {payment.invoice_id?.slice(0, 10) || '—'}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            {renderMethodBadge(payment.payment_method, payment.provider)}
                                        </td>

                                        <td className="px-6 py-4 text-zinc-400 font-medium text-xs">
                                            {formatDate(payment.created_at)}
                                        </td>

                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-emerald-400 text-base">
                                                ${Number(payment.amount || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </span>
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            {renderStatusBadge(payment.status)}
                                        </td>

                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleDownloadPDF(payment)}
                                                className="p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-700 transition-all"
                                                title="Descargar Comprobante PDF"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
