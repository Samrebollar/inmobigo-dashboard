export type AdminType = 'empresa' | 'comite'

export interface CommitteeMember {
    name: string
    position: string
    unit: string | null
    phone: string | null
    email: string | null
}

/** Fila de admin_public_profiles: la ficha pública del administrador (Empresa o Comité). */
export interface AdminIdentity {
    organization_id: string
    admin_type: AdminType | null
    public_token: string
    is_public: boolean
    display_name: string | null
    logo_url: string | null
    legal_name: string | null
    rfc: string | null
    legal_representative: string | null
    fiscal_address: string | null
    website: string | null
    committee_period_start: string | null
    committee_period_end: string | null
    assembly_date: string | null
    committee_members: CommitteeMember[]
    contact_phone: string | null
    contact_email: string | null
    office_address: string | null
    office_hours: string | null
    description: string | null
    // Matriculación y Acreditación de Administrador Condominal (SEDETUS)
    sedetus_registration_number: string | null
    sedetus_holder_name: string | null
    sedetus_issue_date: string | null
    sedetus_expiry_date: string | null
    sedetus_document_url: string | null
    updated_at: string | null
}

/** Campos que el administrador puede editar desde Mi Perfil. */
export type AdminIdentityInput = Omit<AdminIdentity, 'organization_id' | 'public_token' | 'updated_at'>

export type SedetusStatus = 'vigente' | 'por_vencer' | 'vencida' | 'sin_vigencia' | 'sin_registro'

/** Estado de la acreditación SEDETUS según su número de registro y fecha de vencimiento. */
export function getSedetusStatus(identity: Pick<AdminIdentity, 'sedetus_registration_number' | 'sedetus_expiry_date'>, today = new Date()): SedetusStatus {
    if (!identity.sedetus_registration_number) return 'sin_registro'
    if (!identity.sedetus_expiry_date) return 'sin_vigencia'
    const expiry = new Date(`${identity.sedetus_expiry_date}T23:59:59`)
    const days = (expiry.getTime() - today.getTime()) / 86400000
    if (days < 0) return 'vencida'
    if (days <= 30) return 'por_vencer'
    return 'vigente'
}

export const SEDETUS_STATUS_LABEL: Record<SedetusStatus, string> = {
    vigente: 'Vigente',
    por_vencer: 'Por vencer',
    vencida: 'Vencida',
    sin_vigencia: 'Registrada',
    sin_registro: 'Sin registrar',
}

export const COMMITTEE_POSITIONS = ['Presidente', 'Tesorero', 'Secretario', 'Vocal', 'Suplente'] as const
