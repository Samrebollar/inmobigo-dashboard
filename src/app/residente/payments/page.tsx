import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentPaymentsClient from '@/components/residente/resident-payments-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function PaymentsPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name), units(id, unit_number, monto_mensual, payment_deadline)')
        .eq('user_id', user.id)
        .maybeSingle()

    const mockResident = resident || {
        first_name: profile?.full_name?.split(' ')[0] || user.user_metadata?.full_name?.split(' ')[0] || 'Residente',
        condominiums: { name: 'Condominio Demo' },
        units: { unit_number: 'A-101', monto_mensual: 2500, payment_deadline: 10 },
        debt_amount: 0,
    }

    // Cargar facturas reales del residente desde resident_invoices
    let invoices: any[] = []
    if (resident?.id) {
        const { data: inv, error } = await supabase
            .from('resident_invoices')
            .select('*')
            .eq('resident_id', resident.id)
            .order('created_at', { ascending: false })

        if (!error && inv) {
            const today = new Date()
            today.setHours(23, 59, 59, 0)
            const paymentDeadline = resident?.units?.payment_deadline || 10

            invoices = inv.map((invoice: any) => {
                /*
                 * LÓGICA DE ATRASO:
                 *
                 * La fecha límite oficial es el día `paymentDeadline` del mes
                 * al que CORRESPONDE la factura (determinado por due_date).
                 *
                 * paid_amount se calcula como amount - balance_due (no hay campo paid_at
                 * ni paid_amount en resident_invoices).
                 *
                 * Si está PAGADA → sin atraso (no tenemos fecha de pago exacta).
                 * Si está PENDIENTE/VENCIDA → comparamos HOY contra la fecha límite.
                 */

                const invoiceDate = new Date(invoice.due_date || invoice.created_at)
                
                const limitDate = new Date(
                    invoiceDate.getFullYear(),
                    invoiceDate.getMonth(),
                    paymentDeadline,
                    23, 59, 59
                )

                let atraso = 0
                if (invoice.status !== 'paid' && today > limitDate) {
                    const diffMs = today.getTime() - limitDate.getTime()
                    atraso = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                }

                // Compute paid_amount from amount - balance_due
                const paid_amount = Math.max(0, Number(invoice.amount || 0) - Number(invoice.balance_due || 0))

                return { ...invoice, atraso, paid_amount }
            })
        }
    }

    // Datos de la unidad para tiempo real
    const unit = resident?.units || null

    return (
        <ResidentPaymentsClient resident={mockResident} invoices={invoices} unit={unit} />
    )
}
