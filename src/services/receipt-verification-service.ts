import { createAdminClient } from '@/utils/supabase/admin'
import { computeReceiptSeal } from '@/lib/payment-receipts'

export interface VerifiedReceipt {
    status: 'valido' | 'firma_pendiente' | 'cancelado'
    sealOk: boolean | null
    folio: string | null
    shortCode: string
    total: number
    items: { concept: string | null; amount: number }[]
    paymentMethod: string | null
    paidAt: string | null
    issuedAt: string
    residentName: string | null
    unitNumber: string | null
    condominiumName: string | null
    validationMode: string
    signerName: string | null
    signerPosition: string | null
    adminType: string | null
    adminDisplayName: string | null
    sedetusNumber: string | null
    sedetusExpiry: string | null
    adminCardPath: string | null
    canceledAt: string | null
    cancelReason: string | null
}

/** "Clara Suaste López" → "Clara S." (la página de verificación es pública). */
export function maskName(name: string | null): string | null {
    if (!name) return null
    const [first, ...rest] = name.trim().split(/\s+/)
    return rest.length ? `${first} ${rest[0][0].toUpperCase()}.` : first
}

const SHORT_CODE_RE = /^[A-Z0-9]{4}-?[A-Z0-9]{4}$/

export function normalizeShortCode(raw: string): string | null {
    const clean = raw.trim().toUpperCase().replace(/\s+/g, '')
    if (!SHORT_CODE_RE.test(clean)) return null
    return clean.includes('-') ? clean : `${clean.slice(0, 4)}-${clean.slice(4)}`
}

export async function findTokenByShortCode(raw: string): Promise<string | null> {
    const code = normalizeShortCode(raw)
    if (!code) return null
    const { data } = await createAdminClient().from('payment_receipts').select('verify_token').eq('short_code', code).maybeSingle()
    return data?.verify_token || null
}

/**
 * Resuelve un recibo por su token de verificación. Si el cobro abarcó varias
 * cuotas (varios pagos con el mismo folio), devuelve el desglose y el total.
 * Recalcula el sello digital de cada pago para detectar alteraciones.
 */
export async function getVerifiedReceipt(token: string): Promise<VerifiedReceipt | null> {
    if (!/^[0-9a-f-]{36}$/i.test(token)) return null
    const admin = createAdminClient()

    const { data: receipt } = await admin.from('payment_receipts').select('*').eq('verify_token', token).maybeSingle()
    if (!receipt) return null

    // Otros pagos del mismo cobro (mismo folio y residente)
    let group = [receipt]
    if (receipt.folio && receipt.resident_id) {
        const { data: siblings } = await admin
            .from('payment_receipts')
            .select('*')
            .eq('folio', receipt.folio)
            .eq('resident_id', receipt.resident_id)
            .order('issued_at', { ascending: true })
        if (siblings && siblings.length > 0) group = siblings
    }

    const sealResults = group.map((r) => {
        if (!r.seal) return null
        const expected = computeReceiptSeal(r)
        return expected === null ? null : expected === r.seal
    })
    const sealOk = sealResults.some((s) => s === false) ? false : sealResults.every((s) => s === true) ? true : null

    const { data: card } = receipt.organization_id
        ? await admin.from('admin_public_profiles').select('public_token, is_public').eq('organization_id', receipt.organization_id).maybeSingle()
        : { data: null }

    const status = group.some((r) => r.status === 'cancelado')
        ? 'cancelado'
        : group.some((r) => r.status === 'firma_pendiente') ? 'firma_pendiente' : 'valido'

    return {
        status,
        sealOk,
        folio: receipt.folio,
        shortCode: receipt.short_code,
        total: group.reduce((sum, r) => sum + Number(r.amount), 0),
        items: group.map((r) => ({ concept: r.concept, amount: Number(r.amount) })),
        paymentMethod: receipt.payment_method,
        paidAt: receipt.paid_at,
        issuedAt: receipt.issued_at,
        residentName: maskName(receipt.resident_name),
        unitNumber: receipt.unit_number,
        condominiumName: receipt.condominium_name,
        validationMode: receipt.validation_mode,
        signerName: receipt.signer_name,
        signerPosition: receipt.signer_position,
        adminType: receipt.admin_type,
        adminDisplayName: receipt.admin_display_name,
        sedetusNumber: receipt.sedetus_registration_number,
        sedetusExpiry: receipt.sedetus_expiry_date,
        adminCardPath: card?.is_public ? `/administrador/${card.public_token}` : null,
        canceledAt: group.find((r) => r.canceled_at)?.canceled_at || null,
        cancelReason: group.find((r) => r.cancel_reason)?.cancel_reason || null,
    }
}
