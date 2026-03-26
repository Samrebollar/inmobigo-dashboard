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

export function DelinquencyCenter({ 
    condominiumId, 
    onStatsUpdate 
}: { 
    condominiumId: string,
    onStatsUpdate?: (stats: any) => void
}) {
    const [scope, setScope] = useState<string>('all')
    const [availableCondos, setAvailableCondos] = useState<{id: string, name: string}[]>([])
    const [activeCondoIds, setActiveCondoIds] = useState<string[]>([])
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
            setLoading(true)
            try {
                let queryCondoIds = scope === 'all' ? [condominiumId] : [scope]
                let fetchedCondos = availableCondos

                // Fetch organization condos if not fetched yet or empty
                if (fetchedCondos.length === 0) {
                    const { data: orgLookup } = await supabase
                        .from('condominiums')
                        .select('organization_id')
                        .eq('id', condominiumId)
                        .maybeSingle()

                    if (orgLookup?.organization_id) {
                        const { data: orgCondos } = await supabase
                            .from('condominiums')
                            .select('id, name')
                            .eq('organization_id', orgLookup.organization_id)
                            .order('name')

                        if (orgCondos) {
                            fetchedCondos = orgCondos
                            setAvailableCondos(orgCondos)
                        }
                    }
                }

                if (scope === 'all' && fetchedCondos.length > 0) {
                    queryCondoIds = fetchedCondos.map(c => c.id)
                }
                
                setActiveCondoIds(queryCondoIds)

                const { data, error } = await supabase
                    .from('invoices')
                    .select(`
                        id,
                        amount,
                        balance_due,
                        due_date,
                        status,
                        condominiums!inner ( name ),
                        residents!invoices_resident_id_fkey (
                            id,
                            first_name,
                            last_name
                        ),
                        units!invoices_unit_id_fkey (
                            unit_number
                        )
                    `)
                    .in('condominium_id', queryCondoIds)
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

                            let condoStr = ''
                            if (scope === 'all' && inv.condominiums?.name) {
                                condoStr = `${inv.condominiums.name} - `
                            }

                            residentDebts[residentId] = {
                                id: residentId,
                                name: fullName,
                                unit: `${condoStr}Unidad ${inv.units?.unit_number || 'S/N'}`,
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
    }, [condominiumId, scope, supabase])

    return (
        <div className="w-full h-full">
            <DelinquencyReportModal
                isOpen={true}
                onClose={() => {}}
                condominiumIds={activeCondoIds}
                availableCondos={availableCondos}
                onStatsUpdate={onStatsUpdate}
            />
        </div>
    )
}
