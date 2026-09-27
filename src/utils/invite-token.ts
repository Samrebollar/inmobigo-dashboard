import crypto from 'crypto'

// Sin un secreto real configurado, cualquiera podría firmar su propio token de
// invitación válido para vincularse a cualquier condominio — antes había un
// tercer valor fijo de respaldo aquí mismo en el código (visible para quien
// tenga el repo), lo cual anulaba la firma si por algún motivo faltaban las
// dos variables de entorno reales.
function getSecretKey(): string {
    const key = process.env.MP_CLIENT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!key) {
        throw new Error('Falta configurar MP_CLIENT_SECRET o SUPABASE_SERVICE_ROLE_KEY para firmar tokens de invitación.')
    }
    return key
}

const SECRET_KEY = getSecretKey()

export interface InviteTokenPayload {
    cid: string // condominium_id
    exp: number // timestamp de expiración
    nonce: string // aleatoriedad única
}

export interface VerifyTokenResult {
    valid: boolean
    condominiumId?: string
    expiresAt?: string
    error?: string
}

/**
 * Genera un token firmado HMAC SHA-256 codificado en base64url.
 * Expira en `expiresInHours` (por defecto 48h).
 */
export function generateInviteToken(condominiumId: string, expiresInHours = 48): { token: string; expiresAt: Date } {
    const expiresAtMs = Date.now() + expiresInHours * 3600 * 1000
    const expiresAt = new Date(expiresAtMs)

    const payload: InviteTokenPayload = {
        cid: condominiumId,
        exp: expiresAtMs,
        nonce: crypto.randomBytes(16).toString('hex'),
    }

    const payloadStr = JSON.stringify(payload)
    const payloadBase64 = Buffer.from(payloadStr).toString('base64url')

    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(payloadBase64)
        .digest('hex')

    const token = `${payloadBase64}.${signature}`
    return { token, expiresAt }
}

/**
 * Verifica la firma y la vigencia de un token de invitación.
 */
export function verifyInviteToken(token: string): VerifyTokenResult {
    if (!token || typeof token !== 'string') {
        return { valid: false, error: 'Token no proporcionado' }
    }

    const parts = token.split('.')
    if (parts.length !== 2) {
        return { valid: false, error: 'Formato de token inválido' }
    }

    const [payloadBase64, providedSignature] = parts

    // 1. Verificar firma criptográfica
    const expectedSignature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(payloadBase64)
        .digest('hex')

    // Evitar ataques de temporización utilizando timingSafeEqual
    const providedBuffer = Buffer.from(providedSignature, 'hex')
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')

    if (
        providedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
        return { valid: false, error: 'Firma de invitación inválida o alterada' }
    }

    // 2. Decodificar y verificar expiración
    try {
        const payloadStr = Buffer.from(payloadBase64, 'base64url').toString('utf8')
        const payload: InviteTokenPayload = JSON.parse(payloadStr)

        if (!payload.cid || !payload.exp) {
            return { valid: false, error: 'Estructura de invitación incompleta' }
        }

        if (Date.now() > payload.exp) {
            return { valid: false, error: 'Este enlace de invitación ha expirado (válido por 48 horas)' }
        }

        return {
            valid: true,
            condominiumId: payload.cid,
            expiresAt: new Date(payload.exp).toISOString(),
        }
    } catch (err) {
        return { valid: false, error: 'Error decodificando token de invitación' }
    }
}
