'use server'

import { createClient } from '@/utils/supabase/server'
import { FinancialRecord, FiscalRegime } from '@/types/accounting'
import { revalidatePath } from 'next/cache'

export async function updateFiscalRegime(regime: FiscalRegime) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get current org
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser) {
        return { success: false, error: 'No tienes una organización vinculada. Contacta al administrador.' }
    }

    try {
        console.log('Action: updateFiscalRegime started', { regime })
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.error('Action: No user found')
            return { success: false, error: 'Usuario no autenticado' }
        }
        console.log('Action: User identified', user.id)

        // Get current org
        const { data: orgUser } = await supabase
            .from('organization_users')
            .select('organization_id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!orgUser) {
            console.error('Action: No org entry found for user', user.id)
            return { success: false, error: 'No tienes una organización vinculada. Contacta al administrador.' }
        }
        console.log('Action: Org found', orgUser.organization_id)

        const { error: updateError } = await supabase
            .from('organizations')
            .update({ fiscal_regime: regime })
            .eq('id', orgUser.organization_id)

        if (updateError) {
            console.error('Action: Database update error', updateError)
            return { success: false, error: `Error de base de datos: ${updateError.message}. ¿Ejecutaste el script SQL?` }
        }
        
        console.log('Action: Update successful, revalidating...')
        revalidatePath('/dashboard/contabilidad-inteligente')
        console.log('Action: Success!')
        return { success: true }
    } catch (e: any) {
        console.error('Action: Critical system error', e)
        return { success: false, error: `Error de sistema: ${e.message}` }
    }
}

export async function getAccountingData() {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // Get org and regime
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id, organizations(fiscal_regime)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!orgUser) {
        return {
            regime: null,
            organizationId: null,
            records: []
        }
    }

    const organizationId = orgUser.organization_id
    const regime = (orgUser as any).organizations?.fiscal_regime as FiscalRegime

    // Get records
    const { data: records, error } = await supabase
        .from('financial_records')
        .select('*')
        .eq('organization_id', organizationId)
        .order('date', { ascending: false })

    if (error) {
        console.error('Error fetching financial records:', error)
        return {
            regime: (orgUser as any).organizations?.fiscal_regime as FiscalRegime,
            organizationId,
            records: []
        }
    }

    return {
        regime,
        organizationId,
        records: records as FinancialRecord[]
    }
}

export async function createFinancialRecord(data: Omit<FinancialRecord, 'id' | 'created_at' | 'user_id'>) {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: record, error } = await supabase
        .from('financial_records')
        .insert({
            ...data,
            user_id: user.id
        })
        .select()
        .single()

    if (error) throw error
    
    revalidatePath('/dashboard/contabilidad-inteligente')
    return record as FinancialRecord
}

export async function deleteFinancialRecord(id: string) {
    const supabase = await createClient()
    
    const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('id', id)

    if (error) throw error
    
    revalidatePath('/dashboard/contabilidad-inteligente')
    return { success: true }
}
