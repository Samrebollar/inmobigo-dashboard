import { createClient } from '@/utils/supabase/server'
import { getUserContext } from '@/utils/user-context'
import Link from 'next/link'
import ResidentDashboardCondominioClient from '@/components/residente/resident-dashboard-condominio-client'
import ResidentDashboardPropiedadesClient from '@/components/residente/resident-dashboard-propiedades-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResidentePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return <div>No autenticado</div>

    const { businessType } = await getUserContext()

    // 1. Get Profile for Name
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

    const metaFullName = user.user_metadata?.full_name
    const fullName = profile?.full_name || metaFullName || user.email?.split('@')[0] || 'Residente'
    const firstName = fullName.trim().split(' ')[0]

    // 2. Get Resident Table Data
    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, organization_id), units(unit_number, monto_mensual, payment_deadline)')
        .eq('user_id', user.id)
        .maybeSingle()

    const mockResident = {
        ...(resident || {
            first_name: firstName,
            last_name: '',
            condominiums: { name: 'Condominio Demo' },
            units: { unit_number: 'A-101', monto_mensual: 2500, payment_deadline: 10 },
            debt_amount: 0,
            last_payment_amount: 0,
            active_tickets_count: 0,
            paid_installments_count: 0,
        }),
        user_id: user.id,
        organization_id: resident?.organization_id || (resident?.condominiums as any)?.organization_id || user.user_metadata?.organization_id
    }

    // 3. Cargar facturas reales para calcular saldo pendiente y último pago
    let financialData = {
        saldoPendiente: 0,
        ultimoPago: 0,
        ultimaFechaPago: null as string | null,
        diasDesdeUltimoPago: null as number | null,
        cuotasPagadasEsteAnio: 0,
    }

    if (resident?.id) {
        const { data: invoices } = await supabase
            .from('invoices')
            .select('*')
            .eq('resident_id', resident.id)
            .order('created_at', { ascending: false })

        if (invoices && invoices.length > 0) {
            const today = new Date()
            const montoCuota = resident?.units?.monto_mensual || 2500
            const paymentDeadline = resident?.units?.payment_deadline || 10

            // Agrupar pagados por año-mes para calcular déficits
            const monthlyPaid: Record<string, { paid: number; year: number; monthIndex: number }> = {}
            invoices.forEach((inv: any) => {
                const d = new Date(inv.due_date || inv.created_at)
                const key = `${d.getFullYear()}-${d.getMonth()}`
                if (!monthlyPaid[key]) monthlyPaid[key] = { paid: 0, year: d.getFullYear(), monthIndex: d.getMonth() }
                if (inv.status === 'paid') monthlyPaid[key].paid += inv.amount || 0
            })

            // Sumar déficit de todos los meses vencidos
            let saldoAcumulado = 0
            Object.values(monthlyPaid).forEach(({ year, monthIndex, paid }) => {
                const deadline = new Date(year, monthIndex, paymentDeadline, 23, 59, 59)
                if (today > deadline) {
                    const diff = montoCuota - paid
                    if (diff > 0) saldoAcumulado += diff
                }
            })
            financialData.saldoPendiente = saldoAcumulado

            // Último pago: la factura paid más reciente
            const lastPaid = invoices.find((inv: any) => inv.status === 'paid')
            if (lastPaid) {
                financialData.ultimoPago = lastPaid.amount || 0
                financialData.ultimaFechaPago = lastPaid.paid_at || lastPaid.created_at
                const lastDate = new Date(financialData.ultimaFechaPago!)
                financialData.diasDesdeUltimoPago = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
            }

            // Cuotas pagadas este año: meses únicos del año actual con al menos 1 pago
            const currentYear = today.getFullYear()
            const mesesPagadosEsteAnio = new Set<string>()
            invoices.forEach((inv: any) => {
                if (inv.status === 'paid') {
                    const d = new Date(inv.due_date || inv.created_at)
                    if (d.getFullYear() === currentYear) {
                        mesesPagadosEsteAnio.add(`${d.getFullYear()}-${d.getMonth()}`)
                    }
                }
            })
            financialData.cuotasPagadasEsteAnio = mesesPagadosEsteAnio.size
        }
    }

    if (businessType === 'propiedades') {
        return (
            <ResidentDashboardPropiedadesClient 
                resident={mockResident} 
                userName={firstName} 
            />
        )
    }

    return (
        <ResidentDashboardCondominioClient 
            resident={mockResident} 
            userName={firstName}
            financialData={financialData}
        />
    )
}
