'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building, Phone, Mail, Plus, AlertTriangle, Search, Filter, Download, Zap, Receipt, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Resident } from '@/types/residents'
import { Invoice } from '@/types/finance'
import { residentsService } from '@/services/residents-service'
import { financeService } from '@/services/finance-service'
import { propertiesService } from '@/services/properties-service'
import { notificationsService } from '@/services/notifications-service'
import { CreateInvoiceModal } from '@/components/finance/create-invoice-modal'
import { CommunicationLog } from '@/types/residents'
import { format, parseISO, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'

export default function ResidentMovementsPage() {
    const params = useParams()
    const id = params?.id as string

    // State
    const [loading, setLoading] = useState(true)
    const [resident, setResident] = useState<Resident | null>(null)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [logs, setLogs] = useState<CommunicationLog[]>([])
    const [search, setSearch] = useState('')
    const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
    const [sendingReminder, setSendingReminder] = useState(false)
    const [organizationId, setOrganizationId] = useState('')
    const [condominiumName, setCondominiumName] = useState('')
    const [status, setStatus] = useState<{ type: 'success' | 'warning' | 'error', message: string } | null>(null)

    // Stats
    const [stats, setStats] = useState({
        totalBilled: 0,
        totalPaid: 0,
        totalPending: 0,
        overdueCount: 0,
        maxDaysOverdue: 0
    })

    useEffect(() => {
        if (id) {
            fetchData(id)
        }
    }, [id])

    const fetchData = async (residentId: string) => {
        try {
            setLoading(true)
            const residentData = await residentsService.getById(residentId)
            setResident(residentData)

            // Fetch logs
            const logsData = await notificationsService.getHistory(residentId)
            setLogs(logsData)

            if (residentData?.condominium_id) {
                const condo = await propertiesService.getById(residentData.condominium_id)
                if (condo) {
                    setOrganizationId(condo.organization_id)
                    setCondominiumName(condo.name)
                }
            }

            if (residentData?.unit_id) {
                const invoicesData = await financeService.getByUnit(residentData.unit_id)
                setInvoices(invoicesData)

                // Calculate Stats
                const totalBilled = invoicesData.reduce((sum, inv) => sum + inv.amount, 0)
                const totalPaid = invoicesData
                    .filter(inv => inv.status === 'paid')
                    .reduce((sum, inv) => sum + inv.amount, 0)
                const totalPending = invoicesData
                    .filter(inv => inv.status === 'pending' || inv.status === 'overdue')
                    .reduce((sum, inv) => sum + inv.amount, 0)
                const overdueInvoices = invoicesData.filter(inv => inv.status === 'overdue')

                let maxDays = 0
                if (overdueInvoices.length > 0) {
                    const oldest = overdueInvoices.reduce((prev, curr) =>
                        new Date(prev.due_date) < new Date(curr.due_date) ? prev : curr
                    )
                    maxDays = differenceInDays(new Date(), parseISO(oldest.due_date))
                }

                setStats({
                    totalBilled,
                    totalPaid,
                    totalPending,
                    overdueCount: overdueInvoices.length,
                    maxDaysOverdue: maxDays
                })
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
    }

    const formatDate = (dateStr: string) => {
        return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
    }

    const handleSmartReminder = async () => {
        if (!resident || invoices.length === 0) return
        
        // Find overdue or pending invoices
        const unpaidInvoices = invoices.filter(inv => inv.status === 'overdue' || inv.status === 'pending')
        
        if (unpaidInvoices.length === 0) {
            setStatus({ type: 'warning', message: '⚠️ No hay facturas pendientes para recordar.' })
            return
        }

        // Get the oldest unpaid invoice
        const targetInvoice = unpaidInvoices.reduce((a, b) => new Date(a.due_date) < new Date(b.due_date) ? a : b)

        setSendingReminder(true)
        try {
            const webhookUrl = 'https://n8n.srv1286224.hstgr.cloud/webhook/send-morosidad-whatsapp'
            console.log('Enviando recordatorio a:', webhookUrl)

            const payload = {
                "tipo": "recordatorio",
                "first_name": `${resident.first_name} ${resident.last_name}`,
                "phone": resident.phone || '',
                "amount": targetInvoice.amount,
                "due_date": targetInvoice.due_date,
                "payment_link": targetInvoice.payment_link || null,
                "condominium": condominiumName || '',
                "unit": resident.unit_number || 'S/N'
            }

            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                setStatus({ type: 'success', message: '✅ Recordatorio enviado por WhatsApp' })
                fetchData(resident.id)
            } else {
                setStatus({ type: 'error', message: '❌ Error al enviar el recordatorio por WhatsApp' })
            }
        } catch (e) {
            setStatus({ type: 'error', message: '❌ Error: Hubo un problema al procesar la solicitud' })
        } finally {
            setSendingReminder(false)
            setTimeout(() => setStatus(null), 4000)
        }
    }

    const filteredInvoices = invoices.filter(inv =>
        inv.folio.toLowerCase().includes(search.toLowerCase()) ||
        inv.description.toLowerCase().includes(search.toLowerCase())
    )

    if (loading) {
        return <div className="p-8 text-center text-zinc-500">Cargando información del residente...</div>
    }

    type HistoryEvent = {
        date: string
        type: 'payment' | 'invoice' | 'overdue' | 'reminder'
        description: string
        amount?: number
    }

    const getHistory = (invoices: Invoice[], logs: CommunicationLog[]): HistoryEvent[] => {
        const events: HistoryEvent[] = []

        // Add Logs
        logs.forEach(log => {
            events.push({
                date: log.created_at,
                type: 'reminder', // Map all logs to reminder type for now, or distinguish if needed
                description: `[${log.method.toUpperCase()}] Recordatorio ${log.message_type}: ${log.metadata?.invoice_folio || ''} (${log.days_overdue} días atraso)`
            })
        })

        invoices.forEach(inv => {
            // Event: Invoice Created
            events.push({
                date: inv.created_at,
                type: 'invoice',
                description: `Se generó la factura ${inv.folio}`,
                amount: inv.amount
            })

            // Event: Payment
            if (inv.status === 'paid' && inv.paid_at) {
                events.push({
                    date: inv.paid_at,
                    type: 'payment',
                    description: `Se registró el pago completo de la factura ${inv.folio}`,
                    amount: inv.amount
                })
            }

            // Event: Overdue (Mock derivation)
            if (inv.status === 'overdue') {
                events.push({
                    date: inv.due_date, // Using due date as the event date
                    type: 'overdue',
                    description: `La factura ${inv.folio} ha vencido`,
                    amount: inv.amount
                })

                // Mock Reminder for overdue
                events.push({
                    date: new Date(new Date(inv.due_date).getTime() + 86400000 * 3).toISOString(), // 3 days after due
                    type: 'reminder',
                    description: `Se envió recordatorio de pago automático para ${inv.folio}`
                })
            }
            // Mock Reminder for pending
            if (inv.status === 'pending') {
                events.push({
                    date: new Date(new Date(inv.created_at).getTime() + 86400000 * 15).toISOString(),
                    type: 'reminder',
                    description: `Recordatorio de vencimiento próximo para ${inv.folio}`
                })
            }
        })

        return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20)
    }

    if (!resident) {
        return <div className="p-8 text-center text-zinc-500">Residente no encontrado</div>
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <AnimatePresence>
                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`p-4 mb-4 rounded-xl border flex items-center gap-3 shadow-lg ${
                            status.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                            status.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                            'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}
                    >
                        {status.message}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Area */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="z-10 relative">
                        <Link href="/dashboard/residentes">
                            <Button variant="ghost" className="pl-0 gap-2 text-zinc-400 hover:text-white hover:bg-transparent">
                                <ArrowLeft size={16} />
                                Volver a Residentes
                            </Button>
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-zinc-500 text-sm flex items-center gap-1">
                            <Building size={14} /> {condominiumName || (resident.condominium_id ? 'Propiedad Las Palmas' : '')}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{resident.first_name} {resident.last_name}</h1>
                        <div className="flex items-center gap-4 text-zinc-400 text-sm mb-4">
                            <span className="flex items-center gap-1"><Mail size={14} /> {resident.email}</span>
                            <span className="flex items-center gap-1"><Phone size={14} /> {resident.phone}</span>
                        </div>

                        {stats.overdueCount > 0 && (
                            <Badge variant="destructive" className="bg-red-500/10 text-red-400 border-red-500/20 px-3 py-1 text-sm flex items-center w-fit gap-2">
                                <AlertTriangle size={14} />
                                {stats.maxDaysOverdue}+ días de atraso
                            </Badge>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSmartReminder}
                            disabled={sendingReminder || stats.overdueCount === 0}
                            variant="outline"
                            className="bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300 gap-2"
                        >
                            {sendingReminder ? <Clock className="animate-spin" size={16} /> : <Zap size={16} className={stats.overdueCount > 0 ? "text-amber-500" : ""} />}
                            {sendingReminder ? 'Enviando...' : 'Recordatorio Inteligente'}
                        </Button>

                        <Button
                            onClick={() => setShowCreateInvoiceModal(true)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 shadow-lg shadow-indigo-500/20"
                        >
                            <Plus size={16} /> Crear Factura
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-indigo-500/50 transition-all hover:bg-zinc-900/80 group h-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                        <CardContent className="p-6 pt-10 flex flex-col justify-between h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Receipt size={64} className="text-indigo-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                    <div className="p-1.5 rounded-md bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                                        <Receipt size={16} />
                                    </div>
                                    <span className="text-sm font-bold">Total Facturado</span>
                                </div>
                                <div className="text-3xl font-bold text-white tracking-tight mt-2">{formatMoney(stats.totalBilled)}</div>
                            </div>
                            <div className="text-xs text-indigo-400 mt-4 flex items-center gap-1 font-medium">
                                <CheckCircle size={12} /> Facturación histórica
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Total Pagado */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-emerald-500/50 transition-all hover:bg-zinc-900/80 group h-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
                        <CardContent className="p-6 pt-10 flex flex-col justify-between h-full relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <CheckCircle size={64} className="text-emerald-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                    <div className="p-1.5 rounded-md bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                                        <CheckCircle size={16} />
                                    </div>
                                    <span className="text-sm font-bold">Total Pagado</span>
                                </div>
                                <div className="text-3xl font-bold text-emerald-500 tracking-tight mt-2">{formatMoney(stats.totalPaid)}</div>
                            </div>
                            <div className="text-xs text-emerald-400 mt-4 flex items-center gap-1 font-medium">
                                <CheckCircle size={12} /> Al día
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Saldo Pendiente */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-amber-500/50 transition-all hover:bg-zinc-900/80 group relative overflow-hidden h-full">
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500/50"></div>
                        <CardContent className="p-6 pt-10 flex flex-col justify-between h-full relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <AlertTriangle size={64} className="text-amber-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-amber-500 mb-2">
                                    <div className="p-1.5 rounded-md bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                                        <AlertTriangle size={16} />
                                    </div>
                                    <span className="text-sm font-bold">Saldo Pendiente</span>
                                </div>
                                <div className="text-3xl font-bold text-amber-500 tracking-tight mt-2">{formatMoney(stats.totalPending)}</div>
                            </div>
                            <div className="text-xs text-amber-500 mt-4 flex items-center gap-1 font-medium">
                                ● Pendiente de pago
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Facturas Vencidas */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                >
                    <Card className="bg-zinc-900/50 border-zinc-800 hover:border-red-500/50 transition-all hover:bg-zinc-900/80 group relative overflow-hidden h-full">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50"></div>
                        <CardContent className="p-6 pt-10 flex flex-col justify-between h-full relative">
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <Clock size={64} className="text-red-500" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-red-400 mb-2">
                                    <div className="p-1.5 rounded-md bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                                        <Clock size={16} />
                                    </div>
                                    <span className="text-sm font-bold">Facturas Vencidas</span>
                                </div>
                                <div className="text-3xl font-bold text-white tracking-tight mt-2">{stats.overdueCount}</div>
                            </div>
                            <div className="text-xs text-red-400/80 mt-4 flex items-center gap-1 font-medium">
                                {stats.maxDaysOverdue > 0 ? `● ${stats.maxDaysOverdue} días de atraso` : 'Sin vencimientos'}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Invoices Table Section */}
            <div className="space-y-4">
                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                            placeholder="Buscar factura..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-zinc-900 border-zinc-800 pl-9 focus:border-indigo-500"
                        />
                    </div>
                    <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 gap-2">
                        <Filter size={16} /> Este Año
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                        <Download size={16} /> Exportar Por
                    </Button>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-zinc-950/50 text-zinc-400 font-medium">
                            <tr className="border-b border-zinc-800">
                                <th className="px-6 py-4">Folio</th>
                                <th className="px-6 py-4">Concepto</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Monto</th>
                                <th className="px-6 py-4">Pago</th>
                                <th className="px-6 py-4">Vencimiento</th>
                                <th className="px-6 py-4">Días de atraso</th>
                                <th className="px-6 py-4 text-right">...</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {filteredInvoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-zinc-800/50 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">{inv.folio}</td>
                                    <td className="px-6 py-4 text-zinc-300 max-w-[200px] truncate" title={inv.description}>
                                        {inv.description}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge variant="outline" className={`
                                            capitalize border-0 px-3 py-1
                                            ${inv.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                                            ${inv.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : ''}
                                            ${inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' : ''}
                                        `}>
                                            {inv.status === 'paid' && <CheckCircle size={12} className="mr-1" />}
                                            {inv.status === 'overdue' && <AlertTriangle size={12} className="mr-1" />}
                                            {inv.status === 'paid' ? 'Pagado' :
                                                inv.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-white font-medium">{formatMoney(inv.amount)}</td>
                                    <td className="px-6 py-4 text-white font-medium">
                                        {inv.status === 'paid' ? formatMoney(inv.amount) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-400">{formatDate(inv.due_date)}</td>
                                    <td className="px-6 py-4">
                                        {(inv.status === 'overdue' || (inv.status === 'pending' && new Date() > parseISO(inv.due_date)))
                                            ? <span className="text-red-400 font-medium">{Math.max(0, differenceInDays(new Date(), parseISO(inv.due_date)))} días</span>
                                            : <span className="text-zinc-600">-</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/dashboard/invoices/${inv.id}`}>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-400 hover:text-white">
                                                <Zap size={16} />
                                            </Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                                        No se encontraron resultados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Pagination Mock */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 text-zinc-500 text-xs">
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" disabled>&lt;&lt;</Button>
                            <Button variant="ghost" size="sm" disabled>&lt;</Button>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" disabled>&gt;</Button>
                            <Button variant="ghost" size="sm" disabled>&gt;&gt;</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Timeline */}
            <div className="space-y-4 pt-8 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white">Historial cronológico de movimientos</h2>
                    <span className="text-sm text-zinc-500">Hace 3 días ➔</span>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-8 shadow-inner">
                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-0 md:before:left-48 before:h-full before:w-0.5 before:bg-zinc-800">
                        {getHistory(invoices, logs).map((event, index) => (
                            <div key={index} className="relative flex items-center gap-10 group">
                                {/* Date (Left Side) - Widened and Separated */}
                                <div className="hidden md:block w-48 text-right shrink-0 pr-10">
                                    <div className="text-base font-medium text-zinc-300">{formatDate(event.date)}</div>
                                </div>

                                {/* Icon / Dot - Adjusted position */}
                                <div className="absolute left-0 md:left-48 -ml-px flex items-center justify-center w-10 h-10 -translate-x-1/2 rounded-full border border-zinc-900 bg-zinc-950 z-10">
                                    <div className={`w-3 h-3 rounded-full ${event.type === 'payment' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                        event.type === 'overdue' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                            event.type === 'reminder' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                                'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                                        }`}></div>
                                </div>

                                {/* Content Card */}
                                <div className="flex-1 ml-8 md:ml-4 flex items-center gap-4 p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/50 hover:bg-zinc-900/80 transition-colors">
                                    <div className={`p-2 rounded-lg shrink-0 ${event.type === 'payment' ? 'bg-emerald-500/10 text-emerald-500' :
                                        event.type === 'overdue' ? 'bg-red-500/10 text-red-500' :
                                            event.type === 'reminder' ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-blue-500/10 text-blue-500'
                                        }`}>
                                        {event.type === 'payment' && <CheckCircle size={18} />}
                                        {event.type === 'overdue' && <Clock size={18} />}
                                        {event.type === 'reminder' && <AlertTriangle size={18} />}
                                        {event.type === 'invoice' && <Receipt size={18} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-zinc-300 text-sm">{event.description}</div>
                                        {event.amount && <div className="text-xs text-zinc-500 mt-1 font-mono">{formatMoney(event.amount)}</div>}
                                    </div>
                                    <div className="text-xs text-zinc-600 hidden sm:block whitespace-nowrap">
                                        Hace {differenceInDays(new Date(), parseISO(event.date))} días
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            {/* Modals */}
            {
                resident && (
                    <CreateInvoiceModal
                        isOpen={showCreateInvoiceModal}
                        onClose={() => setShowCreateInvoiceModal(false)}
                        condominiumId={resident.condominium_id || ''}
                        organizationId={organizationId}
                        defaultResident={resident}
                        onSuccess={() => fetchData(id)}
                    />
                )
            }
        </div >
    )
}
