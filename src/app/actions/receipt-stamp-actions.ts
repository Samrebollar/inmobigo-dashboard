'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { canOperateOrgFinance } from '@/lib/finance-auth'
import { distinctLegalName } from '@/types/admin-identity'
import { issuePaymentReceipt } from '@/lib/payment-receipts'

export interface ReceiptStamp {
    verifyUrl: string
    shortCode: string
    status: 'valido' | 'firma_pendiente' | 'cancelado'
    validationMode: string
    signerName: string
    signerPosition: string
    adminLabel: string | null
    /** Razón social, solo si es distinta del nombre comercial */
    adminLegalName: string | null
    sedetusNumber: string | null
    issuedAt: string
    sealShort: string | null
    signatureDataUrl: string | null
    folio: string | null
}

export interface ReceiptStampLookup {
    paymentId?: string | null
    folio?: string | null
    invoiceId?: string | null
}

const ADMIN_TYPE_LABEL: Record<string, string> = {
    empresa: 'Empresa administradora',
    comite: 'Comité de administración',
}

function appUrl(): string {
    return (process.env.NEXT_PUBLIC_APP_URL || 'https://app.inmobigo.mx').replace(/\/$/, '')
}

/**
 * Datos del bloque "Recibido y validado por" (QR, firma, matrícula y sello)
 * para estampar en el PDF de un recibo. Solo lo obtiene el equipo de la
 * organización o el propio residente del pago. Devuelve null si el pago aún
 * no tiene recibo oficial (por ejemplo, un comprobante pendiente de validar).
 */
export async function getReceiptStampAction(lookup: ReceiptStampLookup): Promise<ReceiptStamp | null> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const admin = createAdminClient()

    // Se busca por el dato más preciso disponible: el pago, luego el folio del
    // cobro y por último la factura (el último pago aplicado a ella).
    const attempts: [string, string, boolean][] = []
    if (lookup.paymentId) attempts.push(['payment_id', lookup.paymentId, true])
    if (lookup.folio) attempts.push(['folio', lookup.folio, true])
    if (lookup.invoiceId) attempts.push(['invoice_id', lookup.invoiceId, false])

    // Autorización: equipo de la organización o el residente dueño del pago
    const canAccess = async (organizationId: string | null, residentId: string | null) => {
        if (organizationId && await canOperateOrgFinance(admin, user.id, organizationId)) return true
        if (!residentId) return false
        const { data: resident } = await admin.from('residents').select('user_id').eq('id', residentId).maybeSingle()
        return resident?.user_id === user.id
    }

    // El recibo vigente tiene prioridad sobre uno cancelado del mismo pago
    const findReceipt = async () => {
        for (const [column, value, oldestFirst] of attempts) {
            for (const activeOnly of [true, false]) {
                let query = admin.from('payment_receipts').select('*').eq(column, value)
                if (activeOnly) query = query.neq('status', 'cancelado')
                const { data } = await query.order('issued_at', { ascending: oldestFirst }).limit(1).maybeSingle()
                if (data) return data
            }
        }
        return null
    }

    let receipt: any = await findReceipt()

    // Pago anterior a los recibos validados: se emite su recibo en este momento
    // (lo firma el administrador principal) y se vuelve a buscar.
    if (!receipt) {
        const paymentColumn = lookup.paymentId ? 'id' : lookup.folio ? 'folio' : 'invoice_id'
        const paymentValue = lookup.paymentId || lookup.folio || lookup.invoiceId
        if (!paymentValue) return null
        const { data: payments } = await admin
            .from('resident_invoice_payments')
            .select('id, organization_id, resident_id')
            .eq(paymentColumn, paymentValue)
            .limit(20)
        const first = payments?.[0]
        if (!first || !(await canAccess(first.organization_id, first.resident_id))) return null
        for (const p of payments!) {
            if (p.organization_id === first.organization_id) await issuePaymentReceipt(admin, p.id, 'historico')
        }
        receipt = await findReceipt()
        if (!receipt) return null
    }

    if (!(await canAccess(receipt.organization_id, receipt.resident_id))) return null

    // Un recibo vigente muestra siempre la firma ACTUAL de su firmante (si la
    // cambia, se actualiza en todos sus recibos). Solo si ya no tiene firma se usa
    // la guardada en el recibo. La firma está en un bucket privado: se incrusta
    // como data URL.
    let signatureDataUrl: string | null = null
    if (receipt.status === 'valido') {
        let signaturePath: string | null = receipt.signer_signature_path
        if (receipt.signer_user_id) {
            const { data: signer } = await admin.from('profiles').select('signature_path').eq('id', receipt.signer_user_id).maybeSingle()
            if (signer?.signature_path) {
                signaturePath = signer.signature_path
                if (signaturePath !== receipt.signer_signature_path) {
                    await admin.from('payment_receipts').update({ signer_signature_path: signaturePath }).eq('id', receipt.id)
                }
            }
        }
        if (signaturePath) {
            const { data: file } = await admin.storage.from('signatures').download(signaturePath)
            if (file) signatureDataUrl = `data:image/png;base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`
        }
    }

    const typeLabel = receipt.admin_type ? ADMIN_TYPE_LABEL[receipt.admin_type] : null
    const adminLabel = receipt.admin_display_name
        ? `${receipt.admin_display_name}${typeLabel ? ` (${typeLabel})` : ''}`
        : typeLabel

    return {
        verifyUrl: `${appUrl()}/verificar/${receipt.verify_token}`,
        shortCode: receipt.short_code,
        status: receipt.status,
        validationMode: receipt.validation_mode,
        signerName: receipt.signer_name || 'Administración',
        signerPosition: receipt.signer_position || 'Administración',
        adminLabel,
        adminLegalName: receipt.admin_type === 'empresa' ? distinctLegalName(receipt.admin_display_name, receipt.admin_legal_name) : null,
        sedetusNumber: receipt.sedetus_registration_number,
        issuedAt: receipt.issued_at,
        sealShort: receipt.seal ? receipt.seal.slice(0, 32).toUpperCase().match(/.{1,8}/g)!.join(' ') : null,
        signatureDataUrl,
        folio: receipt.folio,
    }
}
