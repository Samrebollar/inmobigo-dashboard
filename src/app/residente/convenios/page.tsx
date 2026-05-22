import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { getResidentAgreementsAction, getAgreementInstallmentsAction } from '@/app/actions/payment-agreement-actions'
import { ResidentConveniosClient } from '@/components/residente/resident-convenios-client'

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

    const mockResident = resident || {
        first_name: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || 'Residente',
        last_name: user.user_metadata?.last_name || '',
        condominiums: { name: 'Condominio Demo' },
        units: { id: 'demo-unit', unit_number: 'A-101', monto_mensual: 2500, payment_deadline: 10 },
        debt_amount: 0,
    }

    let agreements: any[] = []
    let installments: any[] = []

    if (resident?.id) {
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
    }

    return (
        <ResidentConveniosClient 
            resident={mockResident} 
            agreements={agreements} 
            initialInstallments={installments} 
        />
    )
}
