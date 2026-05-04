'use client'

import { motion } from 'framer-motion'
import { TransparencyMetrics } from './transparency-metrics'
import { FinancialComparisonChart } from './financial-comparison-chart'
import { SpendingBreakdown } from './spending-breakdown'
import { TransparencyTable } from './transparency-table'
import { SmartMonthlyReport } from './smart-monthly-report'
import { ReserveFundModule } from '../accounting/reserve-fund-module'
import { BarChart3, Info } from 'lucide-react'

interface TransparencyClientProps {
    data: any
    condominiumId: string
    isAdmin?: boolean
}

export function TransparencyClient({ data, condominiumId, isAdmin = false }: TransparencyClientProps) {
    const { metrics, movements, fundData } = data

    // GROUP EXPENSES BY CATEGORY
    const expensesByCategory = movements
        .filter((m: any) => m.type === 'egreso')
        .reduce((acc: any, curr: any) => {
            const cat = curr.category || 'Otros'
            acc[cat] = (acc[cat] || 0) + curr.amount
            return acc
        }, {})

    const categoryArray = Object.keys(expensesByCategory).map(cat => ({
        category: cat,
        amount: expensesByCategory[cat]
    })).sort((a, b) => b.amount - a.amount)

    const topCategory = categoryArray[0]?.category || ''

    return (
        <div className="space-y-12 pb-20">
            {/* HEADER SECTION */}
            <motion.div 
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex flex-col gap-2"
            >
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-2.5 rounded-2xl bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.4)] text-white">
                        <BarChart3 size={24} />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">Transparencia Financiera</h1>
                </div>
                <p className="text-zinc-500 text-lg font-medium max-w-2xl leading-relaxed">
                    Consulta cómo se administran los ingresos y gastos de tu condominio.
                </p>
            </motion.div>

            {/* METRICS GRID */}
            <TransparencyMetrics metrics={metrics} />

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <FinancialComparisonChart data={metrics} />
                <SpendingBreakdown expenses={categoryArray} totalExpenses={metrics.totalExpenses} />
            </div>

            <div className="grid grid-cols-1 gap-8">
                <SmartMonthlyReport metrics={metrics} topCategory={topCategory} movements={movements} isAdmin={isAdmin} />
            </div>

            {/* 💰 RESERVA SECTION (Read Only) */}
            <ReserveFundModule fundData={fundData} condominiumId={condominiumId} isAdmin={isAdmin} />

            {/* DETALLES SECTION SEPARATOR */}
            <div className="flex items-center gap-4 py-4">
                <div className="h-px flex-1 bg-white/5" />
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">
                    Detalle Completo de Operaciones
                </div>
                <div className="h-px flex-1 bg-white/5" />
            </div>

            {/* TABLE SECTION */}
            <TransparencyTable movements={movements} />

            {/* FOOTER INFO */}
            <div className="flex items-start gap-4 p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 max-w-3xl">
                <Info className="text-blue-400 mt-1 flex-shrink-0" size={20} />
                <p className="text-blue-400/80 text-sm leading-relaxed font-medium">
                    <strong className="text-blue-300 block mb-1">Nota sobre Transparencia:</strong>
                    La información mostrada se genera automáticamente en tiempo real con base en los registros autorizados por la administración. Los nombres de otros residentes se ocultan por motivos de privacidad.
                </p>
            </div>
        </div>
    )
}

