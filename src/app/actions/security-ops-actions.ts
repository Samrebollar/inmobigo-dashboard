'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

// ─── AVISOS DE TRANSPORTE (UBER/DIDI/TAXI) ───────────────────────────────────
export async function getPendingTransportNoticesServer(organizationId: string, options: { includeResolvedHours?: number } = {}) {
    try {
        const supabase = createAdminClient()

        const { data: units } = await supabase
            .from('units')
            .select('id, condominium_id')
            .eq('organization_id', organizationId)
        const condoByUnit = new Map((units || []).map((u: any) => [u.id, u.condominium_id]))

        let query = supabase
            .from('transport_notices')
            .select('id, unit_id, unit_name, resident_name, direction, platform, vehicle_info, notes, status, created_at, guard_name, handled_at, checked_in_at, checked_out_at, rejection_reason, rejected_at')
            .eq('organization_id', organizationId)

        // Con includeResolvedHours también se devuelven los avisos cerrados o
        // rechazados recientes, para que seguridad vea la hora de salida y el
        // motivo de rechazo en la tabla del panel.
        if (options.includeResolvedHours) {
            const since = new Date(Date.now() - options.includeResolvedHours * 60 * 60 * 1000).toISOString()
            query = query.or(`status.in.(pending,received),created_at.gte.${since}`)
        } else {
            query = query.in('status', ['pending', 'received'])
        }

        const { data, error } = await query.order('created_at', { ascending: false })

        if (error) {
            console.error('[getPendingTransportNoticesServer] DB error:', error)
            return { success: false, error: error.message, notices: [] }
        }

        const notices = (data || []).map((n: any) => ({ ...n, condominium_id: condoByUnit.get(n.unit_id) || null }))
        return { success: true, notices }
    } catch (err: any) {
        console.error('[getPendingTransportNoticesServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido', notices: [] }
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

// ─── ACCESO / SALIDA / RECHAZO DESDE EL PANEL DE SEGURIDAD ───────────────────
// Flujo único para visitas, paquetería y transporte: primero se registra el
// Acceso (llegó), después la Salida (se fue). El rechazo exige un motivo que
// queda como evidencia y que el residente ve en su panel de Servicios.
export type SecurityAccessKind = 'visit' | 'package' | 'transport'
export type SecurityAccessEvent = 'check_in' | 'check_out' | 'reject'

const ACCESS_TABLES: Record<SecurityAccessKind, 'visitor_passes' | 'package_alerts' | 'transport_notices'> = {
    visit: 'visitor_passes',
    package: 'package_alerts',
    transport: 'transport_notices',
}

export async function registerSecurityAccessEventAction(params: {
    kind: SecurityAccessKind
    id: string
    event: SecurityAccessEvent
    reason?: string
    guardName?: string
}) {
    const { kind, id, event, guardName } = params
    const reason = params.reason?.trim()
    const table = ACCESS_TABLES[kind]
    if (!table || !id || !event) return { success: false, error: 'Parámetros incompletos' }
    if (event === 'reject' && !reason) return { success: false, error: 'Debes indicar el motivo del rechazo' }

    try {
        const serverClient = await createServerClient()
        const { data: { user } } = await serverClient.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        const supabase = createAdminClient()
        const now = new Date().toISOString()

        const { data: current, error: fetchErr } = await supabase
            .from(table)
            .select('*')
            .eq('id', id)
            .maybeSingle()
        if (fetchErr) throw fetchErr
        if (!current) return { success: false, error: 'Registro no encontrado' }

        const alreadyIn = !!(current.checked_in_at || current.used_at || current.received_at ||
            (kind === 'transport' && current.status === 'received'))

        if (current.status === 'rejected') return { success: false, error: 'Este registro ya fue rechazado' }
        if (current.checked_out_at) return { success: false, error: 'Ya se registró la salida' }
        if (event === 'check_in' && alreadyIn) return { success: false, error: 'Ya se registró el acceso' }
        if (event === 'check_out' && !alreadyIn) return { success: false, error: 'Primero registra el acceso' }
        if (event === 'reject' && alreadyIn) return { success: false, error: 'No se puede rechazar después del acceso' }

        const update: Record<string, any> = {}
        if (guardName) update.guard_name = guardName

        if (event === 'check_in') {
            update.checked_in_at = now
            if (kind === 'visit') {
                update.status = 'used'
                update.used_at = current.used_at || now
            } else if (kind === 'package') {
                update.status = 'received'
                update.received_at = now
                update.handled_by = user.id
            } else {
                update.status = 'received'
                update.handled_at = now
                update.handled_by = user.id
            }
        } else if (event === 'check_out') {
            update.checked_out_at = now
            if (kind === 'transport') {
                update.status = 'closed'
                update.handled_at = now
            }
        } else {
            update.status = 'rejected'
            update.rejection_reason = reason
            update.rejected_at = now
            if (kind !== 'visit') update.handled_by = user.id
        }

        const { data: updated, error: updateErr } = await supabase
            .from(table)
            .update(update)
            .eq('id', id)
            .select('*')
            .single()
        if (updateErr) throw updateErr

        // Notificaciones existentes por WhatsApp (n8n)
        if (kind === 'package' && event === 'check_in') {
            fetch('https://n8n.inmobigo.mx/webhook/paquete-recibido', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ package_alert_id: id }),
            }).catch((err) => console.error('Error al notificar n8n (paquete-recibido):', err))
        }
        if ((kind === 'visit' || kind === 'package') && event === 'reject') {
            // Se espera la respuesta: en serverless un fetch sin await puede
            // cortarse al terminar la acción.
            await fetch('https://n8n.inmobigo.mx/webhook/acceso-rechazado', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ kind, id }),
            }).catch((err) => console.error('Error al notificar n8n (acceso-rechazado):', err))
        }
        if (kind === 'transport' && (event === 'check_in' || event === 'reject')) {
            fetch('https://n8n.inmobigo.mx/webhook/transporte-decision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notice_id: id }),
            }).catch((err) => console.error('Error al notificar n8n (transporte-decision):', err))
        }

        revalidatePath('/seguridad')
        revalidatePath('/residente/servicios')
        revalidatePath('/dashboard/servicios')

        return { success: true, record: updated }
    } catch (err: any) {
        console.error('[registerSecurityAccessEventAction] Error:', err)
        return { success: false, error: err.message || 'Error al registrar el evento' }
    }
}

// ─── HISTORIAL DEL RESIDENTE (paquetería y transporte) ───────────────────────
// El residente necesita ver el estado de sus avisos y, si seguridad los
// rechazó, el motivo. Se resuelve con el usuario autenticado, nunca con un id
// enviado desde el cliente.
export async function getMyServiceNoticesAction(days: number = 30) {
    try {
        const serverClient = await createServerClient()
        const { data: { user } } = await serverClient.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado', packages: [], transports: [] }

        const supabase = createAdminClient()
        const since = new Date()
        since.setDate(since.getDate() - days)

        const { data: residents } = await supabase
            .from('residents')
            .select('id')
            .eq('user_id', user.id)
        const residentIds = (residents || []).map((r: any) => r.id)

        const [{ data: packages }, { data: transports }] = await Promise.all([
            supabase
                .from('package_alerts')
                .select('id, carrier, notes, status, created_at, received_at, checked_in_at, checked_out_at, delivered_at, rejection_reason, rejected_at')
                .eq('resident_id', user.id)
                .gte('created_at', since.toISOString())
                .order('created_at', { ascending: false })
                .limit(20),
            residentIds.length
                ? supabase
                    .from('transport_notices')
                    .select('id, platform, direction, vehicle_info, status, created_at, handled_at, checked_in_at, checked_out_at, rejection_reason, rejected_at')
                    .in('resident_id', residentIds)
                    .gte('created_at', since.toISOString())
                    .order('created_at', { ascending: false })
                    .limit(20)
                : Promise.resolve({ data: [] as any[] }),
        ])

        return { success: true, packages: packages || [], transports: transports || [] }
    } catch (err: any) {
        console.error('[getMyServiceNoticesAction] Error:', err)
        return { success: false, error: err.message || 'Error desconocido', packages: [], transports: [] }
    }
}
