'use client'

import { useState } from 'react'
import { KPICards } from '@/components/finance/kpi-cards'
import { RevenueChart } from '@/components/finance/revenue-chart'
import { CreateInvoiceModal } from '@/components/finance/create-invoice-modal'
import { BulkChargeModal } from '@/components/finance/bulk-charge-modal'
import { FineModal } from '@/components/finance/fine-modal'
import { FileText, ArrowRight, Plus, AlertTriangle, Gavel } from 'lucide-react'
import Link from 'next/link'

export default function AdminFinanceClient({ 
    initialCondoId, 
    organizationId, 
    condominiumList 
}: { 
    initialCondoId: string | null, 
    organizationId: string, 
    condominiumList: { id: string, name: string }[] 
}) {
    const [selectedCondoId, setSelectedCondoId] = useState<string | null>(initialCondoId)
    const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false)
    const [isBulkChargeOpen, setIsBulkChargeOpen] = useState(false)
    const [isFineModalOpen, setIsFineModalOpen] = useState(false)

    // El Historial de Recibos hereda el condominio seleccionado aquí, en vez de
    // mandar siempre a ver todo el portafolio.
    const billingHref = selectedCondoId
        ? `/dashboard/finance/billing?condo=${selectedCondoId}`
        : '/dashboard/finance/billing'

    return (
        <div className="space-y-6 md:space-y-8 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">Finanzas</h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                        <p className="text-sm text-zinc-400">Visión general del estado financiero de</p>
                        <select
                            value={selectedCondoId || 'all'}
                            onChange={(e) => setSelectedCondoId(e.target.value === 'all' ? null : e.target.value)}
                            className="bg-transparent border-none text-indigo-400 font-semibold focus:ring-0 cursor-pointer hover:text-indigo-300 transition-colors p-0 text-sm h-auto w-auto"
                        >
                            <option value="all" className="bg-zinc-900 text-white font-normal italic">Todas las propiedades</option>
                            {condominiumList.map(condo => (
                                <option key={condo.id} value={condo.id} className="bg-zinc-900 text-white font-normal">
                                    {condo.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3">
                    <button
                        onClick={() => setIsCreateInvoiceOpen(true)}
                        className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all flex-1 sm:flex-none"
                    >
                        <Plus size={16} />
                        Nuevo Recibo
                    </button>
                    <button
                        onClick={() => setIsBulkChargeOpen(true)}
                        className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 shadow-lg shadow-amber-500/20 transition-all flex-1 sm:flex-none"
                    >
                        <AlertTriangle size={16} />
                        Cargo Extraordinario
                    </button>
                    <button
                        onClick={() => setIsFineModalOpen(true)}
                        className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 shadow-lg shadow-rose-500/20 transition-all flex-1 sm:flex-none"
                    >
                        <Gavel size={16} />
                        Multas
                    </button>
                    <Link href={billingHref} className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all flex-[2] sm:flex-none">
                        <FileText size={16} />
                        <span>Detalles</span>
                    </Link>

                </div>
            </div>

            {/* KPI Cards */}
            <KPICards organizationId={organizationId} condominiumId={selectedCondoId ?? undefined} />

            {/* Main Content Grid */}
            <div className="min-h-[400px]">
                {/* Revenue Chart - Taking up full space now */}
                <RevenueChart organizationId={organizationId} condominiumId={selectedCondoId ?? undefined} />
            </div>

            {/* Quick Link to Detailed Billing */}
            <div className="flex justify-end">
                <Link href={billingHref} className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 transition-colors">
                    Ver historial completo <ArrowRight size={14} />
                </Link>
            </div>

            {/* Create Invoice Modal */}
            <CreateInvoiceModal
                isOpen={isCreateInvoiceOpen}
                onClose={() => setIsCreateInvoiceOpen(false)}
                condominiumId={selectedCondoId || (condominiumList.length > 0 ? condominiumList[0].id : '')}
                organizationId={organizationId}
                onSuccess={() => {
                    // Optional: refresh data
                    window.location.reload()
                }}
            />

            {/* Bulk Charge Modal (cuota extraordinaria a toda la privada) */}
            <BulkChargeModal
                isOpen={isBulkChargeOpen}
                onClose={() => setIsBulkChargeOpen(false)}
                condominiumId={selectedCondoId || (condominiumList.length > 0 ? condominiumList[0].id : '')}
                organizationId={organizationId}
                condominiumList={condominiumList}
                onSuccess={() => window.location.reload()}
            />

            {/* Fine Modal (multa individual con evidencia en PDF) */}
            <FineModal
                isOpen={isFineModalOpen}
                onClose={() => setIsFineModalOpen(false)}
                condominiumId={selectedCondoId || (condominiumList.length > 0 ? condominiumList[0].id : '')}
                organizationId={organizationId}
                condominiumList={condominiumList}
                onSuccess={() => window.location.reload()}
            />
        </div>
    )
}
