'use client'

import { useState } from 'react'
import { KPICards } from '@/components/finance/kpi-cards'
import { RevenueChart } from '@/components/finance/revenue-chart'
import { ReportsGeneratorModal } from '@/components/finance/reports-generator'
import { CreateInvoiceModal } from '@/components/finance/create-invoice-modal'
import { FileText, Download, ArrowRight, Plus } from 'lucide-react'
import Link from 'next/link'

export default function AdminFinanceClient({ condominiumId, organizationId }: { condominiumId: string, organizationId: string }) {
    const [isReportModalOpen, setIsReportModalOpen] = useState(false)
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)

    return (
        <div className="space-y-6 md:space-y-8 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Finanzas & Facturación</h1>
                    <p className="text-sm md:text-base text-zinc-400">Visión general del estado financiero de tu condominio.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
                    <button
                        onClick={() => setIsCreateInvoiceOpen(true)}
                        className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all flex-1 sm:flex-none"
                    >
                        <Plus size={16} />
                        Nueva Factura
                    </button>
                    <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors flex-1 sm:flex-none border border-zinc-700"
                    >
                        <Download size={16} />
                        Reporte
                    </button>
                    <Link href="/dashboard/finance/billing" className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all flex-[2] sm:flex-none">
                        <FileText size={16} />
                        <span className="hidden xs:inline">Gestionar Facturación</span><span className="xs:hidden">Facturación</span>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <KPICards condominiumId={condominiumId} />

            {/* Main Content Grid */}
            <div className="min-h-[400px]">
                {/* Revenue Chart - Taking up full space now */}
                <RevenueChart condominiumId={condominiumId} />
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
