import { createClient } from '@/utils/supabase/server'
import { calculateResidentMonthlyFinancials } from '@/utils/finance-utils'
import { getAnnouncementsAction } from '@/app/actions/announcement-actions'
import { getResidentRecentMovementsAction } from '@/app/actions/resident-actions'
import { redirect } from 'next/navigation'
import MobileDashboardClient from '@/components/mobile/mobile-dashboard-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function MobileDashboardPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle()

    const metaFullName = user.user_metadata?.full_name
        || [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(' ')
    const fullName = profile?.full_name || metaFullName || user.email?.split('@')[0] || 'Residente'
    const firstName = fullName.trim().split(' ')[0]
    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || null

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, organization_id), units(unit_number, monto_mensual, payment_deadline)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        // La versión móvil todavía no tiene su propia pantalla para este caso —
        // se manda al panel web actual, que ya sabe qué mostrarle a un usuario
        // sin ficha de residente vinculada.
        redirect('/residente')
    }

    const condominiumName = (resident.condominiums as any)?.name || null
    const unitNumber = (resident as any).units?.unit_number || null
    const organizationId = (resident.condominiums as any)?.organization_id || null
    const paymentDeadlineDay = Number((resident as any).units?.payment_deadline) || 10
    const monthlyFee = Number((resident as any).units?.monto_mensual || 0)

    let saldoPendiente = 0
    let proximoPagoFecha: string | null = null

    {
        const { data: invoicesData } = await supabase
            .from('resident_invoices')
            .select('*')
            .eq('resident_id', resident.id)
            .order('created_at', { ascending: false })

        const invoices = invoicesData || []
        const today = new Date()

        const currentMonthFinancials = calculateResidentMonthlyFinancials({
            resident,
            invoices,
            selectedMonth: String(today.getMonth()),
            monthlyFee,
        })
        saldoPendiente = currentMonthFinancials.totalPending + currentMonthFinancials.overdueAmount

        const pendingInvoiceThisMonth = currentMonthFinancials.filteredInvoices?.find(
            (inv: any) => inv.status === 'pending' || inv.status === 'overdue'
        )

        if (pendingInvoiceThisMonth?.due_date) {
            proximoPagoFecha = pendingInvoiceThisMonth.due_date
        } else {
            // Ya no hay nada pendiente este mes: se proyecta la fecha límite
            // del mes siguiente como referencia de "próximo pago".
            const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
            const lastDayNextMonth = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate()
            const day = Math.min(paymentDeadlineDay, lastDayNextMonth)
            proximoPagoFecha = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day).toISOString()
        }
    }

    let announcements: any[] = []
    if (organizationId) {
        const result = await getAnnouncementsAction(organizationId, condominiumName || undefined)
        if (result.success) announcements = result.data || []
    }

    let recentActivity: any[] = []
    {
        const result = await getResidentRecentMovementsAction()
        if (result.success) recentActivity = result.data || []
    }

    return (
        <MobileDashboardClient
            firstName={firstName}
            avatarUrl={avatarUrl}
            condominiumName={condominiumName}
            unitNumber={unitNumber}
            saldoPendiente={saldoPendiente}
            proximoPagoFecha={proximoPagoFecha}
            announcements={announcements}
            recentActivity={recentActivity}
        />
    )
}
