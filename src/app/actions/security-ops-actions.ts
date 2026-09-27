'use server'

import { createAdminClient } from '@/utils/supabase/admin'

// ─── ACCESOS EN VIVO ──────────────────────────────────────────────────────────
// Quién está dentro de la privada ahora mismo (pase de visita con check-in
// registrado y sin check-out) más los paquetes que llegaron y siguen
// pendientes de entrega — antes esto solo se podía consultar por WhatsApp
// ("quien esta dentro ahorita"), sin ninguna vista persistente para el admin.
export async function getLiveAccessActivityServer(organizationId: string) {
    try {
        const supabase = createAdminClient()

        const { data: units } = await supabase
            .from('units')
            .select('id, condominium_id')
            .eq('organization_id', organizationId)
        const condoByUnit = new Map((units || []).map((u: any) => [u.id, u.condominium_id]))

        const { data: insideNow, error: insideErr } = await supabase
            .from('visitor_passes')
            .select('id, unit_id, unit_name, visitor_name, visitor_type, checkpoint, guard_name, checked_in_at')
            .eq('organization_id', organizationId)
            .not('checked_in_at', 'is', null)
            .is('checked_out_at', null)
            .order('checked_in_at', { ascending: false })

        if (insideErr) {
            console.error('[getLiveAccessActivityServer] insideNow error:', insideErr)
        }

        const { data: pendingPackages, error: pkgErr } = await supabase
            .from('package_alerts')
            .select('id, unit_id, unit_name, resident_name, carrier, status, created_at, guard_name')
            .eq('organization_id', organizationId)
            .in('status', ['pending', 'received'])
            .order('created_at', { ascending: false })

        if (pkgErr) {
            console.error('[getLiveAccessActivityServer] pendingPackages error:', pkgErr)
        }

        const insideNowMapped = (insideNow || []).map((v: any) => ({
            ...v,
            condominium_id: condoByUnit.get(v.unit_id) || null,
        }))
        const pendingPackagesMapped = (pendingPackages || []).map((p: any) => ({
            ...p,
            condominium_id: condoByUnit.get(p.unit_id) || null,
        }))

        return { success: true, insideNow: insideNowMapped, pendingPackages: pendingPackagesMapped }
    } catch (err: any) {
        console.error('[getLiveAccessActivityServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido', insideNow: [], pendingPackages: [] }
    }
}

// ─── HISTORIAL DE PAQUETERÍA ──────────────────────────────────────────────────
export async function getPackageHistoryServer(organizationId: string, days: number = 30) {
    try {
        const supabase = createAdminClient()

        const { data: units } = await supabase
            .from('units')
            .select('id, condominium_id')
            .eq('organization_id', organizationId)
        const condoByUnit = new Map((units || []).map((u: any) => [u.id, u.condominium_id]))

        const since = new Date()
        since.setDate(since.getDate() - days)

        const { data, error } = await supabase
            .from('package_alerts')
            .select('id, unit_id, unit_name, resident_name, carrier, notes, status, created_at, received_at, delivered_at, guard_name, checkpoint')
            .eq('organization_id', organizationId)
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getPackageHistoryServer] DB error:', error)
            return { success: false, error: error.message, packages: [] }
        }

        const packages = (data || []).map((p: any) => ({ ...p, condominium_id: condoByUnit.get(p.unit_id) || null }))
        return { success: true, packages }
    } catch (err: any) {
        console.error('[getPackageHistoryServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido', packages: [] }
    }
}

// ─── MÉTRICAS DE PASES DE VISITA + UNIDADES ANÓMALAS ─────────────────────────
// Una unidad que genera muchos más pases de visita que el promedio del resto
// puede ser una señal de subarrendamiento no autorizado (tipo hospedaje corto
// plazo) — antes no había ninguna forma de detectar esto, solo se veía la
// lista cruda de pases uno por uno.
export async function getVisitorPassMetricsServer(organizationId: string, days: number = 30) {
    try {
        const supabase = createAdminClient()

        const { data: units } = await supabase
            .from('units')
            .select('id, condominium_id, unit_number')
            .eq('organization_id', organizationId)
        const unitInfoById = new Map((units || []).map((u: any) => [u.id, u]))

        const since = new Date()
        since.setDate(since.getDate() - days)

        const { data, error } = await supabase
            .from('visitor_passes')
            .select('id, unit_id, unit_name, status, visitor_type, created_at, checked_in_at')
            .eq('organization_id', organizationId)
            .gte('created_at', since.toISOString())

        if (error) {
            console.error('[getVisitorPassMetricsServer] DB error:', error)
            return { success: false, error: error.message, totalPasses: 0, usedCount: 0, noShowCount: 0, byUnit: [], anomalies: [] }
        }

        const passes = data || []
        const totalPasses = passes.length
        const usedCount = passes.filter(p => p.status === 'used' || p.checked_in_at).length
        const noShowCount = passes.filter(p => p.status === 'expired' && !p.checked_in_at).length

        const countByUnit = new Map<string, number>()
        for (const p of passes) {
            if (!p.unit_id) continue
            countByUnit.set(p.unit_id, (countByUnit.get(p.unit_id) || 0) + 1)
        }

        const byUnit = Array.from(countByUnit.entries()).map(([unitId, count]) => ({
            unit_id: unitId,
            unit_number: unitInfoById.get(unitId)?.unit_number || null,
            condominium_id: unitInfoById.get(unitId)?.condominium_id || null,
            count,
        })).sort((a, b) => b.count - a.count)

        // Umbral estadístico simple: promedio + 2 desviaciones estándar entre las
        // unidades que sí tuvieron al menos un pase — evita marcar como "anómalas"
        // unidades normales solo porque casi nadie tiene 0 visitas en el periodo.
        const counts = byUnit.map(u => u.count)
        const mean = counts.length > 0 ? counts.reduce((s, c) => s + c, 0) / counts.length : 0
        const variance = counts.length > 0 ? counts.reduce((s, c) => s + Math.pow(c - mean, 2), 0) / counts.length : 0
        const stdDev = Math.sqrt(variance)
        const threshold = Math.max(10, mean + 2 * stdDev)

        const anomalies = byUnit.filter(u => u.count >= threshold && u.count >= 8)

        return { success: true, totalPasses, usedCount, noShowCount, byUnit, anomalies }
    } catch (err: any) {
        console.error('[getVisitorPassMetricsServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido', totalPasses: 0, usedCount: 0, noShowCount: 0, byUnit: [], anomalies: [] }
    }
}

// ─── SLA DE INCIDENCIAS ───────────────────────────────────────────────────────
export async function getIncidentSLAServer(organizationId: string, days: number = 30) {
    try {
        const supabase = createAdminClient()
        const since = new Date()
        since.setDate(since.getDate() - days)

        const { data, error } = await supabase
            .from('tickets')
            .select('id, status, priority, created_at, resolved_at')
            .eq('organization_id', organizationId)
            .gte('created_at', since.toISOString())

        if (error) {
            console.error('[getIncidentSLAServer] DB error:', error)
            return { success: false, error: error.message, avgResolutionHours: null, resolvedCount: 0, openOver48h: 0 }
        }

        const tickets = data || []
        const resolved = tickets.filter(t => t.resolved_at)
        const resolutionHours = resolved.map(t => {
            const created = new Date(t.created_at).getTime()
            const done = new Date(t.resolved_at as string).getTime()
            return Math.max(0, (done - created) / 36e5)
        })
        const avgResolutionHours = resolutionHours.length > 0
            ? resolutionHours.reduce((s, h) => s + h, 0) / resolutionHours.length
            : null

        const now = Date.now()
        const openOver48h = tickets.filter(t => {
            if (t.resolved_at) return false
            const created = new Date(t.created_at).getTime()
            return (now - created) / 36e5 > 48
        }).length

        return { success: true, avgResolutionHours, resolvedCount: resolved.length, openOver48h }
    } catch (err: any) {
        console.error('[getIncidentSLAServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido', avgResolutionHours: null, resolvedCount: 0, openOver48h: 0 }
    }
}

// ─── CRUCE CONVIVENCIA + INCIDENCIAS POR UNIDAD ──────────────────────────────
// Unidades que aparecen tanto en reportes de convivencia (como sujeto) como en
// incidencias — antes estas dos señales vivían en pantallas separadas sin
// ninguna forma de verlas juntas por unidad.
export async function getCrossFlaggedUnitsServer(organizationId: string, days: number = 90) {
    try {
        const supabase = createAdminClient()
        const since = new Date()
        since.setDate(since.getDate() - days)

        const { data: units } = await supabase
            .from('units')
            .select('id, unit_number, condominium_id')
            .eq('organization_id', organizationId)
        const unitInfoById = new Map((units || []).map((u: any) => [u.id, u]))

        const { data: complaints, error: complaintsErr } = await supabase
            .from('resident_complaints')
            .select('id, subject_unit_id, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', since.toISOString())
            .not('subject_unit_id', 'is', null)

        if (complaintsErr) console.error('[getCrossFlaggedUnitsServer] complaints error:', complaintsErr)

        const { data: tickets, error: ticketsErr } = await supabase
            .from('tickets')
            .select('id, unit_id, created_at')
            .eq('organization_id', organizationId)
            .gte('created_at', since.toISOString())
            .not('unit_id', 'is', null)

        if (ticketsErr) console.error('[getCrossFlaggedUnitsServer] tickets error:', ticketsErr)

        const complaintCountByUnit = new Map<string, number>()
        for (const c of complaints || []) {
            if (!c.subject_unit_id) continue
            complaintCountByUnit.set(c.subject_unit_id, (complaintCountByUnit.get(c.subject_unit_id) || 0) + 1)
        }

        const ticketCountByUnit = new Map<string, number>()
        for (const t of tickets || []) {
            if (!t.unit_id) continue
            ticketCountByUnit.set(t.unit_id, (ticketCountByUnit.get(t.unit_id) || 0) + 1)
        }

        const allUnitIds = new Set([...complaintCountByUnit.keys(), ...ticketCountByUnit.keys()])
        const flagged = Array.from(allUnitIds)
            .map(unitId => ({
                unit_id: unitId,
                unit_number: unitInfoById.get(unitId)?.unit_number || null,
                condominium_id: unitInfoById.get(unitId)?.condominium_id || null,
                complaints: complaintCountByUnit.get(unitId) || 0,
                tickets: ticketCountByUnit.get(unitId) || 0,
            }))
            .filter(u => u.complaints > 0 && u.tickets > 0)
            .sort((a, b) => (b.complaints + b.tickets) - (a.complaints + a.tickets))

        return { success: true, flagged }
    } catch (err: any) {
        console.error('[getCrossFlaggedUnitsServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido', flagged: [] }
    }
}

// ─── TURNOS DE GUARDIAS ───────────────────────────────────────────────────────
export async function getGuardShiftsServer(organizationId: string, days: number = 14) {
    try {
        const supabase = createAdminClient()
        const since = new Date()
        since.setDate(since.getDate() - days)

        const { data, error } = await supabase
            .from('guard_shifts')
            .select('id, condominium_id, guard_id, guard_name, checkpoint, check_in_at, check_out_at, notes')
            .eq('organization_id', organizationId)
            .gte('check_in_at', since.toISOString())
            .order('check_in_at', { ascending: false })

        if (error) {
            console.error('[getGuardShiftsServer] DB error:', error)
            return { success: false, error: error.message, shifts: [] }
        }

        return { success: true, shifts: data || [] }
    } catch (err: any) {
        console.error('[getGuardShiftsServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido', shifts: [] }
    }
}

export async function getActiveShiftServer(guardId: string) {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('guard_shifts')
            .select('id, check_in_at, checkpoint')
            .eq('guard_id', guardId)
            .is('check_out_at', null)
            .order('check_in_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        if (error) {
            console.error('[getActiveShiftServer] DB error:', error)
            return { success: false, shift: null }
        }
        return { success: true, shift: data || null }
    } catch (err: any) {
        console.error('[getActiveShiftServer] Fatal error:', err)
        return { success: false, shift: null }
    }
}

export async function startShiftServer(payload: {
    organizationId: string
    condominiumId?: string | null
    guardId: string
    guardName: string
    checkpoint?: string
}) {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('guard_shifts')
            .insert({
                organization_id: payload.organizationId,
                condominium_id: payload.condominiumId || null,
                guard_id: payload.guardId,
                guard_name: payload.guardName,
                checkpoint: payload.checkpoint || null,
            })
            .select('id, check_in_at')
            .single()

        if (error) {
            console.error('[startShiftServer] DB error:', error)
            return { success: false, error: error.message }
        }
        return { success: true, shift: data }
    } catch (err: any) {
        console.error('[startShiftServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function endShiftServer(shiftId: string, notes?: string) {
    try {
        const supabase = createAdminClient()
        const { error } = await supabase
            .from('guard_shifts')
            .update({ check_out_at: new Date().toISOString(), notes: notes || undefined })
            .eq('id', shiftId)

        if (error) {
            console.error('[endShiftServer] DB error:', error)
            return { success: false, error: error.message }
        }
        return { success: true }
    } catch (err: any) {
        console.error('[endShiftServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}
