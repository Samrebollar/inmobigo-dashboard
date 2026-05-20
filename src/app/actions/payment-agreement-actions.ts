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
