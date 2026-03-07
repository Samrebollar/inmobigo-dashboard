'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Search, Filter, Download, FileText, ArrowLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { Invoice } from '@/types/finance'
import { financeService } from '@/services/finance-service'
import { differenceInDays, parseISO, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Eye, Pencil, CreditCard, Trash2, MoreHorizontal } from 'lucide-react'
import { useDemoMode } from '@/hooks/use-demo-mode'
// DropdownMenu imports removed as component is missing

// Helper to format date
const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    try {
        return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: es })
    } catch (e) {
        return dateStr
    }
}

export default function BillingPage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const { checkAction, isDemo, loading: demoLoading } = useDemoMode()

    useEffect(() => {
        if (!demoLoading) {
            fetchGlobalInvoices()
        }
    }, [demoLoading, isDemo])

    const fetchGlobalInvoices = async () => {
        try {
            setLoading(true)
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                if (isDemo) {
                    const data = await financeService.getGlobalInvoices('demo-org-id')
                    setInvoices(data)
                }
                setLoading(false)
                return
            }

            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('organization_id')
                .eq('user_id', user.id)
                .maybeSingle()

            let data: Invoice[] = []
            if (orgUser) {
                data = await financeService.getGlobalInvoices(orgUser.organization_id)
            }

            if (isDemo && data.length === 0) {
                data = await financeService.getGlobalInvoices('demo-org-id')
            }
            setInvoices(data)
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    // Actions Handlers
    const handleDelete = async (id: string) => {
        checkAction(async () => {
            if (!confirm('¿Estás seguro de que quieres eliminar esta factura?')) return
            try {
                // await financeService.delete(id) // Assuming modify financeService later
                alert('Función de eliminar en desarrollo')
            } catch (error) {
                alert('Error al eliminar')
            }
        })
    }

    const handleDownloadPDF = (id: string) => {
        alert('Generando PDF... (Simulación)')
    }

    const handleRegisterPayment = (id: string) => {
        checkAction(() => alert('Abrir modal de pago... (Simulación)'))
    }

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch =
            inv.folio.toLowerCase().includes(search.toLowerCase()) ||
            (inv.condominium_name || '').toLowerCase().includes(search.toLowerCase()) ||
            (inv.unit_number || '').toLowerCase().includes(search.toLowerCase())

        const matchesStatus = statusFilter === 'all' || inv.status === statusFilter

        return matchesSearch && matchesStatus
    })

    const totalAmount = filteredInvoices.reduce((acc, inv) => acc + inv.amount, 0)

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/finance" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white">Historial de Facturación</h1>
                    <p className="text-zinc-400">Registro global de todas las facturas emitidas.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                        <Input
                            placeholder="Buscar por folio, condominio o unidad..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-zinc-900 border-zinc-800 focus:border-indigo-500"
                        />
                    </div>
                    <select
                        className="h-10 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-white focus:border-indigo-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="paid">Pagado</option>
                        <option value="pending">Pendiente</option>
                        <option value="overdue">Vencido</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                </div>
                <div className="flex gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 rounded-md border border-zinc-800">
                        <span className="text-sm text-zinc-400">Total en vista:</span>
                        <span className="font-medium text-white">${totalAmount.toLocaleString()}</span>
                    </div>
                    <Button variant="outline" className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800">
                        <Download className="mr-2 h-4 w-4" /> Exportar
                    </Button>
                </div>
            </div>

            {/* Table */}
            <Card className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto min-h-[400px]">
                    <div className="inline-block min-w-full align-middle">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-zinc-950/50 text-zinc-400 border-b border-zinc-800">
                                <tr>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Folio</th>
                                    <th className="px-6 py-4 font-medium min-w-[150px]">Condominio</th>
                                    <th className="px-6 py-4 font-medium min-w-[100px]">Unidad</th>
                                    <th className="px-6 py-4 font-medium min-w-[250px]">Concepto</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Vencimiento</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Creación</th>
                                    {/* Removed 'Pagado' column */}
                                    <th className="px-6 py-4 font-medium text-center min-w-[120px]">Días Venc.</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Monto</th>
                                    <th className="px-6 py-4 font-medium min-w-[120px]">Estado</th>
                                    <th className="px-6 py-4 font-medium text-center min-w-[150px]">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {loading ? (
                                    [...Array(5)].map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={10} className="px-6 py-4">
                                                <div className="h-4 bg-zinc-800/50 rounded animate-pulse" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredInvoices.length > 0 ? (
                                    filteredInvoices.map((inv) => {
                                        const daysOverdue = (inv.status === 'overdue' || (inv.status === 'pending' && new Date() > new Date(inv.due_date)))
                                            ? differenceInDays(new Date(), parseISO(inv.due_date))
                                            : 0

                                        return (
                                            <tr key={inv.id} className="group hover:bg-zinc-800/30 transition-colors">
                                                <td className="px-6 py-4 font-medium text-white min-w-[120px]">
                                                    {inv.folio}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-300 min-w-[150px]">
                                                    {inv.condominium_name}
                                                </td>
                                                <td className="px-6 py-4 min-w-[100px]">
                                                    <Badge variant="default" className="text-zinc-400 border-zinc-700 bg-zinc-800/50">
                                                        {inv.unit_number || 'N/A'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-zinc-300 min-w-[250px]" title={inv.description}>
                                                    {inv.description}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-400 min-w-[120px]">
                                                    {formatDate(inv.due_date)}
                                                </td>
                                                <td className="px-6 py-4 text-zinc-400 min-w-[120px]">
                                                    {formatDate(inv.created_at)}
                                                </td>
                                                <td className="px-6 py-4 text-center min-w-[120px]">
                                                    {daysOverdue > 0 ? (
                                                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
                                                            +{daysOverdue} días
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-emerald-500 text-xs">Al día</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-white min-w-[120px]">
                                                    ${inv.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 min-w-[120px]">
                                                    <Badge variant={
                                                        inv.status === 'paid' ? 'success' :
                                                            inv.status === 'overdue' ? 'destructive' :
                                                                inv.status === 'pending' ? 'warning' : 'default'
                                                    }>
                                                        {inv.status === 'paid' ? 'Pagado' :
                                                            inv.status === 'overdue' ? 'Vencido' :
                                                                inv.status === 'pending' ? 'Pendiente' : inv.status}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <Link href={`/dashboard/invoices/${inv.id}`} title="Ver Detalle">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                                                <Eye size={16} />
                                                            </Button>
                                                        </Link>

                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800" title="Editar" onClick={() => checkAction(() => alert('Editar factura en desarrollo'))}>
                                                            <Pencil size={16} />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800"
                                                            title="Registrar Pago"
                                                            onClick={() => handleRegisterPayment(inv.id)}
                                                        >
                                                            <CreditCard size={16} />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                                            title="Descargar PDF"
                                                            onClick={() => handleDownloadPDF(inv.id)}
                                                        >
                                                            <FileText size={16} />
                                                        </Button>

                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-zinc-800"
                                                            title="Eliminar"
                                                            onClick={() => handleDelete(inv.id)}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="px-6 py-12 text-center text-zinc-500">
                                            No se encontraron facturas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </Card>
        </div>
    )
}
