'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Download, CreditCard, Clock, CheckCircle2, AlertCircle, FileText, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Invoice {
    id: string
    period: string
    amount: number
    status: 'paid' | 'pending' | 'overdue'
    due_date: string
    paid_at?: string
}

const MOCK_INVOICES: Invoice[] = [
    { id: 'INV-001', period: 'Febrero 2026', amount: 2500, status: 'pending', due_date: '2026-02-28' },
    { id: 'INV-002', period: 'Enero 2026', amount: 2500, status: 'paid', due_date: '2026-01-31', paid_at: '2026-01-28' },
    { id: 'INV-003', period: 'Diciembre 2025', amount: 2500, status: 'paid', due_date: '2025-12-31', paid_at: '2025-12-29' },
]

export function ResidentFinanceView() {
    const currentDebt = 2500

    const getStatusColor = (status: Invoice['status']) => {
        switch (status) {
            case 'paid': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
            case 'pending': return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
            case 'overdue': return 'text-rose-400 bg-rose-400/10 border-rose-400/20'
            default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
        }
    }

    const getStatusLabel = (status: Invoice['status']) => {
        switch (status) {
            case 'paid': return 'Pagado'
            case 'pending': return 'Pendiente'
            case 'overdue': return 'Vencido'
            default: return status
        }
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-3xl font-bold tracking-tight text-white">Mis Finanzas</h1>
                    <p className="text-zinc-400">Historial de pagos y estado de cuenta</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex gap-3"
                >
                    <Button variant="outline" className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                        <Download className="mr-2 h-4 w-4" />
                        Estado de Cuenta
                    </Button>
                </motion.div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* Outstanding Balance Card (Compact & Dynamic - Reverted to md:col-span-2) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 shadow-xl transition-all hover:border-indigo-500/30 hover:shadow-indigo-500/10"
                >
                    {/* Animated Background Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700 animate-pulse" />

                    <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center px-2 py-1">
                        <div className="space-y-1">
                            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-2">Saldo Total a Pagar</h2>
                            <div className="flex items-center gap-3">
                                <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-white to-zinc-400">
                                    ${currentDebt.toLocaleString()}
                                </span>
                                <span className="text-sm font-medium text-zinc-500 mt-2">MXN</span>
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </span>
                                <p className="text-xs font-medium text-amber-400/90">
                                    Vence el 28 de Febrero
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 w-full sm:w-auto mt-6 sm:mt-0">
                            <Button size="lg" className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 px-8 h-12 rounded-xl font-medium transition-all hover:-translate-y-0.5 hover:shadow-indigo-500/40">
                                <CreditCard className="mr-2 h-4 w-4" />
                                Pagar Ahora
                            </Button>
                            <div className="flex justify-center gap-2 text-[10px] text-zinc-500">
                                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Seguro</span>
                                <span>•</span>
                                <span>Encriptado SSL</span>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Stats (Stacked Compact with Larger Icons) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="grid grid-cols-2 md:grid-cols-1 gap-4"
                >
                    {/* Status Card */}
                    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-emerald-500/30 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xs font-medium text-zinc-400 mb-0.5">Estado</h3>
                                <p className="text-lg font-bold text-white leading-tight">Al Corriente</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">12 meses consecutivos</p>
                            </div>
                        </div>
                    </div>

                    {/* Next Invoice Card */}
                    <div className="group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 transition-all hover:border-blue-500/30 hover:-translate-y-1">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex items-center gap-4">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                <FileText className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xs font-medium text-zinc-400 mb-0.5">Próxima Factura</h3>
                                <p className="text-lg font-bold text-white leading-tight">01 Mar</p>
                                <p className="text-[10px] text-zinc-500 mt-0.5">Emisión automática</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Payment History List */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-3xl border border-zinc-800 bg-zinc-900/50 overflow-hidden"
            >
                <div className="p-6 border-b border-zinc-800/50 pb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Historial de Finanzas</h3>
                    <div className="text-xs font-medium text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded">Últimos 3 meses</div>
                </div>

                <div className="divide-y divide-zinc-800/50">
                    {MOCK_INVOICES.map((invoice) => (
                        <div key={invoice.id} className="group p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-zinc-800/30 transition-colors cursor-pointer">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border shadow-sm transition-all group-hover:scale-105", getStatusColor(invoice.status))}>
                                    {invoice.status === 'paid' ? <CheckCircle2 className="h-5 w-5" /> :
                                        invoice.status === 'overdue' ? <AlertCircle className="h-5 w-5" /> :
                                            <Clock className="h-5 w-5" />}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-white text-base group-hover:text-indigo-400 transition-colors">{invoice.period}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-zinc-500">Vencimiento: {invoice.due_date}</span>
                                        {invoice.id === 'INV-001' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-right">
                                    <p className="text-lg font-bold text-white tracking-tight">${invoice.amount.toLocaleString()}</p>
                                    <span className={cn("inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border mt-1", getStatusColor(invoice.status))}>
                                        {getStatusLabel(invoice.status)}
                                    </span>
                                </div>
                                <div className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-800/50 text-zinc-600 group-hover:bg-indigo-500 group-hover:text-white group-hover:translate-x-1 transition-all">
                                    <ChevronRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 text-center border-t border-zinc-800/50 bg-zinc-900/30">
                    <Button variant="ghost" className="text-sm text-zinc-500 hover:text-white w-full sm:w-auto">Ver todo el historial</Button>
                </div>
            </motion.div>

        </div>
    )
}
