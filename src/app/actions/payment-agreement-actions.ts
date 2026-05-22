'use server'

import { createAdminClient } from '@/utils/supabase/admin'

export async function getPaymentAgreementsAction() {
    const supabase = createAdminClient()
    
    try {
        console.log('🔍 [getPaymentAgreementsAction] Buscando solicitudes de convenio...')
        
        const { data, error } = await supabase
            .from('payment_agreements')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('❌ Error Supabase al cargar convenios:', error)
            return { 
                success: false, 
                error: error.message || 'Error al cargar convenios' 
            }
        }

        return { 
            success: true, 
            data: data || [] 
        }
    } catch (err: any) {
        console.error('❌ Excepción al cargar convenios:', err)
        return { 
            success: false, 
            error: err.message || 'Error interno del servidor' 
        }
    }
}

interface UpdateStatusPayload {
    id: string
    status: 'approved' | 'rejected'
    adminUserId: string
}

export async function updatePaymentAgreementStatusAction({ id, status, adminUserId }: UpdateStatusPayload) {
    const supabase = createAdminClient()
    
    try {
        console.log(`🔄 [updatePaymentAgreementStatusAction] Actualizando convenio ID: ${id} a estado: ${status}`)
        
        const { data, error } = await supabase
            .from('payment_agreements')
            .update({
                status,
                approved_by: adminUserId,
                approved_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('❌ Error Supabase al actualizar convenio:', error)
            return { 
                success: false, 
                error: error.message || 'Error al actualizar el estado del convenio' 
            }
        }

        return { 
            success: true, 
            data 
        }
    } catch (err: any) {
        console.error('❌ Excepción al actualizar convenio:', err)
        return { 
            success: false, 
            error: err.message || 'Error interno del servidor' 
        }
    }
}

export async function getAgreementInstallmentsAction(agreementId: string) {
    const supabase = createAdminClient()
    try {
        console.log(`🔍 [getAgreementInstallmentsAction] Buscando cuotas para convenio ID: ${agreementId}`)
        const { data, error } = await supabase
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
    const supabase = createAdminClient()
    try {
        console.log(`🔄 [updateInstallmentStatusAction] Actualizando cuota ID: ${id} a estado: ${status}`)
        const { data, error } = await supabase
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
    organizationId: string
    adminUserId: string
}

export async function sendInstallmentReminderAction({
    installmentId,
    agreementId,
    residentId,
    installmentNumber,
    amount,
    dueDate,
    organizationId,
    adminUserId
}: SendReminderPayload) {
    const supabase = createAdminClient()
    try {
        console.log(`📤 [sendInstallmentReminderAction] Enviando recordatorio para cuota #${installmentNumber} del convenio ${agreementId}`)
        
        // 1. Send to n8n webhook
        const webhookUrl = process.env.N8N_CONVENIO_ADMIN_WEBHOOK || 'https://n8n.srv1286224.hstgr.cloud/webhook/convenio-admin'
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
        const { error: logError } = await supabase
            .from('communication_logs')
            .insert({
                organization_id: organizationId,
                resident_id: residentId,
                type: 'payment_agreement_reminder',
                method: 'whatsapp',
                message_type: `Recordatorio Cuota #${installmentNumber}`,
                created_at: new Date().toISOString(),
                created_by: adminUserId
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
    const supabase = createAdminClient()
    try {
        console.log(`🔍 [getAgreementHistoryAction] Buscando historial de comunicaciones para residente ID: ${residentId}`)
        const { data, error } = await supabase
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
    const supabase = createAdminClient()
    try {
        console.log(`🔍 [getResidentAgreementsAction] Buscando convenios para residente ID: ${residentId}`)
        const { data, error } = await supabase
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
    resident_id: string
    resident_name: string
    total_debt: number
    agreement_details: string
    comments: string
    condominium_id: string
}

export async function createResidentAgreementAction({
    resident_id,
    resident_name,
    total_debt,
    agreement_details,
    comments,
    condominium_id
}: CreateAgreementPayload) {
    const supabase = createAdminClient()
    try {
        console.log(`📤 [createResidentAgreementAction] Creando propuesta de convenio para residente: ${resident_name}`)
        const { data, error } = await supabase
            .from('payment_agreements')
            .insert({
                resident_id,
                resident_name,
                total_debt,
                agreement_details,
                comments,
                status: 'pending',
                condominium_id,
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

