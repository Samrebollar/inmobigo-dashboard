'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { DelinquencyReportModal } from './delinquency-report-modal'

import { createClient } from '@/utils/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface Debtor {
    id: string
    name: string
    unit: string
    debt: number
    days: number
    avatar: string
}

export function DelinquencyCenter({ condominiumId }: { condominiumId: string }) {
    const [showReport, setShowReport] = useState(false)
    const [debtors, setDebtors] = useState<Debtor[]>([])
    const [totalDebt, setTotalDebt] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        if (!condominiumId || condominiumId.startsWith('demo-')) {
            // Mock data for demo
            setDebtors([
                { id: '1', name: 'Roberto Sánchez', unit: 'A-204', debt: 12500, days: 65, avatar: 'RS' },
                { id: '2', name: 'Gabriela Torres', unit: 'B-101', debt: 8400, days: 45, avatar: 'GT' },
                { id: '3', name: 'Luis Medina', unit: 'C-305', debt: 4200, days: 32, avatar: 'LM' },
                { id: '4', name: 'Ana Pineda', unit: 'A-102', debt: 3800, days: 15, avatar: 'AP' },
            ])
            setTotalDebt(28900)
            setLoading(false)
            return
        }

        const fetchDebtors = async () => {
            try {
                const { data, error } = await supabase
                    .from('invoices')
                    .select(`
                        id,
                        amount,
                        balance_due,
                        due_date,
                        status,
                        residents!invoices_resident_id_fkey (
                            id,
                            first_name,
                            last_name
                        ),
                        units!invoices_unit_id_fkey (
                            unit_number
                        )
                    `)
                    .eq('condominium_id', condominiumId)
                    .or('status.eq.pending,status.eq.overdue,balance_due.gt.0')

                if (error) throw error

                if (data) {
                    // Aggregate debts by resident
                    const residentDebts: Record<string, Debtor> = {}
                    const now = new Date()

                    data.forEach((inv: any) => {
                        const amount = inv.balance_due && inv.balance_due > 0 ? inv.balance_due : (inv.amount || 0)
                        if (amount <= 0) return

                        const resident = inv.residents
                        if (!resident) return

                        const residentId = resident.id
                        const dueDate = inv.due_date ? new Date(inv.due_date) : now
                        // Calculate days strictly as difference from today
                        const diffTime = now.getTime() - dueDate.getTime()
                        const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)))

                        if (!residentDebts[residentId]) {
                            const firstName = resident.first_name || 'Desconocido'
                            const lastName = resident.last_name || ''
                            const fullName = `${firstName} ${lastName}`.trim()
                            const avatar = firstName.charAt(0) + (lastName ? lastName.charAt(0) : '')

                            residentDebts[residentId] = {
                                id: residentId,
                                name: fullName,
                                unit: inv.units?.unit_number || 'S/N',
                                debt: 0,
                                days: diffDays,
                                avatar: avatar.toUpperCase() || '👤'
                            }
                        }

                        residentDebts[residentId].debt += amount
                        // Keep the maximum days overdue for this resident
                        if (diffDays > residentDebts[residentId].days) {
                            residentDebts[residentId].days = diffDays
                        }
                    })

                    // Convert to array, sort by days overdue (desc), then debt (desc)
                    const debtorArray = Object.values(residentDebts).sort((a, b) => {
                        if (b.days !== a.days) return b.days - a.days
                        return b.debt - a.debt
                    })

                    // Set total debt
                    const total = debtorArray.reduce((acc, curr) => acc + curr.debt, 0)
                    setTotalDebt(total)
                    
                    // Take top 4
                    setDebtors(debtorArray.slice(0, 4))
                }
            } catch (err) {
                console.error('Error fetching delinquency center data:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchDebtors()
    }, [condominiumId, supabase])

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
                        Total: ${totalDebt.toLocaleString()}
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {loading ? (
                        <div className="text-sm text-zinc-500 text-center py-4">Cargando datos...</div>
                    ) : debtors.length === 0 ? (
                        <div className="text-sm text-zinc-500 text-center py-4">No hay residentes morosos actualmente.</div>
                    ) : (
                        debtors.map((debtor, i) => (
                            <div key={debtor.id} className="flex items-center justify-between group p-2 hover:bg-zinc-800/50 rounded-lg transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400 group-hover:bg-rose-500/10 group-hover:text-rose-400 transition-colors">
                                        {debtor.avatar}
                                    </div>
                                    <div className="min-w-0 pr-4">
                                        <div className="text-sm font-medium text-white truncate max-w-[140px]">{debtor.name}</div>
                                        <div className="text-xs text-zinc-500 truncate">
                                            Unidad {debtor.unit} • {debtor.days === 0 ? 'Al día o fecha pendiente' : `${debtor.days} días vencido`}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <div className="text-sm font-bold text-rose-400">${debtor.debt.toLocaleString()}</div>
                                    <button className="text-[10px] text-zinc-500 hover:text-white flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                                        Gestionar <ArrowRight size={10} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
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
