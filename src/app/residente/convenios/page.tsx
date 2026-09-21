import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentAgreementsAction, getAgreementInstallmentsAction } from '@/app/actions/payment-agreement-actions'
import { ResidentConveniosClient } from '@/components/residente/resident-convenios-client'
import { NotLinkedState } from '@/components/residente/NotLinkedState'
import { calculateResidentDebtSummary } from '@/utils/finance-utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResidentConveniosPage() {
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

    let currentDebt = 0
    const { data: invoices } = await supabase
        .from('resident_invoices')
        .select('*')
        .eq('resident_id', resident.id)
        .order('created_at', { ascending: false })

    if (invoices && invoices.length > 0) {
        currentDebt = calculateResidentDebtSummary({
            resident,
            invoices,
            unit: resident.units,
        }).debt
    }

    let agreements: any[] = []
    let installments: any[] = []

    const res = await getResidentAgreementsAction(resident.id)
    if (res.success && res.data) {
        agreements = res.data
        if (agreements.length > 0) {
            // Fetch installments for the latest agreement
            const latestAgreement = agreements[0]
            const instRes = await getAgreementInstallmentsAction(latestAgreement.id)
            if (instRes.success && instRes.data) {
                installments = instRes.data
            }
        }
    }

    return (
        <ResidentConveniosClient
            resident={resident}
            agreements={agreements}
            initialInstallments={installments}
            currentDebt={currentDebt}
        />
    )
}
