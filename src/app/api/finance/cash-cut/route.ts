import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { canOperateOrgFinance } from '@/lib/finance-auth'
import { DEPOSIT_RETAINED_METHOD } from '@/lib/invoice-types'

/**
 * GET /api/finance/cash-cut?organization_id=..&condominium_id=..&date=YYYY-MM-DD
 *
 * Corte de caja: todos los pagos registrados en un día (hora de México), con
 * concepto, residente, método y quién lo cobró. Los totales por método y por
 * persona se calculan en el cliente.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || ''
    const condominiumId = searchParams.get('condominium_id') || ''
    const date = searchParams.get('date') || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })

    if (!organizationId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: 'organization_id y date (YYYY-MM-DD) son requeridos' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    if (!(await canOperateOrgFinance(admin, user.id, organizationId))) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // México (CDMX) es UTC-6 todo el año desde 2022
    const start = new Date(`${date}T00:00:00-06:00`).toISOString()
    const end = new Date(new Date(`${date}T00:00:00-06:00`).getTime() + 86400000).toISOString()

    let query = admin
        .from('resident_invoice_payments')
        .select('id, invoice_id, resident_id, condominium_id, amount, folio, payment_method, notes, paid_at, created_by')
        .eq('organization_id', organizationId)
        .gte('paid_at', start)
        .lt('paid_at', end)
        .order('paid_at', { ascending: true })
    if (condominiumId) query = query.eq('condominium_id', condominiumId)

    const { data: payments, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Lo retenido de un depósito en garantía no es dinero que entre ese día:
    // ya se cobró cuando el residente pagó el depósito
    const rows = (payments || []).filter(p => p.payment_method !== DEPOSIT_RETAINED_METHOD)
    const ids = <T,>(arr: (T | null | undefined)[]) => Array.from(new Set(arr.filter(Boolean))) as T[]
    const invoiceIds = ids(rows.map(p => p.invoice_id as string))
    const residentIds = ids(rows.map(p => p.resident_id as string))
    const userIds = ids(rows.map(p => p.created_by as string))
    const condoIds = ids(rows.map(p => p.condominium_id as string))

    const [invoicesRes, residentsRes, profilesRes, condosRes] = await Promise.all([
        invoiceIds.length ? admin.from('invoices').select('id, description, invoice_type, due_date').in('id', invoiceIds) : Promise.resolve({ data: [] }),
        residentIds.length ? admin.from('residents').select('id, first_name, last_name, units(unit_number)').in('id', residentIds) : Promise.resolve({ data: [] }),
        userIds.length ? admin.from('profiles').select('id, full_name, email').in('id', userIds) : Promise.resolve({ data: [] }),
        condoIds.length ? admin.from('condominiums').select('id, name').in('id', condoIds) : Promise.resolve({ data: [] }),
    ])

    type Inv = { id: string, description?: string | null, invoice_type?: string | null, due_date?: string | null }
    type Res = { id: string, first_name?: string | null, last_name?: string | null, units?: { unit_number?: string } | { unit_number?: string }[] | null }
    type Prof = { id: string, full_name?: string | null, email?: string | null }
    type Condo = { id: string, name?: string | null }
    const invMap = new Map(((invoicesRes.data || []) as Inv[]).map(i => [i.id, i]))
    const resMap = new Map(((residentsRes.data || []) as Res[]).map(r => [r.id, r]))
    const profMap = new Map(((profilesRes.data || []) as Prof[]).map(p => [p.id, p]))
    const condoMap = new Map(((condosRes.data || []) as Condo[]).map(c => [c.id, c]))

    const result = rows.map(p => {
        const inv = invMap.get(p.invoice_id as string)
        const res = resMap.get(p.resident_id as string)
        const unit = Array.isArray(res?.units) ? res?.units[0] : res?.units
        const prof = p.created_by ? profMap.get(p.created_by as string) : null
        return {
            id: p.id,
            folio: p.folio,
            paid_at: p.paid_at,
            amount: Number(p.amount || 0),
            method: p.payment_method || 'Sin especificar',
            concept: inv?.description || (p.invoice_id ? 'Pago' : 'Anticipo (saldo a favor)'),
            resident: res ? `${res.first_name || ''} ${res.last_name || ''}`.trim() : 'Residente',
            unit: unit?.unit_number || '',
            condominium: condoMap.get(p.condominium_id as string)?.name || '',
            collected_by: prof ? (prof.full_name || prof.email || 'Equipo') : (p.payment_method === 'Saldo a favor' ? 'Automático' : 'En línea / sistema'),
            collected_by_id: (p.created_by as string | null) || null,
            notes: p.notes || '',
        }
    })

    // Quién consulta (para "Arqueo realizado por") y arqueos ya hechos ese día
    const { data: viewerProfile } = await admin.from('profiles').select('full_name, email').eq('id', user.id).maybeSingle()
    const viewer = { id: user.id, name: viewerProfile?.full_name || viewerProfile?.email || user.email || 'Yo' }

    let countsQuery = admin
        .from('cash_counts')
        .select('id, condominium_id, count_date, counted_by, counted_for, expected_amount, counted_amount, difference, status, notes, created_at')
        .eq('organization_id', organizationId)
        .eq('count_date', date)
        .order('created_at', { ascending: false })
    if (condominiumId) countsQuery = countsQuery.eq('condominium_id', condominiumId)
    const { data: countsRaw } = await countsQuery
    const countUserIds = ids((countsRaw || []).flatMap(c => [c.counted_by as string, c.counted_for as string]))
    const missing = countUserIds.filter(id => !profMap.has(id) && id !== user.id)
    if (missing.length) {
        const { data: more } = await admin.from('profiles').select('id, full_name, email').in('id', missing)
        ;((more || []) as Prof[]).forEach(p => profMap.set(p.id, p))
    }
    const nameOf = (id: string | null) => {
        if (!id) return '—'
        if (id === user.id) return viewer.name
        const pr = profMap.get(id)
        return pr?.full_name || pr?.email || 'Equipo'
    }
    const counts = (countsRaw || []).map(c => ({
        id: c.id,
        count_date: c.count_date,
        counted_by: nameOf(c.counted_by as string | null),
        counted_for: nameOf(c.counted_for as string | null),
        counted_for_id: c.counted_for,
        expected_amount: Number(c.expected_amount || 0),
        counted_amount: Number(c.counted_amount || 0),
        difference: Number(c.difference || 0),
        status: c.status,
        notes: c.notes || '',
        created_at: c.created_at,
    }))

    return NextResponse.json({ date, payments: result, viewer, counts })
}
