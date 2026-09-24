import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { getCondoMercadoPagoAccount } from '@/services/mercadopago-connect-service'
import { findResidentForUser } from '@/services/mobile-resident-lookup'
import MobilePagosClient from '@/components/mobile/mobile-pagos-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobilePagosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/mobile/login')
    }

    const resident = await findResidentForUser(user)

    if (!resident) {
        redirect('/residente/payments')
    }

    const adminSupabase = createAdminClient()
    const [{ data: condo }, { data: unit }] = await Promise.all([
        resident.condominium_id
            ? adminSupabase.from('condominiums').select('name').eq('id', resident.condominium_id).maybeSingle()
            : Promise.resolve({ data: null }),
        resident.unit_id
            ? adminSupabase.from('units').select('unit_number, monto_mensual, payment_deadline').eq('id', resident.unit_id).maybeSingle()
            : Promise.resolve({ data: null }),
    ])
    ;(resident as any).condominiums = condo
    ;(resident as any).units = unit

    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .maybeSingle()
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null

    const { data: invoicesData } = await supabase
        .from('resident_invoices')
        .select('id, amount, description, status, due_date, paid_at, created_at, folio, payment_method')
        .eq('resident_id', resident.id)
        .order('created_at', { ascending: false })

    const invoices = invoicesData || []
    const today = new Date()
    const paymentDeadlineDay = Number((resident as any).units?.payment_deadline) || 10
    const monthlyFee = Number((resident as any).units?.monto_mensual || 0)

    const history = invoices.map((inv) => {
        const effectiveDate = inv.paid_at || inv.due_date || inv.created_at
        let status: 'paid' | 'pending' | 'overdue' = 'pending'
        if (inv.status === 'paid') {
            status = 'paid'
        } else if (inv.due_date && new Date(inv.due_date) < today) {
            status = 'overdue'
        }
        return {
            id: inv.id,
            concept: inv.description || 'Cuota de Mantenimiento',
            amount: Number(inv.amount || 0),
            date: effectiveDate,
            status,
            folio: inv.folio || null,
            paymentMethod: inv.payment_method || null,
        }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const years = Array.from(new Set(history.map((h) => new Date(h.date).getFullYear()))).sort((a, b) => b - a)
    if (years.length === 0) years.push(today.getFullYear())

    // Saldo pendiente = suma de todo lo no pagado (mismo criterio que el resto de la app: pending + overdue).
    const pendingInvoices = invoices.filter((inv) => inv.status !== 'paid')
    const saldoPendiente = pendingInvoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0)

    let proximoPagoFecha: string | null = null
    let diasParaVencer: number | null = null
    const nextDue = pendingInvoices
        .filter((inv) => inv.due_date)
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]

    if (nextDue?.due_date) {
        proximoPagoFecha = nextDue.due_date
        diasParaVencer = Math.ceil((new Date(nextDue.due_date).getTime() - today.getTime()) / 86400000)
    } else if (monthlyFee > 0) {
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
        const lastDayNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
        const day = Math.min(paymentDeadlineDay, lastDayNextMonth)
        proximoPagoFecha = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day).toISOString()
    }

    const mpAccount = (resident as any).condominium_id
        ? await getCondoMercadoPagoAccount((resident as any).condominium_id)
        : { connected: false }

    const residentName = [resident.first_name, resident.last_name].filter(Boolean).join(' ') || 'Residente'
    const condoName = (resident.condominiums as any)?.name || ''
    const unitNumber = (resident as any).units?.unit_number || null

    return (
        <MobilePagosClient
            avatarUrl={avatarUrl}
            saldoPendiente={saldoPendiente}
            proximoPagoFecha={proximoPagoFecha}
            diasParaVencer={diasParaVencer}
            history={history}
            years={years}
            mpConnected={mpAccount.connected}
            residentName={residentName}
            condoName={condoName}
            unitNumber={unitNumber}
        />
    )
}
