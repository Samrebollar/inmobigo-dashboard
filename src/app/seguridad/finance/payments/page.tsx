import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { AdminPaymentsClient } from '@/components/finance/admin-payments-client'

export const dynamic = 'force-dynamic'

export default async function PaymentsPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login')
    }

    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    let organizationId = orgUser?.organization_id

    if (!organizationId) {
        const { data: ownedOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
        organizationId = ownedOrg?.id
    }

    if (!organizationId) {
        redirect('/seguridad')
    }

    // 1. Leer pagos de la tabla payments, acotados a la organización del usuario
    const { data: paymentsRaw } = await supabase
        .from('payments')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

    const payments = paymentsRaw || []

    // 2. Extraer invoice_ids únicos
    const invoiceIds = Array.from(
        new Set(payments.map(p => p.invoice_id).filter(Boolean))
    ) as string[]

    let invoiceMap: Record<string, any> = {}

    if (invoiceIds.length > 0) {
        const { data: invoicesData } = await supabase
            .from('resident_invoices')
            .select(`
                id,
                description,
                status,
                due_date,
                notes,
                residents (
                    first_name,
                    last_name,
                    units (unit_number),
                    condominiums (name)
                )
            `)
            .in('id', invoiceIds)

        if (invoicesData) {
            for (const inv of invoicesData) {
                invoiceMap[inv.id] = inv
            }
        }
    }

    // 3. Enriquecer los pagos
    const enrichedPayments = payments.map((p) => {
        const inv = invoiceMap[p.invoice_id]
        const resident = inv?.residents
        const unit = resident?.units
        const condo = resident?.condominiums

        const residentName = resident
            ? `${resident.first_name || ''} ${resident.last_name || ''}`.trim()
            : null

        return {
            ...p,
            concept: inv?.description || 'Cuota de Mantenimiento',
            resident_name: residentName,
            unit_number: unit?.unit_number || null,
            condominium_name: condo?.name || null,
            payment_method: p.payment_method || p.provider || 'Mercado Pago',
        }
    })

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <AdminPaymentsClient payments={enrichedPayments} />
        </div>
    )
}
