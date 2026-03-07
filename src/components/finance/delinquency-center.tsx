'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { DelinquencyReportModal } from './delinquency-report-modal'

const debtors = [
    { id: 1, name: 'Roberto Sánchez', unit: 'A-204', debt: 12500, days: 65, avatar: 'RS' },
    { id: 2, name: 'Gabriela Torres', unit: 'B-101', debt: 8400, days: 45, avatar: 'GT' },
    { id: 3, name: 'Luis Medina', unit: 'C-305', debt: 4200, days: 32, avatar: 'LM' },
    { id: 4, name: 'Ana Pineda', unit: 'A-102', debt: 3800, days: 15, avatar: 'AP' },
]

export function DelinquencyCenter({ condominiumId }: { condominiumId: string }) {
    const [showReport, setShowReport] = useState(false)

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 flex flex-col h-full"
            >
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <AlertCircle className="text-rose-500" size={20} />
                        Centro de Morosidad
                    </h3>
                    <span className="text-xs font-medium px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        Crítico: $28,900
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {debtors.map((debtor, i) => (
                        <div key={debtor.id} className="flex items-center justify-between group p-2 hover:bg-zinc-800/50 rounded-lg transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:bg-rose-500/10 group-hover:text-rose-400 transition-colors">
                                    {debtor.avatar}
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-white">{debtor.name}</div>
                                    <div className="text-xs text-zinc-500">Unidad {debtor.unit} • {debtor.days} días vencido</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold text-rose-400">${debtor.debt.toLocaleString()}</div>
                                <button className="text-[10px] text-zinc-500 hover:text-white flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Gestionar <ArrowRight size={10} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800">
                    <button
                        onClick={() => setShowReport(true)}
                        className="w-full py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Ver reporte completo
                    </button>
                </div>
            </motion.div>

            <DelinquencyReportModal
                isOpen={showReport}
                onClose={() => setShowReport(false)}
                condominiumId={condominiumId}
            />
        </>
    )
}
