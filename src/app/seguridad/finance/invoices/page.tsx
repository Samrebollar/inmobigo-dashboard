import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { generateFolio } from '@/types/finance'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function InvoicesPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: invoices } = await supabase
        .from('resident_invoices')
        .select(`
            id, amount, balance_due, status, created_at, due_date, description, invoice_type,
            residents (first_name, last_name, units(unit_number)),
            condominiums (name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

    const statusLabel: Record<string, string> = {
        paid: 'Pagado',
        pending: 'Pendiente',
        overdue: 'Vencido',
        cancelled: 'Cancelado'
    }

    const statusColor: Record<string, string> = {
        paid: 'bg-emerald-600/20 text-emerald-400',
        pending: 'bg-amber-600/20 text-amber-400',
        overdue: 'bg-rose-600/20 text-rose-400',
        cancelled: 'bg-zinc-600/20 text-zinc-400'
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-white">Facturas</h1>

            {(!invoices || invoices.length === 0) && (
                <div className="text-center py-20 text-zinc-500">No hay facturas registradas.</div>
            )}

            <div className="space-y-3">
                {invoices?.map((invoice: any) => {
                    const folio = generateFolio(invoice.id)
                    const paidAmount = Math.max(0, Number(invoice.amount || 0) - Number(invoice.balance_due || 0))
                    const resident = invoice.residents
                    const residentName = resident ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim() : 'Sin residente'
                    const unitNumber = resident?.units?.unit_number || 'S/N'
                    const condoName = invoice.condominiums?.name || 'Condominio'

                    return (
                        <div
                            key={invoice.id}
                            className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="space-y-1 min-w-0">
                                    <p className="font-mono text-xs text-zinc-500 uppercase">{folio}</p>
                                    <p className="font-semibold text-white text-lg">
                                        ${Number(invoice.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-sm text-zinc-400">{invoice.description || 'Cuota de mantenimiento'}</p>
                                    <p className="text-xs text-zinc-500">{residentName} · Unidad {unitNumber} · {condoName}</p>
                                </div>

                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${statusColor[invoice.status] || statusColor.pending}`}>
                                        {statusLabel[invoice.status] || invoice.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}