import { createClient } from '@/utils/supabase/server'
import { getUserContext } from '@/utils/user-context'
import { calculateResidentMonthlyFinancials } from '@/utils/finance-utils'
import { NotLinkedState } from '@/components/residente/NotLinkedState'
import { getCondoMercadoPagoAccount } from '@/services/mercadopago-connect-service'
import Link from 'next/link'
import nextDynamic from 'next/dynamic'

const ResidentDashboardCondominioClient = nextDynamic(
    () => import('@/components/residente/resident-dashboard-condominio-client')
)

const ResidentDashboardPropiedadesClient = nextDynamic(
    () => import('@/components/residente/resident-dashboard-propiedades-client')
)


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
        .select('*, condominiums(name, organization_id, reglamento_url), units(unit_number, monto_mensual, payment_deadline)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        return <NotLinkedState email={user.email} />
    }

    const residentData = {
        ...resident,
        user_id: user.id,
        organization_id: (resident as any).organization_id || (resident?.condominiums as any)?.organization_id || user.user_metadata?.organization_id
    }

    // 3. Cargar facturas reales para calcular saldo pendiente y último pago
    let financialData = {
        saldoPendiente: 0,
        ultimoPago: 0,
        ultimaFechaPago: null as string | null,
        diasDesdeUltimoPago: null as number | null,
        cuotasPagadasEsteAnio: 0,
        incidenciasActivas: 0,
    }

    {
        const { count } = await supabase
            .from('tickets')
            .select('id', { count: 'exact', head: true })
            .eq('resident_id', resident.id)
            .in('status', ['open', 'in_progress'])

        financialData.incidenciasActivas = count || 0
    }

    {
        const { data: invoicesData } = await supabase
            .from('resident_invoices')
            .select('*')
            .eq('resident_id', resident.id)
            .order('created_at', { ascending: false })

        const invoices = invoicesData || []
        const today = new Date()

        // Misma función (calculateResidentMonthlyFinancials) que usa el
        // detalle del residente en el panel del administrador, sobre el mes
        // en curso, para que el residente vea exactamente el mismo número
        // que su administrador. Se calcula SIEMPRE, incluso sin facturas
        // reales todavía: esta función ya proyecta la cuota del mes en curso
        // aunque el cron de facturación no haya generado el recibo. Antes
        // esto vivía detrás de un "if (invoices.length > 0)", así que un
        // residente sin facturas generadas (el caso más común: recién dado
        // de alta, o el mes actual sin cron corrido) siempre veía $0 aquí
        // aunque el panel del administrador sí le mostrara deuda.
        const monthlyFee = Number((resident as any).units?.monto_mensual || 0)
        const currentMonthFinancials = calculateResidentMonthlyFinancials({
            resident,
            invoices,
            selectedMonth: String(today.getMonth()),
            monthlyFee,
        })
        financialData.saldoPendiente = currentMonthFinancials.totalPending + currentMonthFinancials.overdueAmount

        if (invoices.length > 0) {
            // Último pago: la factura paid más reciente (usa balance_due=0 como indicador de pago)
            const lastPaid = invoices.find((inv: any) => inv.status === 'paid')
            if (lastPaid) {
                financialData.ultimoPago = lastPaid.amount || 0
                // Facturas pagadas antes de que se empezara a registrar paid_at
                // no lo tienen; usamos updated_at/created_at como respaldo.
                financialData.ultimaFechaPago = lastPaid.paid_at || lastPaid.updated_at || lastPaid.created_at
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
                resident={residentData}
                userName={firstName}
            />
        )
    }

    const mpAccount = residentData.condominium_id
        ? await getCondoMercadoPagoAccount(residentData.condominium_id)
        : { connected: false }

    return (
        <ResidentDashboardCondominioClient
            resident={residentData}
            userName={firstName}
            financialData={financialData}
            mpConnected={mpAccount.connected}
        />
    )
}
