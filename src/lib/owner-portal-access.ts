import { createAdminClient } from '@/utils/supabase/admin'
import { OWNER_RECORD_ROLE } from '@/lib/owner-record'

/**
 * Acceso del Portal de Propietarios y Gestores. Una cuenta ve las unidades
 * donde alguno de sus contactos (unit_contacts.user_id) es propietario,
 * copropietario o gestor, en cualquier condominio u organización.
 *
 * Solo debe usarse desde código de servidor.
 */

type AdminClient = ReturnType<typeof createAdminClient>

export type PortalRole = 'propietario' | 'copropietario' | 'gestor'

export interface PortalUnitAccess {
    unit_id: string
    unit_number: string
    condominium_id: string
    occupancy_type: string
    payment_responsible: string
    monto_mensual: number
    owner_contact_id: string | null
    co_owner_contact_id: string | null
    manager_contact_id: string | null
    manager_can_pay: boolean
    role: PortalRole
    /** Propietario o copropietario: siempre; gestor: si el dueño lo autorizó */
    can_pay: boolean
}

export async function getPortalContactIds(admin: AdminClient, userId: string): Promise<string[]> {
    const { data } = await admin.from('unit_contacts').select('id').eq('user_id', userId)
    return (data || []).map((c: any) => c.id)
}

export async function getPortalUnits(admin: AdminClient, userId: string): Promise<PortalUnitAccess[]> {
    const ids = await getPortalContactIds(admin, userId)
    if (ids.length === 0) return []
    const list = ids.join(',')
    const { data: units } = await admin
        .from('units')
        .select('id, unit_number, condominium_id, occupancy_type, payment_responsible, monto_mensual, owner_contact_id, co_owner_contact_id, manager_contact_id, manager_can_pay')
        .or(`owner_contact_id.in.(${list}),co_owner_contact_id.in.(${list}),manager_contact_id.in.(${list})`)
        .order('unit_number', { ascending: true })

    const mine = new Set(ids)
    return (units || []).map((u: any) => {
        const role: PortalRole = mine.has(u.owner_contact_id) ? 'propietario' : mine.has(u.co_owner_contact_id) ? 'copropietario' : 'gestor'
        return {
            unit_id: u.id,
            unit_number: u.unit_number,
            condominium_id: u.condominium_id,
            occupancy_type: u.occupancy_type || 'propietario',
            payment_responsible: u.payment_responsible || 'propietario',
            monto_mensual: Number(u.monto_mensual || 0),
            owner_contact_id: u.owner_contact_id,
            co_owner_contact_id: u.co_owner_contact_id,
            manager_contact_id: u.manager_contact_id,
            manager_can_pay: !!u.manager_can_pay,
            role,
            can_pay: role !== 'gestor' || !!u.manager_can_pay,
        }
    })
}

/** Unidad del portal a la que pertenece un residente (registro de cobro u ocupante), o null. */
export async function getPortalAccessForResident(admin: AdminClient, userId: string, residentId: string): Promise<{ unit: PortalUnitAccess; isOwnerRecord: boolean } | null> {
    const { data: resident } = await admin.from('residents').select('id, unit_id, role').eq('id', residentId).maybeSingle()
    if (!resident?.unit_id) return null
    const unit = (await getPortalUnits(admin, userId)).find((u) => u.unit_id === resident.unit_id)
    if (!unit) return null
    return { unit, isOwnerRecord: resident.role === OWNER_RECORD_ROLE }
}
