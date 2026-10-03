'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getFinanceOrgForCondo } from '@/lib/finance-auth'
import { normalizeMexicanPhone } from '@/utils/phone-utils'
import { NOT_OWNER_RECORD, syncOwnerBillingRecords, unitsOfOwnerContacts } from '@/lib/owner-billing'
import type {
    OccupancyType,
    PaymentResponsible,
    UnitContact,
    UnitContactInput,
    UnitContactKind,
    UnitOwnership,
} from '@/types/unit-ownership'

type AdminClient = ReturnType<typeof createAdminClient>

const OCCUPANCY: OccupancyType[] = ['propietario', 'inquilino', 'vacacional', 'desocupada']
const RESPONSIBLE: PaymentResponsible[] = ['propietario', 'gestor', 'inquilino']

/**
 * Equipo de la organización dueña del condominio. Para escribir se excluye a
 * seguridad (solo consulta).
 */
async function authorize(condominiumId: string, write: boolean): Promise<{ admin: AdminClient; organizationId: string } | { error: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autorizado' }

    const admin = createAdminClient()
    const organizationId = await getFinanceOrgForCondo(admin, user.id, condominiumId)
    if (!organizationId) return { error: 'No tienes permiso para esta propiedad' }

    if (write) {
        const { data: member } = await admin
            .from('organization_users')
            .select('role_new')
            .eq('organization_id', organizationId)
            .eq('user_id', user.id)
            .maybeSingle()
        if (member?.role_new === 'security') return { error: 'Seguridad no puede modificar los datos de propietarios' }
    }
    return { admin, organizationId }
}

const clean = (v: unknown, max = 200): string | null => {
    if (typeof v !== 'string') return null
    const t = v.trim()
    return t ? t.slice(0, max) : null
}

const toContact = (row: any): UnitContact | null => row
    ? { id: row.id, kind: row.kind, full_name: row.full_name, phone: row.phone, email: row.email }
    : null

/** Propietarios y gestores ya registrados en la organización, y la ficha de cada unidad del condominio. */
export async function getUnitOwnershipAction(condominiumId: string): Promise<
    { success: true; units: UnitOwnership[]; contacts: UnitContact[] } | { success: false; error: string }
> {
    const auth = await authorize(condominiumId, false)
    if ('error' in auth) return { success: false, error: auth.error }
    const { admin, organizationId } = auth

    const [{ data: units, error: unitsError }, { data: contacts }, { data: residents }] = await Promise.all([
        admin
            .from('units')
            .select('id, unit_number, occupancy_type, payment_responsible, owner_contact_id, co_owner_contact_id, manager_contact_id, manager_can_pay')
            .eq('condominium_id', condominiumId)
            .order('unit_number', { ascending: true }),
        admin
            .from('unit_contacts')
            .select('id, kind, full_name, phone, email')
            .eq('organization_id', organizationId)
            .order('full_name', { ascending: true }),
        admin
            .from('residents')
            .select('unit_id, first_name, last_name, status')
            .eq('condominium_id', condominiumId)
            .or(NOT_OWNER_RECORD),
    ])
    if (unitsError) return { success: false, error: unitsError.message }

    const byId = new Map((contacts || []).map((c: any) => [c.id, c]))
    const occupantsByUnit = new Map<string, string[]>()
    for (const r of residents || []) {
        if (!r.unit_id || r.status === 'inactive') continue
        const list = occupantsByUnit.get(r.unit_id) || []
        list.push(`${r.first_name || ''} ${r.last_name || ''}`.trim())
        occupantsByUnit.set(r.unit_id, list)
    }

    return {
        success: true,
        contacts: (contacts || []).map(toContact) as UnitContact[],
        units: (units || []).map((u: any) => ({
            unit_id: u.id,
            unit_number: u.unit_number,
            occupancy_type: u.occupancy_type || 'propietario',
            payment_responsible: u.payment_responsible || 'propietario',
            owner: toContact(byId.get(u.owner_contact_id)),
            co_owner: toContact(byId.get(u.co_owner_contact_id)),
            manager: toContact(byId.get(u.manager_contact_id)),
            manager_can_pay: !!u.manager_can_pay,
            occupants: occupantsByUnit.get(u.id) || [],
        })),
    }
}

/** Crea o actualiza un contacto de la organización y devuelve su id. */
async function upsertContact(
    admin: AdminClient,
    organizationId: string,
    kind: UnitContactKind,
    input: UnitContactInput | null | undefined
): Promise<string | null> {
    if (!input) return null
    // Conservar un contacto ya asignado sin modificarlo (carga masiva)
    if (input.keep && input.id) return input.id
    const fullName = clean(input.full_name, 120)
    if (!fullName) return null
    const phoneRaw = clean(input.phone, 30)
    const fields = {
        full_name: fullName,
        phone: phoneRaw ? normalizeMexicanPhone(phoneRaw) || phoneRaw : null,
        email: clean(input.email, 160)?.toLowerCase() || null,
        updated_at: new Date().toISOString(),
    }

    if (input.id) {
        const { data } = await admin
            .from('unit_contacts')
            .update(fields)
            .eq('id', input.id)
            .eq('organization_id', organizationId)
            .eq('kind', kind)
            .select('id')
            .maybeSingle()
        if (data) return data.id
    }

    const { data, error } = await admin
        .from('unit_contacts')
        .insert({ organization_id: organizationId, kind, ...fields })
        .select('id')
        .single()
    if (error) throw new Error(error.message)
    return data.id
}

export interface SaveUnitOwnershipInput {
    occupancy_type: OccupancyType
    payment_responsible: PaymentResponsible
    owner: UnitContactInput | null
    co_owner: UnitContactInput | null
    manager: UnitContactInput | null
    manager_can_pay: boolean
}

const hasContact = (c: UnitContactInput | null | undefined) => !!c && ((!!c.keep && !!c.id) || !!clean(c.full_name))

function validate(input: SaveUnitOwnershipInput): string | null {
    if (!OCCUPANCY.includes(input.occupancy_type)) return 'Selecciona quién ocupa la unidad'
    if (!RESPONSIBLE.includes(input.payment_responsible)) return 'Selecciona quién paga la cuota'
    const ownerLivesThere = input.occupancy_type === 'propietario'
    if (!ownerLivesThere && !hasContact(input.owner)) {
        return 'Captura el nombre del propietario: no vive en la unidad y es quien responde por la cuota'
    }
    if (input.payment_responsible === 'gestor' && !hasContact(input.manager)) {
        return 'Para que pague el gestor, captura sus datos'
    }
    if (input.payment_responsible === 'inquilino' && input.occupancy_type !== 'inquilino') {
        return 'Solo puede pagar el inquilino si la unidad está rentada a un inquilino'
    }
    return null
}

async function applyOwnership(admin: AdminClient, organizationId: string, unitId: string, input: SaveUnitOwnershipInput): Promise<string | null> {
    const [ownerId, coOwnerId, managerId] = await Promise.all([
        upsertContact(admin, organizationId, 'propietario', input.owner),
        upsertContact(admin, organizationId, 'propietario', input.co_owner),
        upsertContact(admin, organizationId, 'gestor', input.manager),
    ])
    const { error } = await admin
        .from('units')
        .update({
            occupancy_type: input.occupancy_type,
            payment_responsible: input.payment_responsible,
            owner_contact_id: ownerId,
            co_owner_contact_id: coOwnerId,
            manager_contact_id: managerId,
            manager_can_pay: managerId ? !!input.manager_can_pay : false,
        })
        .eq('id', unitId)
    if (error) throw new Error(error.message)
    return ownerId
}

/** Guarda propietario, copropietario, gestor, ocupación y responsable de pago de una unidad. */
export async function saveUnitOwnershipAction(unitId: string, input: SaveUnitOwnershipInput): Promise<{ success: true } | { success: false; error: string }> {
    const lookup = createAdminClient()
    const { data: unit } = await lookup.from('units').select('id, condominium_id').eq('id', unitId).maybeSingle()
    if (!unit) return { success: false, error: 'Unidad no encontrada' }

    const auth = await authorize(unit.condominium_id, true)
    if ('error' in auth) return { success: false, error: auth.error }

    const invalid = validate(input)
    if (invalid) return { success: false, error: invalid }

    try {
        const ownerId = await applyOwnership(auth.admin, auth.organizationId, unitId, input)
        // Registro de cobro del propietario de esta unidad y de las demás donde aparece
        await syncOwnerBillingRecords(auth.admin, [unitId, ...await unitsOfOwnerContacts(auth.admin, [ownerId])])
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message || 'No se pudo guardar' }
    }
}

export interface BulkOwnershipRow {
    unit_number: string
    occupancy?: string | null
    owner_name?: string | null
    owner_phone?: string | null
    owner_email?: string | null
    manager_name?: string | null
    manager_phone?: string | null
    manager_email?: string | null
}

function parseOccupancy(raw: string | null | undefined): OccupancyType | null {
    const v = (raw || '').toLowerCase()
    if (!v) return null
    if (v.includes('vacacional') || v.includes('airbnb')) return 'vacacional'
    if (v.includes('inquilino') || v.includes('renta')) return 'inquilino'
    if (v.includes('desocup') || v.includes('vac')) return 'desocupada'
    if (v.includes('propiet') || v.includes('dueñ') || v.includes('duen')) return 'propietario'
    return null
}

/**
 * Carga masiva: aplica ocupación, propietario y gestor a las unidades por su
 * número. Un mismo propietario o gestor (mismo correo o teléfono) se reutiliza
 * entre unidades. Lo que la fila no trae (copropietario, gestor, permiso de
 * pago) se conserva como estaba en la unidad.
 */
export async function bulkApplyUnitOwnershipAction(condominiumId: string, rows: BulkOwnershipRow[]): Promise<{ success: true; updated: number; errors: string[] } | { success: false; error: string }> {
    const auth = await authorize(condominiumId, true)
    if ('error' in auth) return { success: false, error: auth.error }
    const { admin, organizationId } = auth

    const relevant = rows.filter((r) => r.unit_number && (r.occupancy || r.owner_name || r.manager_name)).slice(0, 2000)
    if (relevant.length === 0) return { success: true, updated: 0, errors: [] }

    const [{ data: units }, { data: contacts }] = await Promise.all([
        admin
            .from('units')
            .select('id, unit_number, occupancy_type, payment_responsible, owner_contact_id, co_owner_contact_id, manager_contact_id, manager_can_pay')
            .eq('condominium_id', condominiumId),
        admin.from('unit_contacts').select('id, kind, phone, email').eq('organization_id', organizationId),
    ])
    const unitByNumber = new Map((units || []).map((u: any) => [String(u.unit_number).toLowerCase(), u]))
    const knownContacts = [...(contacts || [])] as { id: string; kind: string; phone: string | null; email: string | null }[]
    const findContact = (kind: UnitContactKind, phone?: string | null, email?: string | null) => {
        const p = phone ? normalizeMexicanPhone(phone) || phone : null
        const e = email?.trim().toLowerCase() || null
        return knownContacts.find((c) => c.kind === kind && ((e && c.email === e) || (p && c.phone === p)))?.id || null
    }
    const keep = (id: string | null): UnitContactInput | null => (id ? { id, full_name: '', keep: true } : null)

    const errors: string[] = []
    let updated = 0
    const touchedUnits: string[] = []
    const touchedOwners = new Set<string>()
    for (const row of relevant) {
        const unit: any = unitByNumber.get(String(row.unit_number).toLowerCase())
        if (!unit) {
            errors.push(`Unidad ${row.unit_number}: no existe`)
            continue
        }
        const occupancy = parseOccupancy(row.occupancy) || (row.owner_name ? 'inquilino' : unit.occupancy_type)
        const managerId = row.manager_name ? findContact('gestor', row.manager_phone, row.manager_email) : unit.manager_contact_id
        const input: SaveUnitOwnershipInput = {
            occupancy_type: occupancy,
            payment_responsible: unit.payment_responsible === 'inquilino' && occupancy !== 'inquilino' ? 'propietario' : unit.payment_responsible,
            owner: row.owner_name
                ? { id: findContact('propietario', row.owner_phone, row.owner_email), full_name: row.owner_name, phone: row.owner_phone, email: row.owner_email }
                : keep(unit.owner_contact_id),
            co_owner: keep(unit.co_owner_contact_id),
            manager: row.manager_name
                ? { id: managerId, full_name: row.manager_name, phone: row.manager_phone, email: row.manager_email }
                : keep(unit.manager_contact_id),
            manager_can_pay: !!managerId && managerId === unit.manager_contact_id && !!unit.manager_can_pay,
        }
        const invalid = validate(input)
        if (invalid) {
            errors.push(`Unidad ${row.unit_number}: ${invalid}`)
            continue
        }
        try {
            await applyOwnership(admin, organizationId, unit.id, input)
            // Un contacto nuevo de esta carga se reutiliza en las siguientes filas
            const { data: fresh } = await admin.from('units').select('owner_contact_id, manager_contact_id').eq('id', unit.id).maybeSingle()
            for (const [id, kind, phone, email] of [
                [fresh?.owner_contact_id, 'propietario', row.owner_phone, row.owner_email],
                [fresh?.manager_contact_id, 'gestor', row.manager_phone, row.manager_email],
            ] as [string | null, string, string | null | undefined, string | null | undefined][]) {
                if (id && !knownContacts.some((c) => c.id === id)) {
                    knownContacts.push({ id, kind, phone: phone ? normalizeMexicanPhone(phone) || phone : null, email: email?.trim().toLowerCase() || null })
                }
            }
            touchedUnits.push(unit.id)
            if (fresh?.owner_contact_id) touchedOwners.add(fresh.owner_contact_id)
            updated++
        } catch (error: any) {
            errors.push(`Unidad ${row.unit_number}: ${error.message}`)
        }
    }
    try {
        await syncOwnerBillingRecords(admin, [...touchedUnits, ...await unitsOfOwnerContacts(admin, [...touchedOwners])])
    } catch (error: any) {
        errors.push(error.message)
    }
    return { success: true, updated, errors }
}
