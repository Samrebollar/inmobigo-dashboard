'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { canOperateOrgFinance } from '@/lib/finance-auth'
import { distinctLegalName } from '@/types/admin-identity'

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

    let receipt: any = null
    for (const [column, value, oldestFirst] of attempts) {
        const { data } = await admin
            .from('payment_receipts')
            .select('*')
            .eq(column, value)
            .order('issued_at', { ascending: oldestFirst })
            .limit(1)
            .maybeSingle()
        if (data) {
            receipt = data
            break
        }
    }
    if (!receipt) return null

    // Autorización: equipo de la organización o el residente dueño del pago
    let allowed = !!receipt.organization_id && await canOperateOrgFinance(admin, user.id, receipt.organization_id)
    if (!allowed && receipt.resident_id) {
        const { data: resident } = await admin.from('residents').select('user_id').eq('id', receipt.resident_id).maybeSingle()
        allowed = resident?.user_id === user.id
    }
    if (!allowed) return null

    // La firma está en un bucket privado: se incrusta como data URL
    let signatureDataUrl: string | null = null
    if (receipt.status === 'valido' && receipt.signer_signature_path) {
        const { data: file } = await admin.storage.from('signatures').download(receipt.signer_signature_path)
        if (file) signatureDataUrl = `data:image/png;base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`
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
