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
    updated_at: string | null
}

/** Campos que el administrador puede editar desde Mi Perfil. */
export type AdminIdentityInput = Omit<AdminIdentity, 'organization_id' | 'public_token' | 'updated_at'>

export const COMMITTEE_POSITIONS = ['Presidente', 'Tesorero', 'Secretario', 'Vocal', 'Suplente'] as const
