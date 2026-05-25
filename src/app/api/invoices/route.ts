import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { generateFolio } from '@/types/finance'

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url)
        const condominiumId = searchParams.get('condominium_id')
        const organizationId = searchParams.get('organization_id')
        const residentId = searchParams.get('resident_id')

        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        let query = supabase
            .from('resident_invoices')
            .select(`
                *,
                residents (first_name, last_name, units(unit_number)),
                condominiums (name, logo_url)
            `)
            .order('created_at', { ascending: false })

        if (residentId) {
            query = query.eq('resident_id', residentId)
        } else if (condominiumId) {
            query = query.eq('condominium_id', condominiumId)
        } else if (organizationId) {
            query = query.eq('organization_id', organizationId)
        }

        const { data, error } = await query

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        const enriched = (data || []).map((inv: any) => ({
            ...inv,
            folio: generateFolio(inv.id),
            paid_amount: Math.max(0, (inv.amount || 0) - (inv.balance_due || 0)),
            resident_name: inv.residents
                ? `${inv.residents.first_name || ''} ${inv.residents.last_name || ''}`.trim()
                : null,
            unit_number: inv.residents?.units?.unit_number || null,
            condominium_name: inv.condominiums?.name || null,
        }))

        return NextResponse.json(enriched)
    } catch (error: any) {
        console.error('Invoices GET Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { organization_id, condominium_id, resident_id, amount, description, status, due_date, invoice_type } = body

        if (!resident_id || !condominium_id || !organization_id) {
            return NextResponse.json({ error: 'resident_id, condominium_id y organization_id son obligatorios' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('resident_invoices')
            .insert({
                organization_id,
                condominium_id,
                resident_id,
                amount: Number(amount),
                balance_due: Number(amount),
                status: status || 'pending',
                invoice_type: invoice_type || 'maintenance',
                description,
                due_date: due_date || new Date().toISOString(),
            })
            .select()
            .single()

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ ...data, folio: generateFolio(data.id) })
    } catch (error: any) {
        console.error('Invoices POST Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}