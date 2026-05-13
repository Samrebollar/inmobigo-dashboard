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

    // Cargar facturas reales del residente desde Supabase
    let invoices: any[] = []
    if (resident?.id) {
        const { data: inv, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('resident_id', resident.id)
            .order('created_at', { ascending: false })

        if (!error && inv) {
            const today = new Date()
            today.setHours(23, 59, 59, 0) // fin de día para comparar limpio
            const paymentDeadline = resident?.units?.payment_deadline || 10

            invoices = inv.map((invoice: any) => {
                /*
                 * LÓGICA DE ATRASO:
                 * 
                 * La fecha límite oficial es el día `paymentDeadline` del mes 
                 * al que CORRESPONDE la factura (determinado por due_date).
                 * 
                 * Si la factura está PAGADA → comparamos la fecha de pago (paid_at)
                 * contra la fecha límite → atraso histórico real.
                 * 
                 * Si la factura está PENDIENTE/VENCIDA → comparamos HOY
                 * contra la fecha límite → días acumulados de retraso.
                 */

                // Determinar el mes al que pertenece esta factura
                const invoiceDate = new Date(invoice.due_date || invoice.created_at)
                
                // Fecha límite oficial = día `paymentDeadline` del mes de la factura
                const limitDate = new Date(
                    invoiceDate.getFullYear(),
                    invoiceDate.getMonth(),
                    paymentDeadline,
                    23, 59, 59
                )

                // Fecha de referencia: cuándo se pagó (o hoy si no se ha pagado)
                let referenceDate: Date
                if (invoice.status === 'paid') {
                    // Preferimos paid_at, luego updated_at como respaldo
                    const paidStr = invoice.paid_at || invoice.updated_at
                    referenceDate = paidStr ? new Date(paidStr) : today
                } else {
                    referenceDate = today
                }

                // Días de atraso = diferencia entre referencia y límite (si referencia > límite)
                let atraso = 0
                if (referenceDate > limitDate) {
                    const diffMs = referenceDate.getTime() - limitDate.getTime()
                    atraso = Math.floor(diffMs / (1000 * 60 * 60 * 24))
                }

                return { ...invoice, atraso }
            })
        }
    }

    // Datos de la unidad para tiempo real
    const unit = resident?.units || null

    return (
        <ResidentPaymentsClient resident={mockResident} invoices={invoices} unit={unit} />
    )
}
