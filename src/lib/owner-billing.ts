import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Cobro al propietario que no vive en la unidad (opción A).
 *
 * Cuando el dueño no habita la unidad, se le crea un registro en `residents`
 * con role = 'propietario_no_residente' (sin cuenta, sin correo) solo para
 * asignarle la cuota de mantenimiento: por ley el propietario responde por ella
 * aunque la unidad esté rentada o desocupada. Ese registro no es un residente:
 * no cuenta en ocupación, avisos, seguridad ni invitaciones.
 *
 * Solo debe usarse desde código de servidor ya autorizado.
 */

import { OWNER_RECORD_ROLE } from '@/lib/owner-record'
import { createCurrentMonthMaintenanceInvoice } from '@/lib/resident-billing'

export { OWNER_RECORD_ROLE, NOT_OWNER_RECORD, billsToOwnerRecord, isOwnerRecord } from '@/lib/owner-record'

type AdminClient = ReturnType<typeof createAdminClient>

/**
 * Crea, actualiza o desactiva el registro de cobro del propietario de cada
 * unidad según su ficha: existe (activo) mientras el propietario no viva en
 * la unidad. Se desactiva, nunca se borra, para conservar su historial de
 * cargos y pagos.
 */
export async function syncOwnerBillingRecords(admin: AdminClient, unitIds: string[]): Promise<void> {
    const ids = Array.from(new Set(unitIds.filter(Boolean)))
    if (ids.length === 0) return

    const [{ data: units }, { data: records }] = await Promise.all([
        admin.from('units').select('id, condominium_id, occupancy_type, owner_contact_id').in('id', ids),
        admin.from('residents').select('id, unit_id, status').in('unit_id', ids).eq('role', OWNER_RECORD_ROLE),
    ])
    const contactIds = Array.from(new Set((units || []).map((u: any) => u.owner_contact_id).filter(Boolean)))
    const { data: contacts } = contactIds.length
        ? await admin.from('unit_contacts').select('id, full_name, phone').in('id', contactIds)
        : { data: [] as any[] }
    const contactById = new Map((contacts || []).map((c: any) => [c.id, c]))
    const recordByUnit = new Map((records || []).map((r: any) => [r.unit_id, r]))

    for (const unit of units || []) {
        const record: any = recordByUnit.get(unit.id)
        const owner: any = unit.owner_contact_id ? contactById.get(unit.owner_contact_id) : null
        const needed = !!owner && (unit.occupancy_type || 'propietario') !== 'propietario'

        if (needed) {
            // Sin correo: residents.email es único y el mismo dueño puede tener
            // varias unidades. Su correo vive en unit_contacts.
            const fields = { first_name: owner.full_name, last_name: '', phone: owner.phone || null }
            if (record) {
                await admin
                    .from('residents')
                    .update({ ...fields, ...(record.status === 'inactive' ? { status: 'active', is_active: true } : {}) })
                    .eq('id', record.id)
            } else {
                const { error } = await admin.from('residents').insert({
                    ...fields,
                    condominium_id: unit.condominium_id,
                    unit_id: unit.id,
                    role: OWNER_RECORD_ROLE,
                    resident_type: 'condominio',
                    status: 'active',
                    is_active: true,
                })
                if (error) throw new Error(`No se pudo registrar el cobro al propietario: ${error.message}`)
            }
        } else if (record && record.status !== 'inactive') {
            await admin.from('residents').update({ status: 'inactive', is_active: false }).eq('id', record.id)
        }
    }

    // Cuota del mes en curso al propietario recién registrado, igual que a un
    // residente nuevo (sin esperar al cron). Es idempotente y no cobra dos veces
    // la misma unidad en el mes; si paga el inquilino, no hace nada.
    const { data: payers } = await admin
        .from('residents')
        .select('id')
        .in('unit_id', ids)
        .eq('role', OWNER_RECORD_ROLE)
        .neq('status', 'inactive')
    for (const payer of payers || []) {
        await createCurrentMonthMaintenanceInvoice(admin, payer.id)
    }
}

/** Unidades donde aparece alguno de estos propietarios (sus datos se reflejan en todas). */
export async function unitsOfOwnerContacts(admin: AdminClient, contactIds: (string | null | undefined)[]): Promise<string[]> {
    const ids = Array.from(new Set(contactIds.filter(Boolean))) as string[]
    if (ids.length === 0) return []
    const { data } = await admin.from('units').select('id').in('owner_contact_id', ids)
    return (data || []).map((u: any) => u.id)
}
