'use client'

import { useState } from 'react'
import { KPICards } from '@/components/finance/kpi-cards'
import { RevenueChart } from '@/components/finance/revenue-chart'
import { DelinquencyCenter } from '@/components/finance/delinquency-center'
import { ReportsGeneratorModal } from '@/components/finance/reports-generator'
import { CreateInvoiceModal } from '@/components/finance/create-invoice-modal'
import { FileText, Download, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'

export default function AdminFinanceClient({ condominiumId, organizationId }: { condominiumId: string, organizationId: string }) {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)

    return (
        <div className="space-y-8 p-8">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Finanzas & Facturación</h1>
                    <p className="text-zinc-400">Visión general del estado financiero de tu condominio.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setIsCreateInvoiceOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                        <Plus size={16} />
                        Nueva Factura
                    </button>
                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
                    >
                        <Download size={16} />
                        Exportar Reporte
                    </button>
                    <Link href="/dashboard/finance/billing" className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all">
                        <FileText size={16} />
                        Gestionar Facturación
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <KPICards />

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3 h-[500px]">
                {/* Revenue Chart - Taking up 2/3 space */}
                <div className="lg:col-span-2">
                    <RevenueChart />
                </div>

                {/* Delinquency Center - Taking up 1/3 space */}
                <div className="lg:col-span-1">
                    <DelinquencyCenter condominiumId={condominiumId} />
                </div>
            </div>

            {/* Quick Link to Detailed Billing */}
            <div className="flex justify-end">
                <Link href="/dashboard/finance/billing" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                    Ver historial completo de facturación <ArrowRight size={14} />
                </Link>
            </div>

            {/* Report Generator Modal */}
            <ReportsGeneratorModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
            />

            {/* Create Invoice Modal */}
            <CreateInvoiceModal
                isOpen={isCreateInvoiceOpen}
                onClose={() => setIsCreateInvoiceOpen(false)}
                condominiumId={condominiumId}
                organizationId={organizationId}
                onSuccess={() => {
                    // Optional: refresh data
                    window.location.reload()
                }}
            />
        </div>
    )
}
