'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Calendar, DollarSign, CreditCard, Hash, CheckCircle2 } from 'lucide-react'

interface RegisterPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    invoiceId?: string
    amountDue?: number
    onSubmit: (data: any) => void
}

export function RegisterPaymentModal({ isOpen, onClose, invoiceId, amountDue, onSubmit }: RegisterPaymentModalProps) {
    const [formData, setFormData] = useState({
        amount: amountDue?.toString() || '',
        date: new Date().toISOString().split('T')[0],
        method: 'transfer',
        reference: ''
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({ ...formData, invoiceId })
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago">
            <form onSubmit={handleSubmit} className="space-y-4">

                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">
                    <p className="text-xs text-emerald-400 flex justify-between">
                        <span>Saldo Pendiente:</span>
                        <span className="font-bold">${amountDue?.toLocaleString()}</span>
                    </p>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Monto Recibido</label>
                    <div className="relative group">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400" />
                        <input
                            type="number"
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                            required
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Método de Pago</label>
                    <div className="relative group">
                        <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400" />
                        <select
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none"
                            required
                            value={formData.method}
                            onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                        >
                            <option value="transfer">Transferencia</option>
                            <option value="cash">Efectivo</option>
                            <option value="check">Cheque</option>
                            <option value="card">Tarjeta Crédito/Débito</option>
                        </select>
                    </div>
                </div>

                {/* Date */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Fecha de Pago</label>
                    <div className="relative group">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400" />
                        <input
                            type="date"
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 [color-scheme:dark]"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                </div>

                {/* Reference */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Referencia / Comprobante</label>
                    <div className="relative group">
                        <Hash className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400" />
                        <input
                            type="text"
                            placeholder="Ej. SPEI-12345"
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                            value={formData.reference}
                            onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                        />
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                        <CheckCircle2 size={16} />
                        Registrar Ingreso
                    </button>
                </div>
            </form>
        </Modal>
    )
}

