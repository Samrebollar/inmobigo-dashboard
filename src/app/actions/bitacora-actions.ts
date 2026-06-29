'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import type {
    BitacoraEntry,
    BitacoraKPIs,
    BitacoraFilters,
    SourceTable,
} from '@/types/bitacora'

// ─── Helper ───────────────────────────────────────────────────────────────────
function getAdminClient() {
    return createAdminClient()
}

// ─── GET BITACORA ENTRIES ──────────────────────────────────────────────────────
export async function getBitacoraEntriesAction(
    orgId: string,
    filters: BitacoraFilters = {},
    page = 0,
    pageSize = 50
): Promise<{ success: boolean; entries: BitacoraEntry[]; total: number; error?: string }> {
    try {
        const supabase = getAdminClient()

        let query = supabase
            .from('bitacora_entries_view')
            .select('*', { count: 'exact' })
            .eq('organization_id', orgId)
            .order('checked_in_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1)

        if (filters.event_type && filters.event_type !== 'all') {
            query = query.eq('event_type', filters.event_type)
        }
        if (filters.status && filters.status !== 'all') {
            query = query.eq('status', filters.status)
        }
        if (filters.date_from) {
            query = query.gte('checked_in_at', filters.date_from)
        }
        if (filters.date_to) {
            const end = new Date(filters.date_to)
            end.setDate(end.getDate() + 1)
            query = query.lt('checked_in_at', end.toISOString().split('T')[0])
        }
        if (filters.unit) {
            query = query.ilike('unit_number', `%${filters.unit}%`)
        }
        if (filters.guard) {
            query = query.ilike('guard_name', `%${filters.guard}%`)
        }
        if (filters.condominium_id) {
            query = query.eq('condominium_id', filters.condominium_id)
        }
        if (filters.search) {
            query = query.or(
                `person_name.ilike.%${filters.search}%,unit_number.ilike.%${filters.search}%,guard_name.ilike.%${filters.search}%,company.ilike.%${filters.search}%,amenity_name.ilike.%${filters.search}%`
            )
        }

        const { data, error, count } = await query

        if (error) {
            console.error('[getBitacoraEntriesAction]', error)
            return { success: false, entries: [], total: 0, error: error.message }
        }

        return { success: true, entries: (data as BitacoraEntry[]) || [], total: count || 0 }
    } catch (err: any) {
        return { success: false, entries: [], total: 0, error: err.message }
    }
}

// ─── GET KPIs ─────────────────────────────────────────────────────────────────
export async function getBitacoraKPIsAction(
    orgId: string,
    date?: string
): Promise<{ success: boolean; kpis: BitacoraKPIs | null; error?: string }> {
    try {
        const supabase = getAdminClient()
        const targetDate = date || new Date().toISOString().split('T')[0]

        const { data, error } = await supabase.rpc('get_bitacora_kpis', {
            p_org_id: orgId,
            p_date: targetDate,
        })

        if (error) {
            // Fallback: compute manually if RPC not yet deployed
            console.warn('[getBitacoraKPIsAction] RPC failed, using fallback:', error.message)
            const { data: entries } = await supabase
                .from('bitacora_entries_view')
                .select('event_type, status, duration_minutes, checked_in_at, checked_out_at')
                .eq('organization_id', orgId)

            const today = entries?.filter(e =>
                e.checked_in_at?.startsWith(targetDate)
            ) || []

            const kpis: BitacoraKPIs = {
                accesos_hoy: today.filter(e => e.event_type === 'access').length,
                entregas_hoy: today.filter(e => e.event_type === 'delivery').length,
                amenidades_activas: today.filter(e => e.event_type === 'amenity' && ['active', 'pending'].includes(e.status)).length,
                personas_dentro: (entries || []).filter(e => ['access', 'delivery'].includes(e.event_type) && e.status === 'active').length,
                total_entradas: today.length,
                total_salidas: today.filter(e => e.checked_out_at).length,
                movimientos_hoy: today.length,
                tiempo_promedio_min: (() => {
                    const durations = today.filter(e => e.duration_minutes).map(e => e.duration_minutes!)
                    return durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0
                })(),
            }
            return { success: true, kpis }
        }

        return { success: true, kpis: data as BitacoraKPIs }
    } catch (err: any) {
        return { success: false, kpis: null, error: err.message }
    }
}

// ─── GET PEOPLE INSIDE ────────────────────────────────────────────────────────
export async function getPeopleInsideAction(
    orgId: string
): Promise<{ success: boolean; entries: BitacoraEntry[]; error?: string }> {
    try {
        const supabase = getAdminClient()

        const { data, error } = await supabase
            .from('bitacora_entries_view')
            .select('*')
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .in('event_type', ['access', 'delivery'])
            .order('checked_in_at', { ascending: false })

        if (error) {
            return { success: false, entries: [], error: error.message }
        }

        return { success: true, entries: (data as BitacoraEntry[]) || [] }
    } catch (err: any) {
        return { success: false, entries: [], error: err.message }
    }
}

// ─── GET TIMELINE for a specific entry ────────────────────────────────────────
export async function getBitacoraTimelineAction(
    entryId: string,
    sourceTable: SourceTable
): Promise<{ success: boolean; entry: any | null; error?: string }> {
    try {
        const supabase = getAdminClient()

        if (sourceTable === 'visitor_passes') {
            const { data, error } = await supabase
                .from('visitor_passes')
                .select('*, units(unit_number, condominiums(name)), profiles!visitor_passes_resident_id_fkey(full_name)')
                .eq('id', entryId)
                .maybeSingle()
            if (error) return { success: false, entry: null, error: error.message }
            return { success: true, entry: data }
        }

        if (sourceTable === 'package_alerts') {
            const { data, error } = await supabase
                .from('package_alerts')
                .select('*, units(unit_number, condominiums(name)), profiles!package_alerts_resident_id_fkey(full_name)')
                .eq('id', entryId)
                .maybeSingle()
            if (error) return { success: false, entry: null, error: error.message }
            return { success: true, entry: data }
        }

        if (sourceTable === 'amenity_reservations') {
            const { data, error } = await supabase
                .from('amenity_reservations')
                .select('*, amenities(name, icon_name), profiles!amenity_reservations_resident_id_fkey(full_name)')
                .eq('id', entryId)
                .maybeSingle()
            if (error) return { success: false, entry: null, error: error.message }
            return { success: true, entry: data }
        }

        return { success: false, entry: null, error: 'Tabla desconocida' }
    } catch (err: any) {
        return { success: false, entry: null, error: err.message }
    }
}

// ─── REGISTER CHECKOUT ────────────────────────────────────────────────────────
export async function registerCheckoutAction(
    entryId: string,
    sourceTable: SourceTable,
    guardName?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = getAdminClient()
        const now = new Date().toISOString()

        if (sourceTable === 'visitor_passes') {
            const { error } = await supabase
                .from('visitor_passes')
                .update({ checked_out_at: now, guard_name: guardName, status: 'used' })
                .eq('id', entryId)
            if (error) return { success: false, error: error.message }
        }

        if (sourceTable === 'package_alerts') {
            const { error } = await supabase
                .from('package_alerts')
                .update({ delivered_at: now, guard_name: guardName, status: 'delivered' })
                .eq('id', entryId)
            if (error) return { success: false, error: error.message }
        }

        if (sourceTable === 'amenity_reservations') {
            const { error } = await supabase
                .from('amenity_reservations')
                .update({ checked_out_at: now, guard_name: guardName })
                .eq('id', entryId)
            if (error) return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err.message }
    }
}

// ─── GET CONDOMINIUMS (for filters) ───────────────────────────────────────────
export async function getBitacoraCondominiumsAction(
    orgId: string
): Promise<{ success: boolean; condos: { id: string; name: string }[] }> {
    try {
        const supabase = getAdminClient()
        const { data, error } = await supabase
            .from('condominiums')
            .select('id, name')
            .eq('organization_id', orgId)
            .eq('status', 'active')
            .order('name')

        if (error) return { success: false, condos: [] }
        return { success: true, condos: data || [] }
    } catch {
        return { success: false, condos: [] }
    }
}
