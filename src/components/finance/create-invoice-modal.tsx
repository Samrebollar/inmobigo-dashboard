import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import { Loader2, Mail, Phone, ChevronRight, Wallet, FilePlus2, CheckCircle2, AlertTriangle, Clock, Send, PiggyBank } from 'lucide-react'
import { residentsService } from '@/services/residents-service'
import { financeService } from '@/services/finance-service'
import { propertiesService } from '@/services/properties-service'
import { Resident } from '@/types/residents'
import { Condominium } from '@/types/properties'
import { format } from 'date-fns'
import { useDemoMode } from '@/hooks/use-demo-mode'
import { demoDb } from '@/utils/demo-db'
import { useUserRole } from '@/hooks/use-user-role'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CreateInvoiceDTO, InvoiceType, ResidentInvoice } from '@/types/finance'

// Mismo mapeo de categorías usadas en el alta de deuda inicial de un residente
// (src/app/actions/resident-actions.ts) — así una Multa o Cuota Extraordinaria
// se guarda con el mismo invoice_type sin importar por dónde se generó.
const CONCEPT_TO_INVOICE_TYPE: Record<string, InvoiceType> = {
    'Multa': 'fine',
    'Cuota Extraordinaria': 'special_assessment',
}

const TYPE_LABEL: Record<string, string> = {
    maintenance: 'Cuota de Mantenimiento',
    initial_balance: 'Saldo inicial',
    fine: 'Multa',
    special_assessment: 'Cuota Extraordinaria',
    manual_payment: 'Cargo manual',
    custom: 'Cargo',
}

const PAYMENT_METHODS = ['Efectivo', 'Transferencia', 'Tarjeta']

// Id del renglón "saldo inicial capturado" (residents.debt_amount sin factura)
const LEGACY_DEBT_ID = '__legacy_debt__'

type Mode = 'cobrar' | 'cargo'

type DebtRow = {
    id: string
    concept: string
    period: string
    dueDate: string
    balance: number
    amount: number
    daysOverdue: number
    invoice?: ResidentInvoice
}

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const todayMx = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

function daysBetween(fromYmd: string, toYmd: string) {
    const a = new Date(`${fromYmd}T12:00:00Z`).getTime()
    const b = new Date(`${toYmd}T12:00:00Z`).getTime()
    return Math.round((b - a) / 86400000)
}

function periodLabel(ymd: string) {
    if (!ymd) return ''
    const d = new Date(`${ymd.slice(0, 10)}T12:00:00Z`)
    const label = d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    return label.charAt(0).toUpperCase() + label.slice(1)
}

interface CreateInvoiceModalProps {
    isOpen: boolean
    onClose: () => void
    condominiumId: string
    organizationId: string
    defaultResident?: Resident // Pre-selected resident
    onSuccess?: () => void
}

export function CreateInvoiceModal({
    isOpen,
    onClose,
    condominiumId: defaultCondominiumId,
    organizationId,
    defaultResident,
    onSuccess
}: CreateInvoiceModalProps) {
    const { isDemo, loading: demoLoading } = useDemoMode()
    const { isPropiedades } = useUserRole()
    const residentLabel = isPropiedades ? 'Inquilino' : 'Residente'
    const baseConcept = isPropiedades ? 'Renta' : 'Cuota de Mantenimiento'

    const [loading, setLoading] = useState(false)
    const [loadingDebts, setLoadingDebts] = useState(false)

    // Data
    const [condominiums, setCondominiums] = useState<Condominium[]>([])
    const [residents, setResidents] = useState<Resident[]>([])
    const [debtRows, setDebtRows] = useState<DebtRow[]>([])

    // Form
    const [mode, setMode] = useState<Mode>('cobrar')
    const [selectedCondoId, setSelectedCondoId] = useState(defaultCondominiumId)
    const [residentId, setResidentId] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('Efectivo')
    const [paymentDate, setPaymentDate] = useState(todayMx())
    const [notes, setNotes] = useState('')

    // Cobrar adeudos
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [amountToCharge, setAmountToCharge] = useState('')
    const [amountEdited, setAmountEdited] = useState(false)
    const [cashReceived, setCashReceived] = useState('')
    const [useCredit, setUseCredit] = useState(true)
    const [residentCredit, setResidentCredit] = useState(0)
    const [sendReceipt, setSendReceipt] = useState(true)

    // Nuevo cargo
    const [charge, setCharge] = useState({
        concept: baseConcept,
        amount: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        paidNow: true,
    })

    const selectedResident = defaultResident || residents.find(r => r.id === residentId)

    // Reinicia el formulario cada vez que se abre
    useEffect(() => {
        if (!isOpen) return
        setNotes('')
        setPaymentMethod('Efectivo')
        setPaymentDate(todayMx())
        setCashReceived('')
        setAmountEdited(false)
        setUseCredit(true)
        setSendReceipt(true)
        setCharge({ concept: baseConcept, amount: '', dueDate: format(new Date(), 'yyyy-MM-dd'), paidNow: true })
        if (defaultResident) {
            if (defaultResident.condominium_id) setSelectedCondoId(defaultResident.condominium_id)
            setResidentId(defaultResident.id)
        } else {
            setResidentId('')
            if (defaultCondominiumId) setSelectedCondoId(defaultCondominiumId)
        }
    }, [isOpen, defaultResident, defaultCondominiumId, baseConcept])

    useEffect(() => {
        if (isOpen && !demoLoading) loadCondominiums()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, organizationId, demoLoading])

    useEffect(() => {
        if (isOpen && selectedCondoId) loadResidents(selectedCondoId)
        else setResidents([])
    }, [isOpen, selectedCondoId])

    // Adeudos del residente elegido: todas sus facturas sin pagar (vencidas,
    // del mes o por vencer), de la más antigua a la más reciente.
    useEffect(() => {
        if (!isOpen) return
        const res = selectedResident
        if (!res) {
            setDebtRows([])
            setSelectedIds(new Set())
            setResidentCredit(0)
            return
        }
        setResidentCredit(Number(res.credit_amount || 0))
        let cancelled = false
        const load = async () => {
            setLoadingDebts(true)
            try {
                const invoices = await financeService.getByResident(res.id)
                const today = todayMx()
                const rows: DebtRow[] = invoices
                    .filter(inv => ['pending', 'overdue', 'partial'].includes(String(inv.status)) && Number(inv.balance_due ?? inv.amount) > 0)
                    .map(inv => {
                        const due = String(inv.due_date || inv.created_at || '').slice(0, 10)
                        const concept = inv.description?.trim() || TYPE_LABEL[inv.invoice_type] || 'Cargo'
                        return {
                            id: inv.id,
                            concept,
                            period: periodLabel(due),
                            dueDate: due,
                            balance: Number(inv.balance_due ?? inv.amount),
                            amount: Number(inv.amount),
                            daysOverdue: due ? Math.max(0, daysBetween(due, today)) : 0,
                            invoice: inv,
                        }
                    })
                    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

                // Saldo inicial capturado a mano sin factura (datos antiguos)
                const legacy = invoices.length === 0 ? Number(res.debt_amount || 0) : 0
                if (legacy > 0) {
                    rows.unshift({ id: LEGACY_DEBT_ID, concept: 'Saldo inicial capturado', period: 'Anterior al alta', dueDate: '', balance: legacy, amount: legacy, daysOverdue: 0 })
                }
                if (cancelled) return
                setDebtRows(rows)
                // Por defecto se seleccionan los vencidos (o todo si no hay vencidos)
                const overdue = rows.filter(r => r.daysOverdue > 0 || r.id === LEGACY_DEBT_ID)
                setSelectedIds(new Set((overdue.length > 0 ? overdue : rows).map(r => r.id)))
                setAmountEdited(false)
                setMode(rows.length > 0 ? 'cobrar' : 'cargo')
            } catch (error) {
                console.error('Error cargando adeudos:', error)
                if (!cancelled) setDebtRows([])
            } finally {
                if (!cancelled) setLoadingDebts(false)
            }
        }
        load()
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, selectedResident?.id])

    const totalDebt = useMemo(() => debtRows.reduce((s, r) => s + r.balance, 0), [debtRows])
    const overdueDebt = useMemo(() => debtRows.filter(r => r.daysOverdue > 0 || r.id === LEGACY_DEBT_ID).reduce((s, r) => s + r.balance, 0), [debtRows])
    const selectedRows = useMemo(() => debtRows.filter(r => selectedIds.has(r.id)), [debtRows, selectedIds])
    const selectedTotal = useMemo(() => selectedRows.reduce((s, r) => s + r.balance, 0), [selectedRows])
    // Recargos por mora incluidos en lo seleccionado (los genera el cron diario)
    const moraSelected = useMemo(() => selectedRows.filter(r => r.concept.startsWith('Recargo por mora')).reduce((s, r) => s + r.balance, 0), [selectedRows])
    // El saldo a favor solo se aplica a facturas reales (no al saldo capturado sin factura)
    const creditEligible = useMemo(() => selectedRows.filter(r => r.id !== LEGACY_DEBT_ID).reduce((s, r) => s + r.balance, 0), [selectedRows])
    const creditToUse = useCredit ? Math.min(residentCredit, creditEligible) : 0
    const dueAfterCredit = Math.max(0, selectedTotal - creditToUse)

    // El monto a cobrar sigue a la selección mientras no se edite a mano
    useEffect(() => {
        if (!amountEdited) setAmountToCharge(dueAfterCredit > 0 ? dueAfterCredit.toFixed(2) : '')
    }, [dueAfterCredit, amountEdited])

    // chargeAmount = dinero que entrega hoy (efectivo/transferencia/tarjeta).
    // Si paga de más, el excedente queda como saldo a favor.
    const chargeAmount = Math.max(0, parseFloat(amountToCharge) || 0)
    const appliedMoney = Math.min(chargeAmount, dueAfterCredit)
    const excess = Math.max(0, Math.round((chargeAmount - dueAfterCredit) * 100) / 100)
    const totalApplied = creditToUse + appliedMoney
    const remainingAfter = Math.max(0, totalDebt - totalApplied)
    const cash = parseFloat(cashReceived) || 0
    const change = paymentMethod === 'Efectivo' && cash > 0 ? cash - chargeAmount : 0

    const toggleRow = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
        setAmountEdited(false)
    }

    const selectPreset = (preset: 'vencido' | 'todo' | 'ninguno') => {
        if (preset === 'ninguno') setSelectedIds(new Set())
        else if (preset === 'todo') setSelectedIds(new Set(debtRows.map(r => r.id)))
        else setSelectedIds(new Set(debtRows.filter(r => r.daysOverdue > 0 || r.id === LEGACY_DEBT_ID).map(r => r.id)))
        setAmountEdited(false)
    }

    const loadCondominiums = async () => {
        try {
            let data = await propertiesService.getByOrganization(organizationId)

            if (isDemo && data.length === 0) {
                const demoItems = demoDb.getProperties()
                data = demoItems.map(d => ({
                    ...d,
                    organization_id: organizationId || 'demo-org'
                })) as Condominium[]
            }

            setCondominiums(data)

            if (defaultCondominiumId && !data.find(c => c.id === defaultCondominiumId)) {
                const specificDemo = demoDb.getProperties().find(p => p.id === defaultCondominiumId)
                if (specificDemo) {
                    setCondominiums(prev => [...prev, specificDemo as Condominium])
                }
            }
        } catch (error) {
            const msg = error instanceof Error ? error.message : ''
            if (!msg.includes('abort')) console.error('Error loading condos:', error)
        }
    }

    const loadResidents = async (condoId: string) => {
        try {
            const data = await residentsService.getByCondominium(condoId)
            setResidents(data)
        } catch (error) {
            const msg = error instanceof Error ? error.message : ''
            if (!msg.includes('abort')) console.error('Error loading residents:', error)
        }
    }

    const condoName = () => condominiums.find(c => c.id === (selectedResident?.condominium_id || selectedCondoId))?.name || 'Condominio'

    const downloadReceipt = (opts: {
        folio: string
        rows: { concept: string, period: string, amount: number }[]
        total: number
        method: string
        remaining: number
        received?: number
        change?: number
    }) => {
        if (!selectedResident) return
        try {
            const doc = new jsPDF()
            doc.setFillColor(79, 70, 229)
            doc.rect(0, 0, 210, 35, 'F')
            doc.setFontSize(22)
            doc.setTextColor(255, 255, 255)
            doc.setFont('helvetica', 'bold')
            doc.text('RECIBO DE PAGO', 14, 22)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Folio: ${opts.folio}`, 145, 16)
            doc.text(`Fecha: ${new Date(`${paymentDate}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC' })}`, 145, 23)

            doc.setFontSize(12)
            doc.setTextColor(40, 40, 40)
            doc.setFont('helvetica', 'bold')
            doc.text(`INFORMACIÓN DEL ${residentLabel.toUpperCase()}`, 14, 50)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(`Nombre: ${selectedResident.first_name} ${selectedResident.last_name}`, 14, 60)
            doc.text(`Unidad: ${selectedResident.unit_number || 'S/N'}`, 14, 66)
            doc.text(`${isPropiedades ? 'Propiedad' : 'Condominio'}: ${condoName()}`, 14, 72)

            doc.setDrawColor(220, 220, 220)
            doc.line(14, 80, 196, 80)

            doc.setFontSize(12)
            doc.setFont('helvetica', 'bold')
            doc.text('DETALLE DEL PAGO', 14, 92)

            autoTable(doc, {
                head: [['Concepto', 'Periodo', 'Monto pagado']],
                body: opts.rows.map(r => [r.concept, r.period || '—', money(r.amount)]),
                startY: 98,
                styles: { fontSize: 10, cellPadding: 4 },
                headStyles: { fillColor: [79, 70, 229] },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                columnStyles: { 2: { halign: 'right' } },
            })

            let y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
            doc.setFontSize(10)
            doc.setTextColor(60, 60, 60)
            doc.setFont('helvetica', 'normal')
            doc.text(`Método de pago: ${opts.method}`, 14, y)
            if (opts.received && opts.received > 0) {
                doc.text(`Efectivo recibido: ${money(opts.received)}`, 14, y + 6)
                doc.text(`Cambio: ${money(Math.max(0, opts.change || 0))}`, 14, y + 12)
            }
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(11)
            doc.text(`Total pagado: ${money(opts.total)}`, 120, y)
            doc.setFontSize(12)
            doc.setTextColor(opts.remaining > 0 ? 244 : 16, opts.remaining > 0 ? 63 : 185, opts.remaining > 0 ? 94 : 129)
            doc.text(`Saldo pendiente: ${money(opts.remaining)}`, 120, y + 8)

            if (notes) {
                y += 24
                doc.setFontSize(10)
                doc.setTextColor(40, 40, 40)
                doc.text('Notas:', 14, y)
                doc.setFont('helvetica', 'normal')
                doc.setTextColor(100, 100, 100)
                doc.text(doc.splitTextToSize(notes, 180), 14, y + 6)
            }

            doc.setFontSize(8)
            doc.setTextColor(150, 150, 150)
            doc.setFont('helvetica', 'normal')
            doc.text('Este documento es un comprobante de operación digital generado por InmobiGo.', 14, 275)
            doc.text('Conserve este recibo para cualquier aclaración futura.', 14, 281)

            doc.save(`Recibo_${selectedResident.last_name}_${opts.folio}.pdf`)
        } catch (pdfError) {
            console.error('Error generating receipt PDF:', pdfError)
            toast.error('El pago se registró, pero no se pudo generar el PDF del recibo.')
        }
    }

    const financeApi = async (payload: Record<string, unknown>) => {
        const condo = selectedResident?.condominium_id || selectedCondoId
        const res = await fetch(`/api/properties/${condo}/finance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Error del servidor')
        return data
    }

    const deliverReceipt = async (opts: { folio: string, items: { concept: string, period: string, amount: number }[], total: number, remaining: number, method: string }) => {
        if (!sendReceipt || !selectedResident || isDemo) return
        try {
            const r = await financeApi({ action: 'send_receipt', residentId: selectedResident.id, ...opts })
            const canales = [r.whatsapp && 'WhatsApp', r.email && 'correo'].filter(Boolean).join(' y ')
            if (canales) toast.success(`Recibo enviado por ${canales}`)
        } catch {
            toast.error('El pago quedó registrado, pero no se pudo enviar el recibo al residente.')
        }
    }

    // ── Cobrar adeudos existentes (no crea cargos nuevos: abona a las facturas) ──
    const handleCollect = async () => {
        if (!selectedResident) return
        if (selectedRows.length === 0 || totalApplied <= 0) {
            toast.error('Selecciona al menos un adeudo y un monto mayor a $0.')
            return
        }
        if (paymentMethod === 'Efectivo' && cash > 0 && cash < chargeAmount) {
            toast.error('El efectivo recibido es menor al monto a cobrar.')
            return
        }

        let creditPool = creditToUse
        let moneyPool = appliedMoney
        const applied: { concept: string, period: string, amount: number }[] = []
        let folio = ''
        const paidAt = paymentDate === todayMx() ? new Date().toISOString() : `${paymentDate}T12:00:00-06:00`

        // Se aplica primero a lo más antiguo de lo seleccionado: saldo a favor y
        // luego el dinero recibido.
        for (const row of selectedRows) {
            let balance = row.balance
            let appliedToRow = 0
            if (row.id === LEGACY_DEBT_ID) {
                const k = Math.min(moneyPool, balance)
                if (k > 0.009) {
                    await residentsService.update(selectedResident.id, { debt_amount: Math.max(0, balance - k) })
                    moneyPool -= k
                    appliedToRow += k
                }
            } else {
                const c = Math.min(creditPool, balance)
                if (c > 0.009) {
                    const { payment } = await financeService.registerPayment(selectedResident.condominium_id, {
                        invoiceId: row.id, amount: Number(c.toFixed(2)), paymentMethod: 'Saldo a favor', notes: notes || undefined, paidAt,
                    })
                    if (!folio && payment?.folio) folio = payment.folio
                    creditPool -= c
                    balance -= c
                    appliedToRow += c
                }
                const k = Math.min(moneyPool, balance)
                if (k > 0.009) {
                    const { payment } = await financeService.registerPayment(selectedResident.condominium_id, {
                        invoiceId: row.id, amount: Number(k.toFixed(2)), paymentMethod, notes: notes || undefined, paidAt,
                    })
                    if (!folio && payment?.folio) folio = payment.folio
                    moneyPool -= k
                    appliedToRow += k
                }
            }
            if (appliedToRow > 0) applied.push({ concept: row.concept, period: row.period, amount: appliedToRow })
            if (creditPool <= 0.009 && moneyPool <= 0.009) break
        }

        // Pagó de más → el excedente queda como saldo a favor
        if (excess > 0) {
            await financeApi({ action: 'add_credit', residentId: selectedResident.id, amount: excess })
            applied.push({ concept: 'Saldo a favor (anticipo)', period: 'Se aplicará a su siguiente cuota', amount: excess })
        }

        const methodLabel = creditToUse > 0
            ? (appliedMoney > 0 || excess > 0 ? `${paymentMethod} + Saldo a favor` : 'Saldo a favor')
            : paymentMethod
        const receiptFolio = folio || `REC-${Date.now().toString().slice(-6)}`
        const receiptTotal = totalApplied + excess

        downloadReceipt({
            folio: receiptFolio,
            rows: applied,
            total: receiptTotal,
            method: methodLabel,
            remaining: remainingAfter,
            received: paymentMethod === 'Efectivo' ? cash : undefined,
            change,
        })
        toast.success(`Pago de ${money(receiptTotal)} registrado`, {
            description: [
                remainingAfter > 0 ? `Saldo pendiente: ${money(remainingAfter)}` : 'El residente quedó al corriente.',
                excess > 0 ? `Nuevo saldo a favor: ${money(residentCredit - creditToUse + excess)}` : '',
            ].filter(Boolean).join(' · '),
        })
        await deliverReceipt({ folio: receiptFolio, items: applied, total: receiptTotal, remaining: remainingAfter, method: methodLabel })
    }

    // ── Nuevo cargo (multa, cuota extraordinaria, etc.) ──
    const handleCreateCharge = async () => {
        if (!selectedResident) return
        const amount = parseFloat(charge.amount)
        if (!amount || amount <= 0) {
            toast.error('Ingresa un monto mayor a $0.')
            return
        }
        const paid = charge.paidNow
        const created = await financeService.create({
            organization_id: organizationId,
            condominium_id: selectedResident.condominium_id || selectedCondoId,
            resident_id: selectedResident.id,
            unit_id: selectedResident.unit_id,
            amount,
            status: paid ? 'paid' : 'pending',
            invoice_type: CONCEPT_TO_INVOICE_TYPE[charge.concept],
            due_date: charge.dueDate,
            description: notes ? `${charge.concept} - ${notes}` : charge.concept,
            payment_method: paid ? paymentMethod : null,
            ...(paid && { paid_at: new Date().toISOString(), paid_amount: amount, balance_due: 0 })
        } as unknown as CreateInvoiceDTO)

        if (paid) {
            downloadReceipt({
                folio: created?.folio || (created?.id ? `FAC-${created.id.substring(0, 8).toUpperCase()}` : `REC-${Date.now().toString().slice(-6)}`),
                rows: [{ concept: charge.concept, period: periodLabel(charge.dueDate), amount }],
                total: amount,
                method: paymentMethod,
                remaining: totalDebt,
                received: paymentMethod === 'Efectivo' ? cash : undefined,
                change: paymentMethod === 'Efectivo' && cash > 0 ? cash - amount : 0,
            })
            toast.success(`Recibo de ${money(amount)} creado y cobrado`)
            await deliverReceipt({
                folio: created?.folio || (created?.id ? `FAC-${created.id.substring(0, 8).toUpperCase()}` : ''),
                items: [{ concept: charge.concept, period: periodLabel(charge.dueDate), amount }],
                total: amount,
                remaining: totalDebt,
                method: paymentMethod,
            })
        } else {
            toast.success(`Cargo de ${money(amount)} creado`, { description: `Vence el ${new Date(`${charge.dueDate}T12:00:00Z`).toLocaleDateString('es-MX', { timeZone: 'UTC' })}` })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedResident) {
            toast.error(`Selecciona un ${residentLabel.toLowerCase()}.`)
            return
        }
        if (!selectedResident.unit_id) {
            toast.error('Unidad no asignada', { description: `El ${residentLabel.toLowerCase()} no tiene una unidad vinculada.` })
            return
        }
        setLoading(true)
        try {
            if (mode === 'cobrar') await handleCollect()
            else await handleCreateCharge()
            if (onSuccess) onSuccess()
            onClose()
        } catch (error) {
            toast.error('No se pudo procesar', { description: error instanceof Error ? error.message : undefined })
        } finally {
            setLoading(false)
        }
    }

    const inputCls = 'w-full bg-slate-900 border border-slate-700/50 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-blue-500/50 shadow-sm'
    const footerTotal = mode === 'cobrar' ? chargeAmount : (parseFloat(charge.amount) || 0)
    const receiptChannels = [selectedResident?.phone && 'WhatsApp', selectedResident?.email && 'correo'].filter(Boolean).join(' y ')
    const showCash = paymentMethod === 'Efectivo' && (mode === 'cobrar' || charge.paidNow)

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Nuevo Recibo" className="max-w-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col h-full max-h-[85vh]">
                <div className="flex-1 overflow-y-auto px-1 pr-3 space-y-5 custom-scrollbar max-h-[62vh]">

                    {/* Residente */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-300">{residentLabel}</label>
                        {defaultResident ? (
                            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30 text-sm">
                                        {defaultResident.first_name?.[0]}{defaultResident.last_name?.[0]}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium text-sm">{defaultResident.first_name} {defaultResident.last_name}</div>
                                        <div className="text-slate-400 text-xs flex items-center gap-3 mt-0.5">
                                            <span className="flex items-center gap-1"><Mail size={10} /> {defaultResident.email}</span>
                                            <span className="flex items-center gap-1"><Phone size={10} /> {defaultResident.phone}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400">
                                    <span className="text-xs font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">{defaultResident.unit_number || 'S/N'}</span>
                                    <ChevronRight size={14} />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">{isPropiedades ? 'Propiedad' : 'Condominio'}</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                        required
                                        value={selectedCondoId}
                                        onChange={(e) => { setSelectedCondoId(e.target.value); setResidentId('') }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {condominiums.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-slate-500">{residentLabel}</label>
                                    <select
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                                        required
                                        value={residentId}
                                        onChange={(e) => setResidentId(e.target.value)}
                                        disabled={!selectedCondoId}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {residents.map(r => (
                                            <option key={r.id} value={r.id}>{r.first_name} {r.last_name} ({r.unit_number})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Resumen de cuenta */}
                    {selectedResident && (
                        loadingDebts ? (
                            <div className="flex items-center gap-2 text-sm text-slate-400 py-2"><Loader2 className="h-4 w-4 animate-spin" /> Consultando estado de cuenta…</div>
                        ) : (
                            <div className={`grid gap-3 ${residentCredit > 0 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                                    <p className="text-[11px] uppercase tracking-wide text-rose-300/80">Vencido</p>
                                    <p className="text-base font-bold text-rose-300">{money(overdueDebt)}</p>
                                </div>
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                                    <p className="text-[11px] uppercase tracking-wide text-amber-300/80">Por vencer</p>
                                    <p className="text-base font-bold text-amber-300">{money(totalDebt - overdueDebt)}</p>
                                </div>
                                <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-3">
                                    <p className="text-[11px] uppercase tracking-wide text-slate-400">Adeudo total</p>
                                    <p className="text-base font-bold text-white">{money(totalDebt)}</p>
                                </div>
                                {residentCredit > 0 && (
                                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                                        <p className="text-[11px] uppercase tracking-wide text-emerald-300/80">Saldo a favor</p>
                                        <p className="text-base font-bold text-emerald-300">{money(residentCredit)}</p>
                                    </div>
                                )}
                            </div>
                        )
                    )}

                    {/* Modo */}
                    {selectedResident && !loadingDebts && (
                        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                            <button type="button" onClick={() => setMode('cobrar')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'cobrar' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'}`}>
                                <Wallet size={15} /> Cobrar adeudos {debtRows.length > 0 && <span className="text-xs opacity-80">({debtRows.length})</span>}
                            </button>
                            <button type="button" onClick={() => setMode('cargo')}
                                className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'cargo' ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30' : 'text-slate-400 hover:text-white'}`}>
                                <FilePlus2 size={15} /> Nuevo cargo
                            </button>
                        </div>
                    )}

                    {/* ── Cobrar adeudos ── */}
                    {selectedResident && !loadingDebts && mode === 'cobrar' && (
                        debtRows.length === 0 ? (
                            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-3">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                <div>
                                    <p className="text-sm font-medium text-emerald-300">Está al corriente</p>
                                    <p className="text-xs text-slate-400">No tiene adeudos pendientes. Usa &quot;Nuevo cargo&quot; para cobrar otro concepto.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-semibold text-slate-300">Selecciona lo que va a pagar</label>
                                    <div className="flex gap-1.5 text-[11px]">
                                        {(['vencido', 'todo', 'ninguno'] as const).map(p => (
                                            <button key={p} type="button" onClick={() => selectPreset(p)}
                                                className="px-2 py-1 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 capitalize">
                                                {p === 'vencido' ? 'Solo vencido' : p === 'todo' ? 'Todo' : 'Ninguno'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="rounded-xl border border-slate-800 divide-y divide-slate-800 overflow-hidden">
                                    {debtRows.map(row => {
                                        const checked = selectedIds.has(row.id)
                                        const overdue = row.daysOverdue > 0 || row.id === LEGACY_DEBT_ID
                                        return (
                                            <label key={row.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${checked ? 'bg-slate-800/60' : 'hover:bg-slate-900'}`}>
                                                <input type="checkbox" checked={checked} onChange={() => toggleRow(row.id)}
                                                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-emerald-500" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white truncate">{row.concept}</p>
                                                    <p className="text-xs text-slate-500">
                                                        {row.period}{row.dueDate && ` · vence ${new Date(`${row.dueDate}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })}`}
                                                    </p>
                                                </div>
                                                {overdue ? (
                                                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20">
                                                        <AlertTriangle size={11} /> {row.id === LEGACY_DEBT_ID ? 'Saldo previo' : `Vencido · ${row.daysOverdue} días`}
                                                    </span>
                                                ) : (
                                                    <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                        <Clock size={11} /> Por vencer
                                                    </span>
                                                )}
                                                <div className="text-right">
                                                    <p className="text-sm font-semibold text-white">{money(row.balance)}</p>
                                                    {row.balance < row.amount && <p className="text-[11px] text-slate-500">de {money(row.amount)}</p>}
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>

                                {residentCredit > 0 && creditEligible > 0 && (
                                    <label className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 cursor-pointer">
                                        <span className="flex items-center gap-2 text-sm text-emerald-200">
                                            <input type="checkbox" checked={useCredit} onChange={(e) => { setUseCredit(e.target.checked); setAmountEdited(false) }}
                                                className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-emerald-500" />
                                            <PiggyBank size={15} /> Usar saldo a favor
                                        </span>
                                        <span className="text-sm font-semibold text-emerald-300">
                                            {useCredit ? `−${money(creditToUse)}` : money(residentCredit)}
                                        </span>
                                    </label>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-300">{creditToUse > 0 ? 'Monto a cobrar (restante)' : 'Monto a cobrar'}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                            <input type="number" step="0.01" min="0"
                                                className={`${inputCls} pl-6 font-medium`}
                                                value={amountToCharge}
                                                onChange={(e) => { setAmountToCharge(e.target.value); setAmountEdited(true) }} />
                                        </div>
                                        {excess > 0 && (
                                            <p className="text-xs text-emerald-400">Paga {money(excess)} de más: quedará como saldo a favor para su siguiente cuota.</p>
                                        )}
                                        {chargeAmount > 0 && chargeAmount < dueAfterCredit - 0.009 && (
                                            <p className="text-xs text-slate-400">Abono parcial: se aplica primero a lo más antiguo.</p>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-semibold text-slate-300">Fecha de pago</label>
                                        <input type="date" max={todayMx()} className={`${inputCls} text-slate-300 [color-scheme:dark]`}
                                            value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    {/* ── Nuevo cargo ── */}
                    {selectedResident && !loadingDebts && mode === 'cargo' && (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-sm font-semibold text-slate-300">Concepto</label>
                                <select className={inputCls} required value={charge.concept}
                                    onChange={(e) => setCharge({ ...charge, concept: e.target.value })}>
                                    <option value={baseConcept}>{baseConcept}</option>
                                    <option value="Multa">Multa</option>
                                    <option value="Cuota Extraordinaria">Cuota Extraordinaria</option>
                                    <option value="Reserva Amenidad">Reserva Amenidad</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-300">Monto</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                                        <input type="number" step="0.01" min="0" placeholder="0.00" className={`${inputCls} pl-6 font-medium`} required
                                            value={charge.amount} onChange={(e) => setCharge({ ...charge, amount: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-semibold text-slate-300">Fecha de vencimiento</label>
                                    <input type="date" className={`${inputCls} text-slate-300 [color-scheme:dark]`} required
                                        value={charge.dueDate} onChange={(e) => setCharge({ ...charge, dueDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800 text-sm">
                                <button type="button" onClick={() => setCharge({ ...charge, paidNow: true })}
                                    className={`py-2 rounded-lg font-medium ${charge.paidNow ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                                    Lo paga ahora
                                </button>
                                <button type="button" onClick={() => setCharge({ ...charge, paidNow: false })}
                                    className={`py-2 rounded-lg font-medium ${!charge.paidNow ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
                                    Dejar pendiente
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Notas */}
                    {selectedResident && !loadingDebts && (
                        <div className="space-y-1">
                            <label className="text-sm font-semibold text-slate-300">Notas <span className="text-slate-500 font-normal">(opcional)</span></label>
                            <textarea
                                className={`${inputCls} min-h-[64px] resize-none placeholder:text-slate-600`}
                                placeholder="Ej. Pagó en caja de administración"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                {/* Resumen */}
                <div className="bg-slate-950/50 rounded-xl p-4 space-y-3 border border-slate-800 mt-4 shrink-0">
                    {(mode === 'cobrar' || charge.paidNow) && (
                        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                            <span className="text-slate-400">Método de pago</span>
                            <div className="flex gap-1">
                                {PAYMENT_METHODS.map(m => (
                                    <button key={m} type="button" onClick={() => setPaymentMethod(m)}
                                        className={`px-3 py-1 rounded-md text-xs border transition-colors ${paymentMethod === m ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'border-slate-800 text-slate-400 hover:text-white'}`}>
                                        {m}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {showCash && footerTotal > 0 && (
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="text-slate-400">Efectivo recibido</span>
                            <div className="flex items-center gap-3">
                                <div className="relative w-32">
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs">$</span>
                                    <input type="number" step="0.01" min="0" placeholder={footerTotal.toFixed(2)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-md py-1 pl-5 pr-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                                        value={cashReceived} onChange={(e) => setCashReceived(e.target.value)} />
                                </div>
                                {cash > 0 && (
                                    <span className={`text-xs font-medium ${cash - footerTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {cash - footerTotal >= 0 ? `Cambio ${money(cash - footerTotal)}` : `Faltan ${money(footerTotal - cash)}`}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                    {mode === 'cobrar' && moraSelected > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400 flex items-center gap-1.5"><AlertTriangle size={13} className="text-rose-400" /> Incluye recargos por mora</span>
                            <span className="font-medium text-rose-300">{money(moraSelected)}</span>
                        </div>
                    )}
                    {mode === 'cobrar' && creditToUse > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Saldo a favor aplicado</span>
                            <span className="font-medium text-emerald-300">−{money(creditToUse)}</span>
                        </div>
                    )}
                    {mode === 'cobrar' && selectedResident && debtRows.length > 0 && (
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-400">Saldo después del pago</span>
                            <span className={`font-medium ${remainingAfter > 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{money(remainingAfter)}</span>
                        </div>
                    )}
                    <div className="border-t border-slate-800 pt-3 flex justify-between items-center">
                        <span className="text-slate-200 font-semibold">{mode === 'cobrar' ? `Total a cobrar${selectedRows.length ? ` (${selectedRows.length})` : ''}` : 'Total'}</span>
                        <span className="text-white font-bold text-lg">{money(footerTotal)}</span>
                    </div>

                    {selectedResident && (mode === 'cobrar' ? debtRows.length > 0 : charge.paidNow) && (
                        <label className={`flex items-center justify-between gap-3 text-sm ${receiptChannels ? 'cursor-pointer' : 'opacity-60'}`}>
                            <span className="flex items-center gap-2 text-slate-300">
                                <input type="checkbox" checked={sendReceipt && Boolean(receiptChannels)} disabled={!receiptChannels}
                                    onChange={(e) => setSendReceipt(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 accent-emerald-500" />
                                <Send size={14} className="text-emerald-400" /> Enviar recibo al {residentLabel.toLowerCase()}
                            </span>
                            <span className="text-xs text-slate-500">{receiptChannels ? `por ${receiptChannels}` : 'sin teléfono ni correo'}</span>
                        </label>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700">
                            Cancelar
                        </button>
                        <button type="submit"
                            disabled={loading || !selectedResident || loadingDebts || (mode === 'cobrar' && (selectedRows.length === 0 || totalApplied <= 0))}
                            className={`flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg shadow-lg transition-all disabled:opacity-50 ${mode === 'cobrar' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}>
                            {loading && <Loader2 className="animate-spin h-4 w-4" />}
                            {mode === 'cobrar' ? (chargeAmount > 0 ? `Cobrar ${money(chargeAmount)}` : `Aplicar ${money(creditToUse)} de saldo a favor`) : (charge.paidNow ? 'Crear y cobrar' : 'Crear cargo')}
                        </button>
                    </div>
                </div>
            </form>
        </Modal>
    )
}
