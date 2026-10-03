import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getPortalUnits } from '@/lib/owner-portal-access'
import { OWNER_RECORD_ROLE } from '@/lib/owner-record'
import { getCondoMercadoPagoAccount } from '@/services/mercadopago-connect-service'
import { OwnerPortalClient, type PortalInvoice, type PortalPayment, type PortalUnitView } from '@/components/propietario/owner-portal-client'

export const dynamic = 'force-dynamic'

const INVOICE_FIELDS = 'id, resident_id, folio, description, amount, balance_due, status, due_date, paid_at, payment_method, invoice_type, created_at'

export default async function PropietarioPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const admin = createAdminClient()
    const units = await getPortalUnits(admin, user.id)
    const unitIds = units.map((u) => u.unit_id)
    const condoIds = Array.from(new Set(units.map((u) => u.condominium_id)))
    const contactIds = Array.from(new Set(units.flatMap((u) => [u.owner_contact_id, u.manager_contact_id]).filter(Boolean))) as string[]

    const [{ data: condos }, { data: residents }, { data: contacts }] = await Promise.all([
        condoIds.length ? admin.from('condominiums').select('id, name').in('id', condoIds) : Promise.resolve({ data: [] as any[] }),
        unitIds.length
            ? admin.from('residents').select('id, unit_id, first_name, last_name, role, status').in('unit_id', unitIds)
            : Promise.resolve({ data: [] as any[] }),
        contactIds.length
            ? admin.from('unit_contacts').select('id, full_name, phone, email, user_id').in('id', contactIds)
            : Promise.resolve({ data: [] as any[] }),
    ])

    // Registro de cobro del propietario (activo o no, conserva su historial) y ocupantes actuales
    const ownerRecords = (residents || []).filter((r: any) => r.role === OWNER_RECORD_ROLE)
    const occupants = (residents || []).filter((r: any) => r.role !== OWNER_RECORD_ROLE && r.status !== 'inactive')
    const residentIds = [...ownerRecords, ...occupants].map((r: any) => r.id)

    const [{ data: invoices }, { data: payments }, mpStatus] = await Promise.all([
        residentIds.length
            ? admin.from('resident_invoices').select(INVOICE_FIELDS).in('resident_id', residentIds).neq('status', 'cancelled').order('due_date', { ascending: false }).limit(2000)
            : Promise.resolve({ data: [] as any[] }),
        ownerRecords.length
            ? admin
                .from('resident_invoice_payments')
                .select('id, resident_id, invoice_id, folio, amount, payment_method, paid_at, created_at')
                .in('resident_id', ownerRecords.map((r: any) => r.id))
                .order('paid_at', { ascending: false })
                .limit(500)
            : Promise.resolve({ data: [] as any[] }),
        Promise.all(condoIds.map(async (id) => [id, (await getCondoMercadoPagoAccount(id)).connected] as const)),
    ])

    const condoName = new Map((condos || []).map((c: any) => [c.id, c.name]))
    const contactById = new Map((contacts || []).map((c: any) => [c.id, c]))
    const mpConnected = new Map(mpStatus)
    const invoicesByResident = new Map<string, PortalInvoice[]>()
    for (const inv of (invoices || []) as any[]) {
        const list = invoicesByResident.get(inv.resident_id) || []
        list.push({
            id: inv.id,
            folio: inv.folio,
            description: inv.description,
            amount: Number(inv.amount || 0),
            balance_due: Number(inv.balance_due ?? inv.amount ?? 0),
            status: inv.status,
            due_date: inv.due_date,
            paid_at: inv.paid_at,
            payment_method: inv.payment_method,
            invoice_type: inv.invoice_type,
        })
        invoicesByResident.set(inv.resident_id, list)
    }
    const invoiceDescription = new Map((invoices || []).map((i: any) => [i.id, i.description]))
    const paymentsByResident = new Map<string, PortalPayment[]>()
    for (const p of (payments || []) as any[]) {
        const list = paymentsByResident.get(p.resident_id) || []
        list.push({
            id: p.id,
            folio: p.folio,
            amount: Number(p.amount || 0),
            payment_method: p.payment_method,
            paid_at: p.paid_at || p.created_at,
            concept: invoiceDescription.get(p.invoice_id) || 'Pago',
        })
        paymentsByResident.set(p.resident_id, list)
    }

    const view: PortalUnitView[] = units.map((u) => {
        const record: any = ownerRecords.find((r: any) => r.unit_id === u.unit_id) || null
        const owner: any = u.owner_contact_id ? contactById.get(u.owner_contact_id) : null
        const manager: any = u.manager_contact_id ? contactById.get(u.manager_contact_id) : null
        return {
            unit_id: u.unit_id,
            unit_number: u.unit_number,
            condominium_name: condoName.get(u.condominium_id) || 'Condominio',
            role: u.role,
            can_pay: u.can_pay,
            occupancy_type: u.occupancy_type,
            payment_responsible: u.payment_responsible,
            monto_mensual: u.monto_mensual,
            owner_name: owner?.full_name || null,
            manager: manager
                ? { name: manager.full_name, phone: manager.phone, email: manager.email, can_pay: u.manager_can_pay, has_access: !!manager.user_id }
                : null,
            mp_connected: !!mpConnected.get(u.condominium_id),
            owner_record_id: record?.id || null,
            owner_invoices: record ? invoicesByResident.get(record.id) || [] : [],
            owner_payments: record ? (paymentsByResident.get(record.id) || []).slice(0, 24) : [],
            occupants: occupants
                .filter((r: any) => r.unit_id === u.unit_id)
                .map((r: any) => ({
                    id: r.id,
                    name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'Residente',
                    invoices: (invoicesByResident.get(r.id) || []).filter((i) => i.status === 'pending' || i.status === 'overdue'),
                })),
        }
    })

    return (
        <Suspense>
            <OwnerPortalClient units={view} />
        </Suspense>
    )
}
