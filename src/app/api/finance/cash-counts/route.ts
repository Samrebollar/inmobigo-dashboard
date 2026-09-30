import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { canOperateOrgFinance } from '@/lib/finance-auth'

/**
 * Arqueos de caja.
 *
 * GET  /api/finance/cash-counts?organization_id=..&condominium_id=..&from=YYYY-MM-DD&to=YYYY-MM-DD
 *      Historial (para que el administrador vea los arqueos hechos a cada
 *      persona, p. ej. al auxiliar administrativo).
 * POST /api/finance/cash-counts
 *      { organizationId, condominiumId?, date, countedFor, countedAmount, denominations?, notes? }
 *      El monto esperado lo calcula el servidor: efectivo que cobró `countedFor`
 *      ese día (y en ese condominio, si se indica). Quien arquea es la sesión.
 */

const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
const dayRange = (ymd: string) => {
    const start = new Date(`${ymd}T00:00:00-06:00`)
    return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() }
}

async function authorize(organizationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
    const admin = createAdminClient()
    if (!organizationId || !(await canOperateOrgFinance(admin, user.id, organizationId))) {
        return { error: NextResponse.json({ error: 'No autorizado' }, { status: 403 }) }
    }
    return { user, admin }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const organizationId = searchParams.get('organization_id') || ''
    const condominiumId = searchParams.get('condominium_id') || ''
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const to = isYmd(searchParams.get('to') || '') ? searchParams.get('to')! : today
    const fromDefault = new Date(`${to}T12:00:00Z`)
    fromDefault.setUTCDate(fromDefault.getUTCDate() - 30)
    const from = isYmd(searchParams.get('from') || '') ? searchParams.get('from')! : fromDefault.toISOString().slice(0, 10)

    const auth = await authorize(organizationId)
    if ('error' in auth) return auth.error
    const { admin } = auth

    let q = admin
        .from('cash_counts')
        .select('id, condominium_id, count_date, counted_by, counted_for, expected_amount, counted_amount, difference, status, denominations, payments_count, notes, created_at')
        .eq('organization_id', organizationId)
        .gte('count_date', from)
        .lte('count_date', to)
        .order('count_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(300)
    if (condominiumId) q = q.eq('condominium_id', condominiumId)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const rows = data || []
    const userIds = Array.from(new Set(rows.flatMap(r => [r.counted_by, r.counted_for]).filter(Boolean))) as string[]
    const condoIds = Array.from(new Set(rows.map(r => r.condominium_id).filter(Boolean))) as string[]
    const [{ data: profiles }, { data: condos }] = await Promise.all([
        userIds.length ? admin.from('profiles').select('id, full_name, email').in('id', userIds) : Promise.resolve({ data: [] as { id: string, full_name: string | null, email: string | null }[] }),
        condoIds.length ? admin.from('condominiums').select('id, name').in('id', condoIds) : Promise.resolve({ data: [] as { id: string, name: string | null }[] }),
    ])
    const nameMap = new Map((profiles || []).map(p => [p.id, p.full_name || p.email || 'Equipo']))
    const condoMap = new Map((condos || []).map(c => [c.id, c.name || '']))

    return NextResponse.json({
        from,
        to,
        counts: rows.map(r => ({
            id: r.id,
            count_date: r.count_date,
            condominium: r.condominium_id ? condoMap.get(r.condominium_id) || '' : 'Todas las propiedades',
            counted_by: r.counted_by ? nameMap.get(r.counted_by) || 'Equipo' : '—',
            counted_for: r.counted_for ? nameMap.get(r.counted_for) || 'Equipo' : '—',
            counted_for_id: r.counted_for,
            expected_amount: Number(r.expected_amount || 0),
            counted_amount: Number(r.counted_amount || 0),
            difference: Number(r.difference || 0),
            status: r.status,
            denominations: r.denominations || {},
            payments_count: r.payments_count || 0,
            notes: r.notes || '',
            created_at: r.created_at,
        })),
    })
}

export async function POST(request: Request) {
    const body = await request.json().catch(() => ({}))
    const organizationId = String(body.organizationId || '')
    const condominiumId = body.condominiumId ? String(body.condominiumId) : null
    const date = String(body.date || '')
    const countedFor = String(body.countedFor || '')
    const countedAmount = Math.round(Number(body.countedAmount) * 100) / 100
    const notes = String(body.notes || '').trim().slice(0, 500)

    if (!isYmd(date) || !countedFor || !(countedAmount >= 0)) {
        return NextResponse.json({ error: 'date, countedFor y countedAmount son requeridos' }, { status: 400 })
    }

    const auth = await authorize(organizationId)
    if ('error' in auth) return auth.error
    const { user, admin } = auth

    // La persona arqueada debe ser del equipo de la organización
    const [{ data: member }, { data: org }] = await Promise.all([
        admin.from('organization_users').select('user_id').eq('organization_id', organizationId).eq('user_id', countedFor).maybeSingle(),
        admin.from('organizations').select('owner_id').eq('id', organizationId).maybeSingle(),
    ])
    if (!member && org?.owner_id !== countedFor) {
        return NextResponse.json({ error: 'La persona arqueada no pertenece al equipo' }, { status: 400 })
    }
    if (condominiumId) {
        const { data: condo } = await admin.from('condominiums').select('organization_id').eq('id', condominiumId).maybeSingle()
        if (condo?.organization_id !== organizationId) return NextResponse.json({ error: 'Propiedad inválida' }, { status: 400 })
    }

    // Efectivo esperado: pagos en efectivo que registró esa persona ese día
    const { start, end } = dayRange(date)
    let pq = admin
        .from('resident_invoice_payments')
        .select('amount')
        .eq('organization_id', organizationId)
        .eq('created_by', countedFor)
        .eq('payment_method', 'Efectivo')
        .gte('paid_at', start)
        .lt('paid_at', end)
    if (condominiumId) pq = pq.eq('condominium_id', condominiumId)
    const { data: pays, error: payError } = await pq
    if (payError) return NextResponse.json({ error: payError.message }, { status: 500 })

    const expected = Math.round((pays || []).reduce((s, p) => s + Number(p.amount || 0), 0) * 100) / 100
    const diff = Math.round((countedAmount - expected) * 100) / 100
    const status = Math.abs(diff) < 0.005 ? 'cuadrado' : diff < 0 ? 'faltante' : 'sobrante'
    if (status !== 'cuadrado' && !notes) {
        return NextResponse.json({ error: 'Explica la diferencia en las observaciones' }, { status: 400 })
    }

    const denominations = typeof body.denominations === 'object' && body.denominations ? body.denominations : {}
    const { data: saved, error } = await admin
        .from('cash_counts')
        .insert({
            organization_id: organizationId,
            condominium_id: condominiumId,
            count_date: date,
            counted_by: user.id,
            counted_for: countedFor,
            expected_amount: expected,
            counted_amount: countedAmount,
            status,
            denominations,
            payments_count: (pays || []).length,
            notes: notes || null,
        })
        .select('id, expected_amount, counted_amount, difference, status, created_at')
        .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, count: saved })
}
