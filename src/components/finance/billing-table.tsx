'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    Filter,
    MoreHorizontal,
    FileText,
    AlertCircle,
    CheckCircle2,
    Clock,
    Download,
    Plus,
    DollarSign
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { CreateInvoiceModal } from './create-invoice-modal'
import { RegisterPaymentModal } from './register-payment-modal'

interface BillingTableProps {
    condominiumId: string
    organizationId: string
}

// Mock Data
interface Invoice {
    id: string
    resident: string
    unit: string
    amount: number
    issueDate: string
    dueDate: string
    status: 'paid' | 'pending' | 'overdue' | 'cancelled'
}

const initialInvoices: Invoice[] = [
    { id: 'INV-001', resident: 'Roberto Sánchez', unit: 'A-204', amount: 3500.00, issueDate: '2024-05-01', dueDate: '2024-05-10', status: 'overdue' },
    { id: 'INV-002', resident: 'Gabriela Torres', unit: 'B-101', amount: 2800.00, issueDate: '2024-05-01', dueDate: '2024-05-10', status: 'paid' },
    { id: 'INV-003', resident: 'Luis Medina', unit: 'C-305', amount: 3500.00, issueDate: '2024-05-01', dueDate: '2024-05-10', status: 'pending' },
    { id: 'INV-004', resident: 'Ana Pineda', unit: 'A-102', amount: 4200.00, issueDate: '2024-04-01', dueDate: '2024-04-10', status: 'overdue' },
    { id: 'INV-005', resident: 'Carlos Ruiz', unit: 'B-205', amount: 2800.00, issueDate: '2024-05-01', dueDate: '2024-05-10', status: 'paid' },
    { id: 'INV-006', resident: 'Maria López', unit: 'C-101', amount: 3500.00, issueDate: '2024-05-01', dueDate: '2024-05-10', status: 'pending' },
]

export function BillingTable({ condominiumId, organizationId }: BillingTableProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices)

    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [paymentModalData, setPaymentModalData] = useState<{ isOpen: boolean, invoiceId?: string, amount?: number }>({
        isOpen: false
    })

    // Filter Logic
    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch =
            invoice.resident.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            invoice.unit.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid': return <Badge variant="success"><CheckCircle2 size={12} className="mr-1" /> Pagado</Badge>
            case 'pending': return <Badge variant="warning"><Clock size={12} className="mr-1" /> Pendiente</Badge>
            case 'overdue': return <Badge variant="destructive"><AlertCircle size={12} className="mr-1" /> Vencido</Badge>
            default: return <Badge variant="default">Cancelado</Badge>
        }
    }

    const handleCreateInvoice = (data: any) => {
        console.log("Creating invoice:", data)
        // Simulate adding to list
        const newInvoice: Invoice = {
            id: `INV-00${invoices.length + 1}`,
            resident: 'Nuevo Residente',
            unit: 'X-999',
            amount: parseFloat(data.amount),
            issueDate: new Date().toISOString().split('T')[0],
            dueDate: data.dueDate,
            status: 'pending'
        }
        setInvoices([newInvoice, ...invoices])
    }

    const handleRegisterPayment = (data: any) => {
        console.log("Registering payment:", data)
        // Simulate status update
        setInvoices(invoices.map(inv =>
            inv.id === data.invoiceId ? { ...inv, status: 'paid' } : inv
        ))
    }

    return (
        <div className="space-y-4">

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">

                {/* Search */}
                <div className="relative w-full sm:max-w-xs group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, unidad o folio..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none bg-zinc-800 text-white text-sm rounded-lg pl-3 pr-8 py-2 border border-zinc-700 hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="paid">Pagados</option>
                            <option value="pending">Pendientes</option>
                            <option value="overdue">Vencidos</option>
                        </select>
                        <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" size={14} />
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 hover:bg-indigo-600/20 hover:border-indigo-600/30 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                    >
                        <Plus size={16} />
                        Nueva Factura
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-zinc-900/80 text-zinc-400 uppercase tracking-wider text-xs font-semibold">
                            <tr>
                                <th className="px-6 py-4">Folio / Residente</th>
                                <th className="px-6 py-4">Unidad</th>
                                <th className="px-6 py-4">Fecha Emisión</th>
                                <th className="px-6 py-4">Vencimiento</th>
                                <th className="px-6 py-4">Monto</th>
                                <th className="px-6 py-4 text-center">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            <AnimatePresence>
                                {filteredInvoices.map((invoice) => (
                                    <motion.tr
                                        key={invoice.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="group hover:bg-zinc-800/30 transition-colors"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white">{invoice.resident}</span>
                                                <span className="text-xs text-zinc-500 font-mono">{invoice.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300">{invoice.unit}</td>
                                        <td className="px-6 py-4 text-zinc-400">{invoice.issueDate}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-zinc-400">
                                                <span>{invoice.dueDate}</span>
                                                {invoice.status === 'overdue' && (
                                                    <AlertCircle size={14} className="text-rose-500 animate-pulse" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-white">
                                            ${invoice.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {getStatusBadge(invoice.status)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                                                {/* Pay Button (Visible if Pending/Overdue) */}
                                                {(invoice.status === 'pending' || invoice.status === 'overdue') && (
                                                    <button
                                                        onClick={() => setPaymentModalData({ isOpen: true, invoiceId: invoice.id, amount: invoice.amount })}
                                                        className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                        title="Registrar Pago"
                                                    >
                                                        <DollarSign size={16} />
                                                    </button>
                                                )}

                                                <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-700/50 rounded-lg transition-colors" title="Descargar PDF">
                                                    <Download size={16} />
                                                </button>
                                                <button className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Ver Detalles">
                                                    <FileText size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>

                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                                        No se encontraron facturas con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination (Visual Only) */}
            <div className="flex items-center justify-between px-2">
                <span className="text-xs text-zinc-500">Mostrando {filteredInvoices.length} de {invoices.length} resultados</span>
                <div className="flex gap-2">
                    <button disabled className="px-3 py-1 text-xs rounded-md bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed">Anterior</button>
                    <button className="px-3 py-1 text-xs rounded-md bg-zinc-800 text-zinc-300 hover:bg-zinc-700">Siguiente</button>
                </div>
            </div>

            {/* Modals */}
            <CreateInvoiceModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                condominiumId={condominiumId}
                organizationId={organizationId}
                onSuccess={() => {
                    // Logic to refresh or handle success if needed
                }}
            />

            <RegisterPaymentModal
                isOpen={paymentModalData.isOpen}
                onClose={() => setPaymentModalData({ ...paymentModalData, isOpen: false })}
                invoiceId={paymentModalData.invoiceId}
                amountDue={paymentModalData.amount}
                onSubmit={handleRegisterPayment}
            />

        </div>
    )
}
