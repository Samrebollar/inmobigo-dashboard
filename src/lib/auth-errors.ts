// Reglas de contraseña configuradas en Supabase Auth (mínimo 8, letras y
// números, y rechazo de contraseñas filtradas). La validación del cliente es
// solo una ayuda: la regla definitiva la aplica Supabase.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_RULES_TEXT = 'Mínimo 8 caracteres, con letras y números'

export function validatePassword(password: string): string | null {
    if (password.length < PASSWORD_MIN_LENGTH) {
        return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
    }
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
        return 'La contraseña debe combinar letras y números.'
    }
    return null
}

/** Mensajes de Supabase Auth en español. */
export function translateAuthError(message?: string | null, code?: string | null): string {
    const msg = (message || '').toLowerCase()

    if (msg.includes('known to be weak') || msg.includes('pwned') || msg.includes('leaked')) {
        return 'Esta contraseña aparece en filtraciones conocidas o es muy fácil de adivinar. Por seguridad, elige otra.'
    }
    if (msg.includes('at least one character of each')) {
        return 'La contraseña debe incluir letras minúsculas, mayúsculas y números.'
    }
    if (msg.includes('password should be at least') || msg.includes('password is too short')) {
        return `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`
    }
    if (code === 'weak_password') {
        return 'La contraseña no es lo bastante segura. Usa al menos 8 caracteres combinando letras y números.'
    }
    if (msg.includes('already registered') || msg.includes('already been registered')) {
        return 'Ya existe una cuenta con este correo electrónico.'
    }
    if (msg.includes('same as the old') || msg.includes('should be different from the old')) {
        return 'La nueva contraseña debe ser diferente a la anterior.'
    }
    return message || 'Ocurrió un error. Intenta de nuevo.'
}

export function isPasswordError(message?: string | null, code?: string | null): boolean {
    const msg = (message || '').toLowerCase()
    return code === 'weak_password' || msg.includes('password')
}
