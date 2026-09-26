'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Loader2, AlertTriangle, ArrowLeft, Users } from 'lucide-react'
import { residentsService } from '@/services/residents-service'
import { financeService } from '@/services/finance-service'
import { Resident } from '@/types/residents'
import { InvoiceType } from '@/types/finance'
import { format } from 'date-fns'

interface BulkChargeModalProps {
    isOpen: boolean
    onClose: () => void
    condominiumId: string
    organizationId: string
    condominiumList: { id: string; name: string }[]
    onSuccess?: () => void
}

const CONCEPTS: { value: string; invoiceType: InvoiceType }[] = [
    { value: 'Multa', invoiceType: 'fine' },
    { value: 'Cuota Extraordinaria', invoiceType: 'special_assessment' },
    { value: 'Otro', invoiceType: 'custom' },
]

interface ChargeRow {
    resident: Resident
    selected: boolean
    amount: string
}

export function BulkChargeModal({
    isOpen,
    onClose,
    condominiumId: defaultCondominiumId,
    organizationId,
    condominiumList,
    onSuccess,
}: BulkChargeModalProps) {
    const [step, setStep] = useState<'form' | 'confirm'>('form')
    const [loadingResidents, setLoadingResidents] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const [condoId, setCondoId] = useState(defaultCondominiumId)
    const [concept, setConcept] = useState('Multa')
    const [defaultAmount, setDefaultAmount] = useState('')
    const [dueDate, setDueDate] = useState(format(new Date(), 'yyyy-MM-dd'))
    const [notes, setNotes] = useState('')
    const [rows, setRows] = useState<ChargeRow[]>([])

    useEffect(() => {
        if (isOpen) {
            setStep('form')
            setCondoId(defaultCondominiumId)
            setConcept('Multa')
            setDefaultAmount('')
            setDueDate(format(new Date(), 'yyyy-MM-dd'))
            setNotes('')
            setRows([])
        }
    }, [isOpen, defaultCondominiumId])

    useEffect(() => {
        if (!isOpen || !condoId) return
        setLoadingResidents(true)
        residentsService.getByCondominium(condoId)
            .then(residents => {
                const active = residents.filter(r => r.status !== 'inactive')
                setRows(active.map(r => ({ resident: r, selected: true, amount: '' })))
            })
            .catch(() => toast.error('Error al cargar los residentes de la privada.'))
            .finally(() => setLoadingResidents(false))
    }, [isOpen, condoId])

    const applyDefaultToSelected = () => {
        if (!defaultAmount || parseFloat(defaultAmount) <= 0) {
            toast.error('Ingresa primero un monto por defecto válido.')
            return
        }
        setRows(prev => prev.map(row => row.selected ? { ...row, amount: defaultAmount } : row))
        toast.success('Monto aplicado a los residentes seleccionados.')
    }

    const toggleRow = (residentId: string) => {
        setRows(prev => prev.map(row => row.resident.id === residentId ? { ...row, selected: !row.selected } : row))
    }

    const updateRowAmount = (residentId: string, amount: string) => {
        setRows(prev => prev.map(row => row.resident.id === residentId ? { ...row, amount } : row))
    }

    const selectedRows = rows.filter(r => r.selected && parseFloat(r.amount) > 0)
    const totalAmount = selectedRows.reduce((acc, r) => acc + parseFloat(r.amount), 0)
    const condoName = condominiumList.find(c => c.id === condoId)?.name || 'la privada'

    const goToConfirm = () => {
        if (selectedRows.length === 0) {
            toast.error('Selecciona al menos un residente con un monto válido.')
            return
        }
        if (!dueDate) {
            toast.error('Selecciona una fecha límite de pago.')
            return
        }
        setStep('confirm')
    }

    const handleConfirm = async () => {
        setSubmitting(true)
        const invoiceType = CONCEPTS.find(c => c.value === concept)?.invoiceType
        const description = notes ? `${concept} - ${notes}` : concept

        const results = await Promise.allSettled(
            selectedRows.map(row =>
                financeService.create({
                    organization_id: organizationId,
                    condominium_id: condoId,
                    resident_id: row.resident.id,
                    amount: parseFloat(row.amount),
                    status: 'pending',
                    invoice_type: invoiceType,
                    due_date: dueDate,
                    description,
                } as any)
            )
        )

        const failed = results.filter(r => r.status === 'rejected').length
        const succeeded = results.length - failed

        if (succeeded > 0) {
            toast.success(`Se generaron ${succeeded} cargo${succeeded === 1 ? '' : 's'} por un total de $${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}.`)
        }
        if (failed > 0) {
            toast.error(`${failed} cargo${failed === 1 ? '' : 's'} no se pudieron generar. Intenta de nuevo.`)
        }

        setSubmitting(false)
        if (succeeded > 0) {
            if (onSuccess) onSuccess()
            onClose()
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={step === 'form' ? 'Cargo Extraordinario' : 'Confirmar Cargo Masivo'} className="max-w-2xl">
            {step === 'form' ? (
                <div className="flex flex-col h-full max-h-[85vh]">
                    <div className="flex-1 overflow-y-auto px-1 pr-3 space-y-5 custom-scrollbar max-h-[65vh]">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">Privada</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    value={condoId}
                                    onChange={(e) => setCondoId(e.target.value)}
                                >
                                    <option value="">Selecciona...</option>
                                    {condominiumList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">Concepto</label>
                                <select
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                    value={concept}
                                    onChange={(e) => setConcept(e.target.value)}
                                >
                                    {CONCEPTS.map(c => <option key={c.value} value={c.value}>{c.value}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">Monto por defecto</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                        <input
                                            type="number"
                                            value={defaultAmount}
                                            onChange={(e) => setDefaultAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 pl-6 pr-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={applyDefaultToSelected}
                                        className="text-xs font-medium text-indigo-400 hover:text-indigo-300 px-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all whitespace-nowrap"
                                    >
                                        Aplicar a todos
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-slate-500">Fecha límite de pago</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-slate-300 focus:outline-none focus:border-indigo-500/50 [color-scheme:dark]"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-medium text-slate-500">Notas <span className="text-slate-600">(opcional)</span></label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Motivo del cargo..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 min-h-[60px] resize-none placeholder:text-slate-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <Users size={14} />
                                    Residentes de {condoName}
                                </label>
                                <span className="text-xs text-slate-500">{selectedRows.length} de {rows.length} seleccionados</span>
                            </div>

                            {loadingResidents ? (
                                <div className="flex items-center justify-center py-8 text-slate-500 text-sm gap-2">
                                    <Loader2 size={16} className="animate-spin" /> Cargando residentes...
                                </div>
                            ) : rows.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 text-sm">No hay residentes activos en esta privada.</div>
                            ) : (
                                <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/70 max-h-[240px] overflow-y-auto custom-scrollbar">
                                    {rows.map(row => (
                                        <div key={row.resident.id} className="flex items-center gap-3 px-3 py-2.5">
                                            <input
                                                type="checkbox"
                                                checked={row.selected}
                                                onChange={() => toggleRow(row.resident.id)}
                                                className="w-4 h-4 rounded accent-indigo-500 cursor-pointer"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium truncate">
                                                    {row.resident.first_name} {row.resident.last_name}
                                                </p>
                                                <p className="text-[11px] text-slate-500">{row.resident.unit_number || 'S/N'}</p>
                                            </div>
                                            <div className="relative w-28">
                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                                <input
                                                    type="number"
                                                    value={row.amount}
                                                    disabled={!row.selected}
                                                    onChange={(e) => updateRowAmount(row.resident.id, e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-6 pr-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 disabled:opacity-40"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 mt-4 shrink-0 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Total a cobrar ({selectedRows.length} residentes)</span>
                            <span className="text-white font-bold text-lg">${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={goToConfirm}
                                className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-500 shadow-lg shadow-amber-600/20 transition-all"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                        <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-200">
                            Vas a generar <span className="font-bold">{selectedRows.length} cargo{selectedRows.length === 1 ? '' : 's'}</span> de <span className="font-bold">{concept}</span> en <span className="font-bold">{condoName}</span> por un total de <span className="font-bold">${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>. Cada residente verá este cargo en su recibo dentro de la app. Esta acción no se puede deshacer en bloque.
                        </p>
                    </div>

                    <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/70 max-h-[280px] overflow-y-auto custom-scrollbar">
                        {selectedRows.map(row => (
                            <div key={row.resident.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                                <span className="text-slate-300">{row.resident.first_name} {row.resident.last_name} <span className="text-slate-500">({row.resident.unit_number || 'S/N'})</span></span>
                                <span className="text-white font-medium">${parseFloat(row.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-between gap-3">
                        <button
                            type="button"
                            onClick={() => setStep('form')}
                            disabled={submitting}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <ArrowLeft size={14} /> Volver
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={submitting}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-500 shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
                        >
                            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                            Confirmar y Generar Cargos
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    )
}
