'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function getUnitsForCondominiumServer(condominiumId: string) {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('units')
            .select('id, unit_number')
            .eq('condominium_id', condominiumId)
            .order('unit_number')

        if (error) {
            console.error('[getUnitsForCondominiumServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        return { success: true, units: data || [] }
    } catch (err: any) {
        console.error('[getUnitsForCondominiumServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function createComplaintServer(payload: {
    organization_id: string
    condominium_id: string
    reporter_resident_id: string
    is_anonymous: boolean
    complaint_type: string
    description: string
    subject_unit_id?: string
    evidence_urls?: string[]
}) {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('resident_complaints')
            .insert({
                organization_id: payload.organization_id,
                condominium_id: payload.condominium_id,
                reporter_resident_id: payload.reporter_resident_id,
                is_anonymous: payload.is_anonymous,
                complaint_type: payload.complaint_type,
                description: payload.description,
                subject_unit_id: payload.subject_unit_id || null,
                evidence_urls: payload.evidence_urls || [],
            })
            .select()
            .single()

        if (error) {
            console.error('[createComplaintServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        return { success: true, complaint: data }
    } catch (err: any) {
        console.error('[createComplaintServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function getMyComplaintsServer(residentId: string) {
    try {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('resident_complaints')
            .select('*, units:subject_unit_id(unit_number)')
            .eq('reporter_resident_id', residentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getMyComplaintsServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        const mapped = (data || []).map((c: any) => ({
            ...c,
            subject_unit_number: c.units?.unit_number || null,
        }))

        return { success: true, complaints: mapped }
    } catch (err: any) {
        console.error('[getMyComplaintsServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function getComplaintsByOrganizationServer(organizationId: string, condominiumId?: string) {
    try {
        const supabase = createAdminClient()
        let query = supabase
            .from('resident_complaints')
            .select('*, units:subject_unit_id(unit_number), condominiums(name)')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false })

        if (condominiumId) {
            query = query.eq('condominium_id', condominiumId)
        }

        const { data, error } = await query

        if (error) {
            console.error('[getComplaintsByOrganizationServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        // Los reportes anónimos no deben revelar quién reportó ni siquiera al
        // administrador dentro del listado — solo se guarda internamente para
        // trazabilidad/anti-abuso, no se expone en la UI.
        const reporterIds = Array.from(new Set((data || []).map((c: any) => c.reporter_resident_id).filter(Boolean)))
        const { data: reporters } = reporterIds.length > 0
            ? await supabase.from('residents').select('id, first_name, last_name, unit_id').in('id', reporterIds)
            : { data: [] as any[] }

        const reporterMap = new Map((reporters || []).map((r: any) => [r.id, r]))

        const mapped = (data || []).map((c: any) => {
            const reporter = reporterMap.get(c.reporter_resident_id)
            return {
                ...c,
                subject_unit_number: c.units?.unit_number || null,
                condominium_name: c.condominiums?.name || null,
                reporter_name: c.is_anonymous ? 'Anónimo' : (reporter ? `${reporter.first_name || ''} ${reporter.last_name || ''}`.trim() : 'Desconocido'),
            }
        })

        return { success: true, complaints: mapped }
    } catch (err: any) {
        console.error('[getComplaintsByOrganizationServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}

export async function updateComplaintStatusServer(id: string, status: 'abierta' | 'en_revision' | 'resuelta' | 'descartada', adminNotes?: string) {
    try {
        const supabase = createAdminClient()
        const { error } = await supabase
            .from('resident_complaints')
            .update({
                status,
                admin_notes: adminNotes ?? undefined,
                resolved_at: status === 'resuelta' ? new Date().toISOString() : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)

        if (error) {
            console.error('[updateComplaintStatusServer] DB ERROR:', error)
            return { success: false, error: error.message }
        }

        return { success: true }
    } catch (err: any) {
        console.error('[updateComplaintStatusServer] Fatal error:', err)
        return { success: false, error: err.message || 'Error desconocido' }
    }
}
