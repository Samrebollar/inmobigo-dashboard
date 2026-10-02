import { createHmac, randomInt } from 'crypto'
import { createAdminClient } from '@/utils/supabase/admin'
import { getSedetusStatus, type CommitteeMember } from '@/types/admin-identity'

type AdminClient = ReturnType<typeof createAdminClient>

/** Roles cuya firma NO vale como firma de la administración en un recibo. */
const NON_SIGNING_ROLES = ['security', 'resident', 'residente', 'tenant', 'viewer']

const ROLE_POSITION: Record<string, string> = {
    owner: 'Administrador principal',
    super_admin: 'Administrador principal',
    admin_condominio: 'Administrador',
    admin_propiedad: 'Administrador',
    admin: 'Administrador',
    manager: 'Gerente de administración',
    accountant: 'Contador',
    staff: 'Auxiliar de administración',
}

const SHORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const MISSING_SIGNATURE_ERROR = 'Para registrar o validar pagos primero debes subir tu firma en Mi Perfil. Todos los recibos llevan la firma de quien los valida.'
export const SECURITY_CANNOT_SIGN_ERROR = 'El personal de seguridad no puede registrar ni validar pagos: el recibo debe llevar la firma de la administración.'

function generateShortCode(): string {
    let code = ''
    for (let i = 0; i < 8; i++) code += SHORT_CODE_ALPHABET[randomInt(SHORT_CODE_ALPHABET.length)]
    return `${code.slice(0, 4)}-${code.slice(4)}`
}

function signingSecret(): string | null {
    return process.env.RECEIPT_SIGNING_SECRET || null
}

/**
 * Sello digital del recibo: HMAC-SHA256 de sus datos esenciales con una clave
 * que solo conoce el servidor. Si alguien cambia el monto, la fecha, el folio o
 * el firmante en la base de datos, el sello deja de coincidir.
 */
export function computeReceiptSeal(r: {
    payment_id: string
    folio: string | null
    amount: number | string
    paid_at: string | null
    resident_id: string | null
    organization_id: string | null
    signer_user_id: string | null
    sedetus_registration_number: string | null
    verify_token: string
    short_code: string
}): string | null {
    const secret = signingSecret()
    if (!secret) return null
    const canonical = JSON.stringify([
        'v1',
        r.payment_id,
        r.folio || '',
        Number(r.amount).toFixed(2),
        r.paid_at ? new Date(r.paid_at).toISOString() : '',
        r.resident_id || '',
        r.organization_id || '',
        r.signer_user_id || '',
        r.sedetus_registration_number || '',
        r.verify_token,
        r.short_code,
    ])
    return createHmac('sha256', secret).update(canonical).digest('hex')
}

/** Administrador principal de la organización: el dueño de la cuenta. */
export async function getOrgPrincipalUserId(admin: AdminClient, organizationId: string): Promise<string | null> {
    const { data: org } = await admin.from('organizations').select('owner_id').eq('id', organizationId).maybeSingle()
    if (org?.owner_id) return org.owner_id
    const { data: member } = await admin
        .from('organization_users')
        .select('user_id')
        .eq('organization_id', organizationId)
        .in('role_new', ['owner', 'super_admin', 'admin_condominio', 'admin_propiedad'])
        .limit(1)
        .maybeSingle()
    return member?.user_id || null
}

async function getOrgRole(admin: AdminClient, userId: string, organizationId: string): Promise<string | null> {
    const [{ data: org }, { data: member }] = await Promise.all([
        admin.from('organizations').select('owner_id').eq('id', organizationId).maybeSingle(),
        admin.from('organization_users').select('role_new').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle(),
    ])
    if (org?.owner_id === userId) return 'owner'
    return member?.role_new || null
}

/**
 * ¿Puede este usuario firmar (registrar/validar) pagos de la organización?
 * Exige que no sea seguridad y que ya haya subido su firma.
 */
export async function checkCanSignPayments(admin: AdminClient, userId: string, organizationId: string): Promise<{ ok: true } | { ok: false; error: string }> {
    const role = await getOrgRole(admin, userId, organizationId)
    if (role && NON_SIGNING_ROLES.includes(role)) return { ok: false, error: SECURITY_CANNOT_SIGN_ERROR }

    const { data: profile } = await admin.from('profiles').select('signature_path').eq('id', userId).maybeSingle()
    if (!profile?.signature_path) return { ok: false, error: MISSING_SIGNATURE_ERROR }
    return { ok: true }
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null
    return Array.isArray(value) ? value[0] || null : value
}

/**
 * Emite el recibo oficial de un pago (idempotente: si ya existe, lo devuelve).
 * El firmante es quien registró el pago (created_by); si el pago fue automático
 * (Mercado Pago, saldo a favor) o es histórico, firma el administrador
 * principal. Si el firmante aún no tiene firma, el recibo queda en
 * "firma_pendiente" hasta que la suba.
 *
 * Nunca lanza: un error aquí no debe tumbar el registro del pago (los recibos
 * faltantes se pueden volver a emitir después).
 */
export async function issuePaymentReceipt(
    admin: AdminClient,
    paymentId: string,
    mode: 'manual' | 'automatico' | 'historico' = 'manual'
): Promise<{ id: string; status: string } | null> {
    try {
        const { data: existing } = await admin.from('payment_receipts').select('id, status').eq('payment_id', paymentId).maybeSingle()
        if (existing) return existing

        const { data: payment } = await admin
            .from('resident_invoice_payments')
            .select('id, invoice_id, resident_id, condominium_id, organization_id, amount, folio, payment_method, notes, paid_at, created_by')
            .eq('id', paymentId)
            .maybeSingle()
        if (!payment) return null

        let organizationId: string | null = payment.organization_id
        if (!organizationId && payment.condominium_id) {
            const { data: condo } = await admin.from('condominiums').select('organization_id').eq('id', payment.condominium_id).maybeSingle()
            organizationId = condo?.organization_id || null
        }

        const [{ data: invoice }, { data: resident }, { data: identity }] = await Promise.all([
            payment.invoice_id
                ? admin.from('resident_invoices').select('description, invoice_type').eq('id', payment.invoice_id).maybeSingle()
                : Promise.resolve({ data: null }),
            payment.resident_id
                ? admin.from('residents').select('first_name, last_name, units(unit_number), condominiums(name)').eq('id', payment.resident_id).maybeSingle()
                : Promise.resolve({ data: null }),
            organizationId
                ? admin.from('admin_public_profiles').select('admin_type, display_name, legal_name, committee_members, sedetus_registration_number, sedetus_expiry_date').eq('organization_id', organizationId).maybeSingle()
                : Promise.resolve({ data: null }),
        ])

        // Firmante: quien registró el pago, salvo seguridad (su firma no vale)
        // o pagos sin registrador → administrador principal.
        let signerId: string | null = mode === 'manual' ? payment.created_by : null
        let signerRole: string | null = null
        if (signerId && organizationId) {
            signerRole = await getOrgRole(admin, signerId, organizationId)
            if (signerRole && NON_SIGNING_ROLES.includes(signerRole)) signerId = null
        }
        if (!signerId && organizationId) {
            signerId = await getOrgPrincipalUserId(admin, organizationId)
            signerRole = 'owner'
        }

        const { data: signer } = signerId
            ? await admin.from('profiles').select('full_name, email, signature_path').eq('id', signerId).maybeSingle()
            : { data: null }
        const signerName = signer?.full_name || signer?.email || 'Administración'

        // Cargo: en un Comité, el cargo con el que aparece en la ficha; si no, su rol
        const members: CommitteeMember[] = Array.isArray(identity?.committee_members) ? identity!.committee_members : []
        const memberPosition = identity?.admin_type === 'comite'
            ? members.find((m) => m.name?.trim().toLowerCase() === signerName.trim().toLowerCase())?.position
            : null
        const signerPosition = memberPosition || ROLE_POSITION[signerRole || ''] || 'Administración'

        const unit = firstRow((resident as any)?.units) as { unit_number?: string } | null
        const condo = firstRow((resident as any)?.condominiums) as { name?: string } | null
        const residentName = resident ? `${(resident as any).first_name || ''} ${(resident as any).last_name || ''}`.trim() : null

        const concept = invoice?.description
            || (payment.invoice_id ? 'Cuota de mantenimiento' : (payment.notes?.toLowerCase().includes('anticipo') ? 'Anticipo · saldo a favor' : 'Pago'))

        const base = {
            payment_id: payment.id,
            organization_id: organizationId,
            condominium_id: payment.condominium_id,
            resident_id: payment.resident_id,
            invoice_id: payment.invoice_id,
            folio: payment.folio,
            amount: Number(payment.amount),
            payment_method: payment.payment_method,
            concept,
            paid_at: payment.paid_at,
            resident_name: residentName,
            unit_number: unit?.unit_number || null,
            condominium_name: condo?.name || null,
            validation_mode: mode,
            signer_user_id: signerId,
            signer_name: signerName,
            signer_position: signerPosition,
            signer_signature_path: signer?.signature_path || null,
            admin_type: identity?.admin_type || null,
            admin_display_name: identity?.display_name || null,
            admin_legal_name: identity?.admin_type === 'empresa' ? identity?.legal_name || null : null,
            sedetus_registration_number: identity?.sedetus_registration_number || null,
            sedetus_expiry_date: identity?.sedetus_expiry_date || null,
            status: signer?.signature_path ? 'valido' : 'firma_pendiente',
        }

        // El código corto es único: se reintenta si choca (muy improbable)
        for (let attempt = 0; attempt < 5; attempt++) {
            const verify_token = crypto.randomUUID()
            const short_code = generateShortCode()
            const seal = computeReceiptSeal({ ...base, verify_token, short_code })
            if (!seal) console.error('[payment-receipts] Falta RECEIPT_SIGNING_SECRET: el recibo se emite sin sello')

            const { data: created, error } = await admin
                .from('payment_receipts')
                .insert({ ...base, verify_token, short_code, seal })
                .select('id, status')
                .single()

            if (!error) return created
            // Otro proceso ya emitió el recibo de este pago
            if (error.code === '23505' && error.message.includes('payment_id')) {
                const { data: raced } = await admin.from('payment_receipts').select('id, status').eq('payment_id', paymentId).maybeSingle()
                return raced
            }
            if (error.code !== '23505') {
                console.error('[payment-receipts] Error emitiendo recibo', paymentId, error.message)
                return null
            }
        }
        return null
    } catch (error) {
        console.error('[payment-receipts] Error inesperado emitiendo recibo', paymentId, error)
        return null
    }
}

/** Al subir su firma, los recibos que esperaban la firma de este usuario quedan válidos. */
export async function activatePendingReceipts(admin: AdminClient, userId: string, signaturePath: string): Promise<number> {
    const { data } = await admin
        .from('payment_receipts')
        .update({ status: 'valido', signer_signature_path: signaturePath })
        .eq('signer_user_id', userId)
        .eq('status', 'firma_pendiente')
        .select('id')
    return data?.length || 0
}

/** Estado de firma del usuario y de la acreditación SEDETUS de su organización (para avisos en pantalla). */
export async function getSigningStatus(admin: AdminClient, userId: string, organizationId: string) {
    const [role, { data: profile }, { data: identity }] = await Promise.all([
        getOrgRole(admin, userId, organizationId),
        admin.from('profiles').select('signature_path').eq('id', userId).maybeSingle(),
        admin.from('admin_public_profiles').select('sedetus_registration_number, sedetus_expiry_date').eq('organization_id', organizationId).maybeSingle(),
    ])
    return {
        canSignRole: !(role && NON_SIGNING_ROLES.includes(role)),
        hasSignature: !!profile?.signature_path,
        sedetusStatus: getSedetusStatus({
            sedetus_registration_number: identity?.sedetus_registration_number || null,
            sedetus_expiry_date: identity?.sedetus_expiry_date || null,
        }),
    }
}

/** URL firmada (temporal) para ver una firma del bucket privado. */
export async function signedSignatureUrl(admin: AdminClient, path: string): Promise<string | null> {
    const { data } = await admin.storage.from('signatures').createSignedUrl(path, 60 * 60)
    return data?.signedUrl || null
}

/** Firma actual de un usuario (para mostrársela a él mismo en Mi Perfil). Solo servidor. */
export async function getUserSignature(admin: AdminClient, userId: string): Promise<{ url: string | null; updatedAt: string | null } | null> {
    const { data: profile } = await admin.from('profiles').select('signature_path, signature_updated_at').eq('id', userId).maybeSingle()
    if (!profile?.signature_path) return null
    return { url: await signedSignatureUrl(admin, profile.signature_path), updatedAt: profile.signature_updated_at || null }
}
