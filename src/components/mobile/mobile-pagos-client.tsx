'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import {
    Bell,
    User,
    Wallet,
    Download,
    Receipt,
    ChevronRight,
    CheckCircle2,
    Clock,
    Loader2,
} from 'lucide-react'
import { createResidentPaymentCheckout } from '@/app/actions/mercadopago-payment-actions'
import { generateReceiptForResident } from '@/components/residente/resident-payments-client'

interface HistoryItem {
    id: string
    concept: string
    amount: number
    date: string
    status: 'paid' | 'pending' | 'overdue'
    folio: string | null
    paymentMethod: string | null
}

export default function MobilePagosClient({
    avatarUrl,
    saldoPendiente,
    proximoPagoFecha,
    diasParaVencer,
    history,
    years,
    mpConnected,
    residentName,
    condoName,
    unitNumber,
}: {
    avatarUrl?: string | null
    saldoPendiente: number
    proximoPagoFecha: string | null
    diasParaVencer: number | null
    history: HistoryItem[]
    years: number[]
    mpConnected: boolean
    residentName: string
    condoName: string
    unitNumber?: string | null
}) {
    const router = useRouter()
    const [selectedYear, setSelectedYear] = useState(years[0])
    const [isCheckingOut, setIsCheckingOut] = useState(false)

    const filteredHistory = useMemo(
        () => history.filter((h) => new Date(h.date).getFullYear() === selectedYear),
        [history, selectedYear]
    )

    const mostRecentPaid = useMemo(() => history.find((h) => h.status === 'paid'), [history])

    const handlePagarAhora = async () => {
        setIsCheckingOut(true)
        try {
            if (!mpConnected) {
                router.push('/residente/subir-comprobante')
                return
            }
            const result = await createResidentPaymentCheckout()
            if (result.success && result.checkoutUrl) {
                window.location.href = result.checkoutUrl
            } else {
                toast.error(result.message || 'No se pudo iniciar el pago.')
                setIsCheckingOut(false)
            }
        } catch (e) {
            toast.error('No se pudo iniciar el pago.')
            setIsCheckingOut(false)
        }
    }

    const handleDescargarPdf = () => {
        if (!mostRecentPaid) {
            toast.info('Todavía no tienes ningún recibo disponible para descargar.')
            return
        }
        generateReceiptForResident(
            {
                folio: mostRecentPaid.folio,
                concept: mostRecentPaid.concept,
                amount: mostRecentPaid.amount,
                payment_method: mostRecentPaid.paymentMethod,
                date: format(new Date(mostRecentPaid.date), "d 'de' MMMM, yyyy", { locale: es }),
            },
            residentName,
            condoName,
            unitNumber || undefined
        )
    }

    const isOverdue = diasParaVencer !== null && diasParaVencer < 0

    return (
        <div className="mx-auto max-w-[480px]">
            <header className="sticky top-0 z-30 flex items-center justify-between bg-[rgba(248,249,250,0.9)] px-5 py-4 backdrop-blur-[6px]">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d5e0f8]">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                            <User size={18} className="text-[#004AC6]" />
                        )}
                    </div>
                    <h1 className="text-[20px] font-semibold leading-[28px] text-[#004AC6]">Pagos</h1>
                </div>
                <Link
                    href="/mobile/avisos"
                    className="flex h-10 w-10 items-center justify-center rounded-full"
                >
                    <Bell size={18} className="text-[#191C1D]" />
                </Link>
            </header>

            <main className="flex flex-col gap-6 px-5 pb-8 pt-4">
                <section className="relative w-full overflow-hidden rounded-[20px] border border-[#c3c6d7] bg-white p-[25px] shadow-[0px_4px_20px_rgba(0,0,0,0.03)]">
                    <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[rgba(0,74,198,0.05)] blur-[32px]" />

                    <p className="text-[12px] font-semibold uppercase tracking-[0.6px] text-[#545f73]">
                        Saldo total pendiente
                    </p>
                    <p className="mt-1 text-[32px] font-bold leading-[40px] tracking-[-0.64px] text-[#191C1D]">
                        ${saldoPendiente.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>

                    {saldoPendiente > 0 && diasParaVencer !== null && (
                        <div className="mt-1 flex items-center gap-1">
                            <Clock size={13} className={isOverdue ? 'text-[#ba1a1a]' : 'text-[#b45309]'} />
                            <span className={`text-[14px] ${isOverdue ? 'text-[#ba1a1a]' : 'text-[#b45309]'}`}>
                                {isOverdue
                                    ? `Vencido hace ${Math.abs(diasParaVencer)} día${Math.abs(diasParaVencer) === 1 ? '' : 's'}`
                                    : `Vence en ${diasParaVencer} día${diasParaVencer === 1 ? '' : 's'}`}
                            </span>
                        </div>
                    )}

                    <div className="mt-7 flex flex-col gap-2">
                        {saldoPendiente > 0 ? (
                            <button
                                onClick={handlePagarAhora}
                                disabled={isCheckingOut}
                                className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#004AC6] text-[16px] text-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)] disabled:opacity-60"
                            >
                                {isCheckingOut ? (
                                    <Loader2 size={18} className="animate-spin" />
                                ) : (
                                    <>
                                        <Wallet size={18} />
                                        Pagar ahora
                                    </>
                                )}
                            </button>
                        ) : (
                            <div className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#f0fdf4] text-[14px] font-semibold text-[#166534]">
                                <CheckCircle2 size={18} />
                                Estás al corriente
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button
                                onClick={handleDescargarPdf}
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#d5e0f8] px-2 text-[12px] font-semibold tracking-[0.24px] text-[#586377]"
                            >
                                <Download size={14} />
                                Descargar PDF
                            </button>
                            <Link
                                href="/residente/subir-comprobante"
                                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#d5e0f8] px-2 text-[12px] font-semibold tracking-[0.24px] text-[#586377]"
                            >
                                <Receipt size={14} />
                                Comprobante
                            </Link>
                        </div>
                    </div>
                </section>

                <Link
                    href="/residente/payments"
                    className="flex w-full items-center justify-between rounded-[20px] bg-[#f3f4f5] p-4"
                >
                    <div className="flex items-center gap-4">
                        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e1e3e4]">
                            <Receipt size={18} className="text-[#434655]" />
                        </span>
                        <div className="flex flex-col">
                            <p className="text-[12px] font-semibold tracking-[0.24px] text-[#191C1D]">Estado de Cuenta</p>
                            <p className="text-[11px] font-medium text-[#434655]">Revisar detalle de movimientos</p>
                        </div>
                    </div>
                    <ChevronRight size={16} className="text-[#434655]" />
                </Link>

                <section className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[20px] font-semibold text-[#191C1D]">Historial</h2>
                        <Link href="/residente/payments" className="text-[12px] font-semibold tracking-[0.24px] text-[#004AC6]">
                            Ver todo
                        </Link>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {years.map((year) => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`shrink-0 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.24px] ${
                                    selectedYear === year ? 'bg-[#2563eb] text-[#eeefff]' : 'bg-[#e7e8e9] text-[#434655]'
                                }`}
                            >
                                {year}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-4 pb-6">
                        {filteredHistory.length === 0 ? (
                            <div className="rounded-[20px] border border-[#c3c6d7] bg-white p-6 text-center text-[12px] text-[rgba(67,70,85,0.6)]">
                                Sin movimientos en {selectedYear}.
                            </div>
                        ) : (
                            filteredHistory.map((item) => {
                                const isPaid = item.status === 'paid'
                                const isOverdueItem = item.status === 'overdue'
                                return (
                                    <div
                                        key={item.id}
                                        className="flex w-full items-center justify-between rounded-[20px] border border-[#c3c6d7] bg-white p-[17px]"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span
                                                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                                                    isPaid ? 'bg-[#f0fdf4]' : isOverdueItem ? 'bg-[#fff1f0]' : 'bg-[#fffbeb]'
                                                }`}
                                            >
                                                {isPaid ? (
                                                    <CheckCircle2 size={20} className="text-[#16a34a]" />
                                                ) : (
                                                    <Clock size={20} className={isOverdueItem ? 'text-[#ba1a1a]' : 'text-[#b45309]'} />
                                                )}
                                            </span>
                                            <div className="flex flex-col">
                                                <p className="text-[14px] text-[#191C1D]">{item.concept}</p>
                                                <p className="text-[11px] font-medium text-[#434655]">
                                                    {format(new Date(item.date), "d MMM, yyyy", { locale: es })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-[5px]">
                                            <p className="text-[16px] text-[#191C1D]">
                                                ${item.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </p>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[-0.5px] ${
                                                    isPaid
                                                        ? 'bg-[#dcfce7] text-[#15803d]'
                                                        : isOverdueItem
                                                        ? 'bg-[#ffdad6] text-[#93000a]'
                                                        : 'bg-[#fef3c7] text-[#b45309]'
                                                }`}
                                            >
                                                {isPaid ? 'Pagado' : isOverdueItem ? 'Vencido' : 'Pendiente'}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </section>
            </main>
        </div>
    )
}
