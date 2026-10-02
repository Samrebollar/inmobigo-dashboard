'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cancelReceipt, checkCanSignPayments } from '@/lib/payment-receipts'

/**
 * Cancela un recibo (con todo su cobro) por un motivo. Con reissue=true emite
 * un recibo nuevo con los datos actuales, firmado por quien cancela. Solo la
 * administración con firma registrada (seguridad no).
 */
export async function cancelReceiptAction(receiptId: string, reason: string, reissue: boolean): Promise<
    { success: true; canceled: number; reissued: { short_code: string; verify_token: string }[] } | { success: false; error: string }
> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado' }

    const cleanReason = (reason || '').trim().slice(0, 300)
    if (cleanReason.length < 5) return { success: false, error: 'Escribe el motivo de la cancelación (mínimo 5 caracteres).' }

    const admin = createAdminClient()
    const { data: receipt } = await admin.from('payment_receipts').select('id, organization_id, status').eq('id', receiptId).maybeSingle()
    if (!receipt?.organization_id) return { success: false, error: 'Recibo no encontrado' }
    if (receipt.status === 'cancelado') return { success: false, error: 'Este recibo ya está cancelado' }

    const signing = await checkCanSignPayments(admin, user.id, receipt.organization_id)
    if (!signing.ok) return { success: false, error: signing.error }

    const result = await cancelReceipt(admin, { receiptId, userId: user.id, reason: cleanReason, reissue })
    revalidatePath('/dashboard/finance/recibos')
    return {
        success: true,
        canceled: result.canceled,
        reissued: result.reissued.map((r) => ({ short_code: r.short_code, verify_token: r.verify_token })),
    }
}
