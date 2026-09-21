import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResidentPaymentsClient from '@/components/residente/resident-payments-client'
import { NotLinkedState } from '@/components/residente/NotLinkedState'
import { getCondoMercadoPagoAccount } from '@/services/mercadopago-connect-service'

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

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name), units(id, unit_number, monto_mensual, payment_deadline)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        return <NotLinkedState email={user.email} />
    }

    // Cargar facturas reales del residente desde resident_invoices
    let invoices: any[] = []
    let directPayments: any[] = []

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

            // ── Cruzar folios reales desde payment_validations ──────────────────
            const validationIds = inv
                .map((i: any) => {
                    const m = (i.notes || '').match(/^validation:(.+)$/)
                    return m ? m[1] : null
                })
                .filter(Boolean) as string[]

            const folioByValidationId: Record<string, string> = {}
            if (validationIds.length > 0) {
                const { data: pvRows } = await supabase
                    .from('payment_validations')
                    .select('id, folio')
                    .in('id', validationIds)
                if (pvRows) {
                    for (const row of pvRows) {
                        if (row.folio) folioByValidationId[row.id] = row.folio
                    }
                }
            }

            invoices = inv.map((invoice: any) => {
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

                const paid_amount = Math.max(0, Number(invoice.amount || 0) - Number(invoice.balance_due || 0))

                const validationMatch = (invoice.notes || '').match(/^validation:(.+)$/)
                const realFolio = validationMatch
                    ? (folioByValidationId[validationMatch[1]] || invoice.folio || null)
                    : (invoice.folio || null)

                return { ...invoice, folio: realFolio, atraso, paid_amount }
            })

            // ── Cargar pagos directos desde la tabla payments ──────────────────
            const invoiceIds = inv.map(i => i.id)
            if (invoiceIds.length > 0) {
                const { data: payRows } = await supabase
                    .from('payments')
                    .select('*')
                    .in('invoice_id', invoiceIds)
                    .order('created_at', { ascending: false })

                if (payRows && payRows.length > 0) {
                    const invMap: Record<string, any> = {}
                    for (const i of inv) {
                        invMap[i.id] = i
                    }

                    directPayments = payRows.map(p => {
                        const relatedInv = invMap[p.invoice_id]
                        return {
                            ...p,
                            concept: relatedInv?.description || 'Cuota de Mantenimiento',
                            folio: relatedInv?.notes?.match(/^validation:(.+)$/) 
                                ? (folioByValidationId[relatedInv.notes.match(/^validation:(.+)$/)[1]] || relatedInv.folio || p.id?.slice(0, 8))
                                : (relatedInv?.folio || p.id?.slice(0, 8)),
                            payment_method: p.payment_method || p.provider || 'Mercado Pago'
                        }
                    })
                }
            }
        }
    }

    const unit = resident?.units || null

    const mpAccount = resident?.condominium_id
        ? await getCondoMercadoPagoAccount(resident.condominium_id)
        : { connected: false }

    return (
        <ResidentPaymentsClient
            resident={resident}
            invoices={invoices}
            unit={unit}
            directPayments={directPayments}
            mpConnected={mpAccount.connected}
        />
    )
}
