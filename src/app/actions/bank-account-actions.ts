'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function getBankAccounts(condominiumId?: string) {
    try {
        const supabase = await createClient()
        let query = supabase.from('bank_accounts').select('*, condominiums(name)')
        
        if (condominiumId) {
            query = query.eq('condominium_id', condominiumId)
        }

        const { data, error } = await query.order('created_at', { ascending: false })
        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error fetching bank accounts:', error)
        return { success: false, error: error.message }
    }
}

export async function saveBankAccount(data: {
    id?: string
    condominium_id: string
    bank_name: string
    account_number: string
    reference?: string
}) {
    try {
        const supabase = await createClient()
        
        if (data.id) {
            const { error } = await supabase
                .from('bank_accounts')
                .update({
                    condominium_id: data.condominium_id,
                    bank_name: data.bank_name,
                    account_number: data.account_number,
                    reference: data.reference,
                    updated_at: new Date().toISOString()
                })
                .eq('id', data.id)
            if (error) throw error
        } else {
            const { error } = await supabase
                .from('bank_accounts')
                .insert({
                    condominium_id: data.condominium_id,
                    bank_name: data.bank_name,
                    account_number: data.account_number,
                    reference: data.reference
                })
            if (error) throw error
        }
        
        revalidatePath('/dashboard/validacion-pagos')
        revalidatePath('/residente/subir-comprobante')
        return { success: true }
    } catch (error: any) {
        console.error('Error saving bank account:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteBankAccount(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('bank_accounts')
            .delete()
            .eq('id', id)
        if (error) throw error
        
        revalidatePath('/dashboard/validacion-pagos')
        revalidatePath('/residente/subir-comprobante')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting bank account:', error)
        return { success: false, error: error.message }
    }
}
