import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { canOperateOrgFinance } from '@/lib/finance-auth'
import { backfillOrgReceipts } from '@/lib/payment-receipts'
import { ReceiptsAdminClient, type ReceiptRow } from '@/components/finance/receipts-admin-client'

export const dynamic = 'force-dynamic'

export default async function RecibosValidadosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const admin = createAdminClient()
    const [{ data: member }, { data: ownedOrg }] = await Promise.all([
        admin.from('organization_users').select('organization_id').eq('user_id', user.id).maybeSingle(),
        admin.from('organizations').select('id').eq('owner_id', user.id).limit(1).maybeSingle(),
    ])
    const organizationId = member?.organization_id || ownedOrg?.id
    if (!organizationId || !(await canOperateOrgFinance(admin, user.id, organizationId))) redirect('/dashboard')

    // Pagos anteriores a los recibos validados: se les emite su recibo (firma el
    // administrador principal). Idempotente, así que no repite los ya emitidos.
    await backfillOrgReceipts(admin, organizationId)

    const { data } = await admin
        .from('payment_receipts')
        .select('id, folio, short_code, verify_token, amount, concept, payment_method, paid_at, issued_at, resident_name, unit_number, condominium_name, signer_name, signer_position, validation_mode, status, canceled_at, cancel_reason')
        .eq('organization_id', organizationId)
        .order('issued_at', { ascending: false })
        .limit(500)

    return <ReceiptsAdminClient receipts={(data || []) as ReceiptRow[]} />
}
