'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Calendar, DollarSign, CreditCard, FileText, Loader2, CheckCircle2 } from 'lucide-react'
import { financeService } from '@/services/finance-service'
import { ResidentInvoice, ResidentInvoicePayment } from '@/types/finance'

interface RegisterPaymentModalProps {
    isOpen: boolean
    onClose: () => void
    condominiumId: string
    invoice: ResidentInvoice | null
    onSuccess?: (result: { payment: ResidentInvoicePayment; invoice: ResidentInvoice }) => void
}

export function RegisterPaymentModal({ isOpen, onClose, condominiumId, invoice, onSuccess }: RegisterPaymentModalProps) {
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState('Efectivo')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)

    const balanceDue = invoice ? Number(invoice.balance_due ?? invoice.amount) : 0

    useEffect(() => {
        if (isOpen && invoice) {
            setAmount(balanceDue > 0 ? balanceDue.toString() : '')
            setMethod('Efectivo')
            setDate(new Date().toISOString().split('T')[0])
            setNotes('')
        }
    }, [isOpen, invoice?.id])

    if (!invoice) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const parsedAmount = parseFloat(amount)

        if (!parsedAmount || parsedAmount <= 0) {
            toast.error('Ingresa un monto válido')
            return
        }
        if (parsedAmount > balanceDue + 0.01) {
            toast.error(`El monto no puede exceder el saldo pendiente ($${balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })})`)
            return
        }

        setLoading(true)
        try {
            const result = await financeService.registerPayment(condominiumId, {
                invoiceId: invoice.id,
                amount: parsedAmount,
                paymentMethod: method,
                notes: notes || undefined,
                paidAt: new Date(`${date}T12:00:00`).toISOString(),
            })

            const isFullyPaid = result.invoice.status === 'paid'
            toast.success(
                isFullyPaid
                    ? `Pago registrado — recibo ${result.payment.folio}. Factura liquidada.`
                    : `Abono registrado — recibo ${result.payment.folio}. Saldo restante: $${Number(result.invoice.balance_due).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
            )

            onSuccess?.(result)
            onClose()
        } catch (error: any) {
            toast.error(error.message || 'Error al registrar el pago')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Registrar Pago">
            <form onSubmit={handleSubmit} className="space-y-4">

                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-1">
                    <p className="text-xs text-zinc-400 flex items-center gap-2">
                        <FileText size={12} /> {invoice.folio} · {invoice.description || 'Cuota de mantenimiento'}
                    </p>
                    <p className="text-sm flex justify-between">
                        <span className="text-zinc-400">Saldo Pendiente:</span>
                        <span className="font-bold text-amber-400">
                            ${balanceDue.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </span>
                    </p>
                </div>

                {/* Amount */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Monto Recibido</label>
                    <div className="relative group">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-emerald-400" />
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max={balanceDue}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </div>
                    {parseFloat(amount) > 0 && parseFloat(amount) < balanceDue && (
                        <p className="text-xs text-zinc-500">
                            Es un abono parcial. Saldo restante: ${(balanceDue - parseFloat(amount)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        </p>
                    )}
                </div>

                {/* Payment Method */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Método de Pago</label>
                    <div className="relative group">
                        <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500 group-focus-within:text-indigo-400" />
                        <select
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 appearance-none"
                            required
                            value={method}
                            onChange={(e) => setMethod(e.target.value)}
                        >
                            <option value="Efectivo">Efectivo</option>
                            <option value="Transferencia">Transferencia</option>
                            <option value="Cheque">Cheque</option>
                            <option value="Tarjeta">Tarjeta Crédito/Débito</option>
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
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-400">Notas <span className="text-zinc-600">(opcional)</span></label>
                    <input
                        type="text"
                        placeholder="Ej. Referencia SPEI, quien recibió, etc."
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-lg py-2 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Registrar Pago
                    </button>
                </div>
            </form>
        </Modal>
    )
}
