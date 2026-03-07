'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, Printer, Building2, MapPin, Mail, Phone, Calendar, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Invoice } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

// Helper to format date
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
        return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
    } catch (e) {
        return dateStr
    }
}

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount)
}

export default function InvoiceDetailPage() {
    const params = useParams()
    const router = useRouter()
    const id = params?.id as string
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!id) return
            try {
                const data = await financeService.getInvoiceById(id)
                if (!data) {
                    // Handle not found
                    return
                }
                setInvoice(data)
            } catch (error) {
                console.error('Error loading invoice:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchInvoice()
    }, [id])

    const handlePrint = () => {
        window.print()
    }

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="text-zinc-400">Cargando factura...</div>
            </div>
        )
    }

    if (!invoice) {
        return (
            <div className="mx-auto max-w-5xl p-6 text-center text-zinc-400">
                <h2 className="text-xl font-bold text-white mb-2">Factura no encontrada</h2>
                <Link href="/dashboard/finance/billing">
                    <Button variant="outline">Volver al historial</Button>
                </Link>
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-6 print:p-0 print:max-w-none">
            {/* Header / Actions - Hidden in Print */}
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/finance/billing" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Detalle de Factura</h1>
                        <p className="text-zinc-400 flex items-center gap-2">
                            {invoice.folio}
                            <Badge variant={
                                invoice.status === 'paid' ? 'success' :
                                    invoice.status === 'overdue' ? 'destructive' :
                                        invoice.status === 'pending' ? 'warning' : 'default'
                            } className="ml-2">
                                {invoice.status === 'paid' ? 'Pagado' :
                                    invoice.status === 'overdue' ? 'Vencido' :
                                        invoice.status === 'pending' ? 'Pendiente' : invoice.status}
                            </Badge>
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handlePrint} className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Download className="mr-2 h-4 w-4" /> Descargar PDF
                    </Button>
                </div>
            </div>

            {/* Invoice Document */}
            <Card className="bg-white text-zinc-900 overflow-hidden shadow-xl print:shadow-none print:border-none">
                <CardContent className="p-0">
                    {/* Header Banner */}
                    <div className="bg-zinc-50 px-8 py-6 border-b border-zinc-100 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            {invoice.condominium_logo_url ? (
                                <img src={invoice.condominium_logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-full bg-white border border-zinc-200" />
                            ) : (
                                <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                    <Building2 size={32} />
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900">{invoice.condominium_name}</h2>
                                <p className="text-zinc-500 text-sm max-w-[250px]">{invoice.condominium_address || 'Dirección no registrada'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <h3 className="text-2xl font-bold text-indigo-600">FACTURA</h3>
                            <p className="text-lg font-medium text-zinc-700">{invoice.folio}</p>
                        </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-12 p-12">
                        {/* Bill To */}
                        <div>
                            <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Facturar a</h4>
                            <div className="space-y-1 text-zinc-700">
                                <p className="font-semibold text-lg text-zinc-900">Unidad {invoice.unit_number || 'General'}</p>
                                <p className="text-zinc-500">Residente / Propietario</p>
                                {/* Add resident name data if available in future */}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500 font-medium">Fecha de Emisión</span>
                                <span className="text-zinc-900 font-semibold">{formatDate(invoice.created_at)}</span>
                            </div>
                            <div className="flex justify-between border-b border-zinc-100 pb-2">
                                <span className="text-zinc-500 font-medium">Fecha de Vencimiento</span>
                                <span className="text-zinc-900 font-semibold">{formatDate(invoice.due_date)}</span>
                            </div>
                            {invoice.paid_at && (
                                <div className="flex justify-between border-b border-zinc-100 pb-2">
                                    <span className="text-emerald-600 font-medium">Fecha de Pago</span>
                                    <span className="text-emerald-700 font-semibold">{formatDate(invoice.paid_at)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="px-12 pb-12">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b-2 border-zinc-100">
                                    <th className="text-left py-4 text-sm font-semibold text-zinc-400 uppercase">Descripción</th>
                                    <th className="text-right py-4 text-sm font-semibold text-zinc-400 uppercase w-32">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                <tr>
                                    <td className="py-6 text-zinc-900 font-medium">
                                        <div className="flex flex-col">
                                            <span>{invoice.description}</span>
                                            <span className="text-zinc-400 text-sm font-normal">Cuota correspondiente al periodo</span>
                                        </div>
                                    </td>
                                    <td className="py-6 text-right text-zinc-900 font-semibold">
                                        {formatCurrency(invoice.amount)}
                                    </td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td className="pt-8 text-right pr-8 text-zinc-500 font-medium">Total</td>
                                    <td className="pt-8 text-right text-2xl font-bold text-indigo-600">
                                        {formatCurrency(invoice.amount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="bg-zinc-50 px-12 py-8 border-t border-zinc-100">
                        <div className="flex items-start gap-4">
                            <CreditCard className="text-zinc-400 mt-1" size={20} />
                            <div>
                                <h4 className="font-semibold text-zinc-900 mb-1">Información de Pago</h4>
                                <p className="text-zinc-500 text-sm mb-2">
                                    Por favor realizar el pago antes de la fecha de vencimiento para evitar cargos por mora.
                                </p>
                                <p className="text-zinc-500 text-sm">
                                    Banco: BBVA Bancomer <br />
                                    CLABE: 012 345 67890123456 7 <br />
                                    Referencia: {invoice.folio}
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
