export type Role = 'owner' | 'admin' | 'manager' | 'accountant' | 'staff' | 'viewer' | 'admin_condominio' | 'admin_propiedad' | 'security' | 'resident' | 'tenant'

export type Permission =
    | 'view_dashboard'
    | 'manage_organization'
    | 'manage_team'
    | 'manage_billing'
    | 'view_finance'
    | 'manage_properties'
    | 'manage_residents'
    | 'manage_tickets'
    | 'create_tickets'

export interface UserRoleContext {
    role: Role | null
    loading: boolean
    organizationId: string | null
    permissions: Permission[]
    isOwner: boolean
    isAdmin: boolean
    can: (permission: Permission) => boolean
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    owner: [
        'view_dashboard', 'manage_organization', 'manage_team', 'manage_billing',
        'view_finance', 'manage_properties', 'manage_residents', 'manage_tickets', 'create_tickets'
    ],
    admin: [
        'view_dashboard', 'manage_team', 'manage_billing',
        'view_finance', 'manage_properties', 'manage_residents', 'manage_tickets', 'create_tickets'
    ],
    admin_condominio: [
        'view_dashboard', 'manage_team', 'manage_billing',
        'view_finance', 'manage_properties', 'manage_residents', 'manage_tickets', 'create_tickets'
    ],
    admin_propiedad: [
        'view_dashboard', 'manage_organization', 'manage_team', 'manage_billing',
        'view_finance', 'manage_properties', 'manage_residents', 'manage_tickets', 'create_tickets'
    ],
    manager: [
        'view_dashboard', 'view_finance', 'manage_properties',
        'manage_residents', 'manage_tickets', 'create_tickets'
    ],
    accountant: [
        'view_dashboard', 'manage_billing', 'view_finance'
    ],
    staff: [
        'view_dashboard', 'manage_properties', 'manage_residents', 'create_tickets'
    ],
    security: [
        'view_dashboard', 'manage_properties', 'create_tickets'
    ],
    resident: [
        'view_dashboard', 'create_tickets'
    ],
    tenant: [
        'view_dashboard', 'create_tickets'
    ],
    viewer: [
        'view_dashboard'
    ]
}
