'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolveStaffOrganization, resolveResidentSelf } from '@/utils/staff-org'

/**
 * Verifica si el usuario autenticado puede operar sobre los convenios/cuotas
 * de `targetResidentId`: o es el propio residente, o es staff de la
 * organización dueña de ese residente.
 */
async function canAccessResident(supabase: any, userId: string, targetResidentId: string): Promise<boolean> {
    const self = await resolveResidentSelf(supabase, userId)
    if (self?.id === targetResidentId) return true

    const { organizationId, isStaff } = await resolveStaffOrganization(supabase, userId)
    if (!isStaff || !organizationId) return false

    const { data: targetResident } = await supabase
        .from('residents')
        .select('condominium_id, condominiums(organization_id)')
        .eq('id', targetResidentId)
        .maybeSingle()

    const targetOrgId = (targetResident as any)?.condominiums?.organization_id
    return targetOrgId === organizationId
}

/**
 * Genera el calendario real de cuotas (agreement_installments) cuando un
 * convenio se aprueba. Antes nada en el sistema creaba estas filas — ni
 * siquiera los convenios ya aprobados históricamente las tienen — así que el
 * residente nunca veía un calendario real pese al mensaje que se lo prometía.
 */
async function generateInstallmentsForAgreement(
    adminSupabase: any,
    agreement: { id: string; resident_id: string; total_debt: number | null; num_installments?: number | null }
) {
    const { data: existing } = await adminSupabase
        .from('agreement_installments')
        .select('id')
        .eq('agreement_id', agreement.id)
        .limit(1)

    if (existing && existing.length > 0) return

    const totalDebt = Number(agreement.total_debt || 0)
    if (totalDebt <= 0) return

    const count = Math.max(1, Math.min(60, Number(agreement.num_installments) || 6))
    const baseAmount = Math.floor((totalDebt / count) * 100) / 100
    const today = new Date()

    const rows = Array.from({ length: count }, (_, i) => {
        const dueDate = new Date(today.getFullYear(), today.getMonth() + i + 1, today.getDate())
        const isLast = i === count - 1
        const amount = isLast
            ? Number((totalDebt - baseAmount * (count - 1)).toFixed(2))
            : baseAmount

        return {
            agreement_id: agreement.id,
            resident_id: agreement.resident_id,
            installment_number: i + 1,
            amount,
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending' as const,
        }
    })

    await adminSupabase.from('agreement_installments').insert(rows)
}

export async function getPaymentAgreementsAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    const { organizationId, isStaff } = await resolveStaffOrganization(supabase, user.id)
    if (!isStaff || !organizationId) {
        return { success: false, error: 'No tienes permiso para ver los convenios.' }
    }

    try {
        const adminSupabase = createAdminClient()

        const { data: condos } = await adminSupabase
            .from('condominiums')
            .select('id')
            .eq('organization_id', organizationId)
        const condoIds = (condos || []).map((c: any) => c.id)
        if (condoIds.length === 0) return { success: true, data: [] }

        const { data: residentsInOrg } = await adminSupabase
            .from('residents')
            .select('id')
            .in('condominium_id', condoIds)
        const residentIds = (residentsInOrg || []).map((r: any) => r.id)
        if (residentIds.length === 0) return { success: true, data: [] }

        const { data, error } = await adminSupabase
            .from('payment_agreements')
            .select('*')
            .in('resident_id', residentIds)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ Error Supabase al cargar convenios:', error)
            return { success: false, error: error.message || 'Error al cargar convenios' }
        }

        return { success: true, data: data || [] }
    } catch (err: any) {
        console.error('❌ Excepción al cargar convenios:', err)
        return { success: false, error: err.message || 'Error interno del servidor' }
    }
}

interface UpdateStatusPayload {
    id: string
    status: 'approved' | 'rejected'
    adminUserId?: string
    rejectionReason?: string
}

const NON_FINAL_STATUSES = ['pending', 'awaiting_signature', 'pending_final_approval']

async function fireConvenioWebhook(agreementId: string, action: string, extra: Record<string, any> = {}) {
    const webhookUrl = process.env.N8N_CONVENIO_ADMIN_WEBHOOK || 'https://n8n.inmobigo.mx/webhook/convenio-decision'
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agreement_id: agreementId, action, ...extra }),
        })
    } catch (err: any) {
        console.error(`❌ Error de red al contactar webhook de convenio (${action}):`, err.message)
    }
}

export async function updatePaymentAgreementStatusAction({ id, status, rejectionReason }: UpdateStatusPayload) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    const { organizationId, isStaff } = await resolveStaffOrganization(supabase, user.id)
    if (!isStaff || !organizationId) {
        return { success: false, error: 'No tienes permiso para actualizar convenios.' }
    }

    try {
        const adminSupabase = createAdminClient()

        const { data: agreement } = await adminSupabase
            .from('payment_agreements')
            .select('id, resident_id, total_debt, status, num_installments')
            .eq('id', id)
            .maybeSingle()

        if (!agreement) {
            return { success: false, error: 'Convenio no encontrado.' }
        }

        const { data: resident } = await adminSupabase
            .from('residents')
            .select('condominium_id, condominiums(organization_id)')
            .eq('id', agreement.resident_id)
            .maybeSingle()

        const agreementOrgId = (resident as any)?.condominiums?.organization_id
        if (agreementOrgId !== organizationId) {
            return { success: false, error: 'No tienes permiso para modificar este convenio.' }
        }

        if (status === 'approved' && agreement.status !== 'pending_final_approval') {
            return { success: false, error: 'Debes enviar el convenio para firma y esperar a que el residente suba el documento firmado antes de aprobarlo.' }
        }

        if (status === 'rejected' && !NON_FINAL_STATUSES.includes(agreement.status)) {
            return { success: false, error: 'Este convenio ya fue resuelto.' }
        }

        const updateData: any = {
            status,
            approved_by: user.id,
            approved_at: new Date().toISOString()
        }
        if (rejectionReason) {
            updateData.rejection_reason = rejectionReason
        }

        const { data, error } = await adminSupabase
            .from('payment_agreements')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('❌ Error Supabase al actualizar convenio:', error)
            return { success: false, error: error.message || 'Error al actualizar el estado del convenio' }
        }

        if (status === 'approved') {
            await generateInstallmentsForAgreement(adminSupabase, data)
        }

        await fireConvenioWebhook(id, status, rejectionReason ? { reason: rejectionReason } : {})

        return { success: true, data }
    } catch (err: any) {
        console.error('❌ Excepción al actualizar convenio:', err)
        return { success: false, error: err.message || 'Error interno del servidor' }
    }
}

/**
 * Paso previo obligatorio a la aprobación: la administración envía al
 * residente el archivo de convenio (el mismo subido en Propiedades >
 * Configuración > Archivo de Convenios) para que lo firme.
 */
export async function sendAgreementForSignatureAction({ id }: { id: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    const { organizationId, isStaff } = await resolveStaffOrganization(supabase, user.id)
    if (!isStaff || !organizationId) {
        return { success: false, error: 'No tienes permiso para gestionar convenios.' }
    }

    try {
        const adminSupabase = createAdminClient()

        const { data: agreement } = await adminSupabase
            .from('payment_agreements')
            .select('id, resident_id, status')
            .eq('id', id)
            .maybeSingle()

        if (!agreement) return { success: false, error: 'Convenio no encontrado.' }

        if (!['pending', 'awaiting_signature'].includes(agreement.status)) {
            return { success: false, error: 'Este convenio ya avanzó a otra etapa.' }
        }

        const { data: resident } = await adminSupabase
            .from('residents')
            .select('condominium_id, condominiums(organization_id, convenio_url)')
            .eq('id', agreement.resident_id)
            .maybeSingle()

        const condo = (resident as any)?.condominiums
        if (condo?.organization_id !== organizationId) {
            return { success: false, error: 'No tienes permiso para modificar este convenio.' }
        }

        if (!condo?.convenio_url) {
            return { success: false, error: 'Tu condominio aún no tiene un archivo de convenio subido. Súbelo en Propiedades > Configuración > Archivo de Convenios.' }
        }

        const { data, error } = await adminSupabase
            .from('payment_agreements')
            .update({
                status: 'awaiting_signature',
                unsigned_document_url: condo.convenio_url,
                unsigned_document_sent_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('❌ Error Supabase al enviar convenio para firma:', error)
            return { success: false, error: error.message }
        }

        await fireConvenioWebhook(id, 'awaiting_signature', { document_url: condo.convenio_url })

        return { success: true, data }
    } catch (err: any) {
        console.error('❌ Excepción al enviar convenio para firma:', err)
        return { success: false, error: err.message }
    }
}

/**
 * El residente sube de vuelta el convenio ya firmado. Pasa a revisión final
 * del administrador (que ahora sí puede aprobar o rechazar).
 */
export async function uploadSignedAgreementAction({ id, signedDocumentUrl }: { id: string; signedDocumentUrl: string }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    try {
        const adminSupabase = createAdminClient()

        const { data: agreement } = await adminSupabase
            .from('payment_agreements')
            .select('id, resident_id, status')
            .eq('id', id)
            .maybeSingle()

        if (!agreement) return { success: false, error: 'Convenio no encontrado.' }

        const allowed = await canAccessResident(supabase, user.id, agreement.resident_id)
        if (!allowed) return { success: false, error: 'No tienes permiso para modificar este convenio.' }

        if (agreement.status !== 'awaiting_signature') {
            return { success: false, error: 'Este convenio no está esperando la firma en este momento.' }
        }

        const { data, error } = await adminSupabase
            .from('payment_agreements')
            .update({
                status: 'pending_final_approval',
                signed_document_url: signedDocumentUrl,
                signed_document_uploaded_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('❌ Error Supabase al subir convenio firmado:', error)
            return { success: false, error: error.message }
        }

        await fireConvenioWebhook(id, 'signed_uploaded', { document_url: signedDocumentUrl })

        return { success: true, data }
    } catch (err: any) {
        console.error('❌ Excepción al subir convenio firmado:', err)
        return { success: false, error: err.message }
    }
}

export async function getAgreementInstallmentsAction(agreementId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    try {
        const adminSupabase = createAdminClient()

        const { data: agreement } = await adminSupabase
            .from('payment_agreements')
            .select('resident_id')
            .eq('id', agreementId)
            .maybeSingle()

        if (!agreement) return { success: false, error: 'Convenio no encontrado.' }

        const allowed = await canAccessResident(supabase, user.id, agreement.resident_id)
        if (!allowed) return { success: false, error: 'No tienes permiso para ver estas cuotas.' }

        const { data, error } = await adminSupabase
            .from('agreement_installments')
            .select('*')
            .eq('agreement_id', agreementId)
            .order('installment_number', { ascending: true })

        if (error) {
            console.error('❌ Error Supabase al cargar cuotas:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data: data || [] }
    } catch (err: any) {
        console.error('❌ Excepción al cargar cuotas:', err)
        return { success: false, error: err.message }
    }
}

interface UpdateInstallmentPayload {
    id: string
    status: 'pending' | 'paid' | 'overdue'
    paidAt?: string | null
    paymentMethod?: string | null
    paymentReference?: string | null
    notes?: string | null
}

export async function updateInstallmentStatusAction({
    id,
    status,
    paidAt,
    paymentMethod,
    paymentReference,
    notes
}: UpdateInstallmentPayload) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    try {
        const adminSupabase = createAdminClient()

        const { data: installment } = await adminSupabase
            .from('agreement_installments')
            .select('id, resident_id')
            .eq('id', id)
            .maybeSingle()

        if (!installment) return { success: false, error: 'Cuota no encontrada.' }

        const allowed = await canAccessResident(supabase, user.id, installment.resident_id)
        if (!allowed) return { success: false, error: 'No tienes permiso para modificar esta cuota.' }

        const { data, error } = await adminSupabase
            .from('agreement_installments')
            .update({
                status,
                paid_at: paidAt,
                payment_method: paymentMethod,
                payment_reference: paymentReference,
                notes
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('❌ Error Supabase al actualizar cuota:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (err: any) {
        console.error('❌ Excepción al actualizar cuota:', err)
        return { success: false, error: err.message }
    }
}

interface SendReminderPayload {
    installmentId: string
    agreementId: string
    residentId: string
    installmentNumber: number
    amount: number
    dueDate: string
    organizationId?: string
    adminUserId?: string
}

export async function sendInstallmentReminderAction({
    installmentId,
    agreementId,
    residentId,
    installmentNumber,
    amount,
    dueDate,
}: SendReminderPayload) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    const allowed = await canAccessResident(supabase, user.id, residentId)
    if (!allowed) return { success: false, error: 'No tienes permiso para enviar este recordatorio.' }

    try {
        const adminSupabase = createAdminClient()

        const { data: resident } = await adminSupabase
            .from('residents')
            .select('condominium_id, condominiums(organization_id)')
            .eq('id', residentId)
            .maybeSingle()
        const organizationId = (resident as any)?.condominiums?.organization_id || null

        // 1. Send to n8n webhook
        const webhookUrl = process.env.N8N_CONVENIO_ADMIN_WEBHOOK || 'https://n8n.inmobigo.mx/webhook/convenio-decision'
        let webhookSuccess = false

        try {
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agreement_id: agreementId,
                    installment_id: installmentId,
                    installment_number: installmentNumber,
                    action: 'reminder',
                    amount,
                    due_date: dueDate,
                    resident_id: residentId
                })
            })
            webhookSuccess = res.ok
        } catch (err: any) {
            console.error('❌ Error de red al contactar webhook de recordatorio:', err.message)
        }

        // 2. Log in communication_logs
        const { error: logError } = await adminSupabase
            .from('communication_logs')
            .insert({
                organization_id: organizationId,
                resident_id: residentId,
                type: 'payment_agreement_reminder',
                method: 'whatsapp',
                message_type: `Recordatorio Cuota #${installmentNumber}`,
                created_at: new Date().toISOString(),
                created_by: user.id
            })

        if (logError) {
            console.error('❌ Error Supabase al insertar log de comunicación:', logError)
        }

        return { success: true, webhook_sent: webhookSuccess }
    } catch (err: any) {
        console.error('❌ Excepción al enviar recordatorio:', err)
        return { success: false, error: err.message }
    }
}

export async function getAgreementHistoryAction(residentId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    const allowed = await canAccessResident(supabase, user.id, residentId)
    if (!allowed) return { success: false, error: 'No tienes permiso para ver este historial.' }

    try {
        const adminSupabase = createAdminClient()
        const { data, error } = await adminSupabase
            .from('communication_logs')
            .select('*')
            .eq('resident_id', residentId)
            .eq('type', 'payment_agreement_reminder')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ Error Supabase al cargar historial:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data: data || [] }
    } catch (err: any) {
        console.error('❌ Excepción al cargar historial:', err)
        return { success: false, error: err.message }
    }
}

export async function getResidentAgreementsAction(residentId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    const allowed = await canAccessResident(supabase, user.id, residentId)
    if (!allowed) return { success: false, error: 'No tienes permiso para ver estos convenios.' }

    try {
        const adminSupabase = createAdminClient()
        const { data, error } = await adminSupabase
            .from('payment_agreements')
            .select('*')
            .eq('resident_id', residentId)
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ Error Supabase al cargar convenios de residente:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data: data || [] }
    } catch (err: any) {
        console.error('❌ Excepción al cargar convenios de residente:', err)
        return { success: false, error: err.message }
    }
}

interface CreateAgreementPayload {
    total_debt: number
    agreement_details: string
    comments: string
    num_installments?: number
}

export async function createResidentAgreementAction({
    total_debt,
    agreement_details,
    comments,
    num_installments
}: CreateAgreementPayload) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autorizado.' }

    try {
        const adminSupabase = createAdminClient()

        const { data: resident } = await adminSupabase
            .from('residents')
            .select('id, first_name, last_name')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!resident) {
            return { success: false, error: 'No encontramos una propiedad vinculada a tu cuenta.' }
        }

        const { data: existingAgreement } = await adminSupabase
            .from('payment_agreements')
            .select('id, status')
            .eq('resident_id', resident.id)
            .in('status', ['pending', 'awaiting_signature', 'pending_final_approval', 'approved'])
            .maybeSingle()

        if (existingAgreement) {
            // Un convenio 'pending' siempre bloquea. Uno 'approved' solo deja
            // pedir otro si ya se liquidaron todas sus cuotas — si no, seguiría
            // bloqueando para siempre a un residente que ya terminó de pagar.
            let isFullyPaid = false
            if (existingAgreement.status === 'approved') {
                const { data: existingInstallments } = await adminSupabase
                    .from('agreement_installments')
                    .select('status')
                    .eq('agreement_id', existingAgreement.id)

                isFullyPaid = !!existingInstallments?.length && existingInstallments.every((i: any) => i.status === 'paid')
            }

            if (!isFullyPaid) {
                return { success: false, error: 'Ya tienes un convenio pendiente o activo. No puedes solicitar otro hasta que se resuelva o se liquide por completo.' }
            }
        }

        const resident_name = `${resident.first_name || ''} ${resident.last_name || ''}`.trim() || 'Residente'

        const { data, error } = await adminSupabase
            .from('payment_agreements')
            .insert({
                resident_id: resident.id,
                resident_name,
                total_debt,
                agreement_details,
                comments,
                status: 'pending',
                num_installments: num_installments || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (error) {
            console.error('❌ Error Supabase al crear convenio:', error)
            return { success: false, error: error.message }
        }

        return { success: true, data }
    } catch (err: any) {
        console.error('❌ Excepción al crear convenio:', err)
        return { success: false, error: err.message }
    }
}
