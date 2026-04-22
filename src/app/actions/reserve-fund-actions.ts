'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { ReserveFund, ReserveFundTransaction } from '@/types/accounting'
import { revalidatePath } from 'next/cache'

/**
 * Get reserve fund data for a condominium
 */
export async function getReserveFundData(condominiumId: string) {
    const supabase = await createClient()
    
    try {
        // 1. Get the fund
        const { data: fund, error: fundError } = await supabase
            .from('reserve_fund')
            .select('*')
            .eq('condominium_id', condominiumId)
            .single()

        if (fundError && fundError.code !== 'PGRST116') {
            throw fundError
        }

        // 2. If no fund exists, return empty/initial state
        if (!fund) {
            return {
                exists: false,
                fund: null,
                transactions: []
            }
        }

        // 3. Get recent transactions
        const { data: transactions, error: txError } = await supabase
            .from('reserve_fund_transactions')
            .select('*')
            .eq('fund_id', fund.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (txError) throw txError

        return {
            exists: true,
            fund: fund as ReserveFund,
            transactions: (transactions || []) as ReserveFundTransaction[]
        }
    } catch (error) {
        console.error('[ReserveFund] Error fetching data:', error)
        return { success: false, error: 'Error al obtener datos del fondo' }
    }
}

/**
 * Configure or Create Reserve Fund
 */
export async function configureReserveFund(condominiumId: string, data: Partial<ReserveFund>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No autorizado')

    // Get org id for the condo
    const { data: condo } = await supabase
        .from('condominiums')
        .select('organization_id')
        .eq('id', condominiumId)
        .single()
    
    if (!condo) throw new Error('Condominio no encontrado')

    try {
        // 1. Get existing fund to check for balance changes
        const { data: existingFund } = await supabase
            .from('reserve_fund')
            .select('id, balance')
            .eq('condominium_id', condominiumId)
            .single()

        // 2. Perform the upsert
        const { data: fund, error } = await supabase
            .from('reserve_fund')
            .upsert({
                condominium_id: condominiumId,
                organization_id: condo.organization_id,
                target_amount: data.target_amount,
                balance: data.balance || 0,
                contribution_type: data.contribution_type,
                contribution_value: data.contribution_value,
                is_automated: data.is_automated,
                updated_at: new Date().toISOString()
            }, { onConflict: 'condominium_id' })
            .select()
            .single()

        if (error) throw error

        // 3. Record a transaction if balance changed significantly or is new
        const oldBalance = Number(existingFund?.balance || 0)
        const newBalance = Number(data.balance || 0)
        
        if (newBalance !== oldBalance) {
            const diff = newBalance - oldBalance
            await supabase.from('reserve_fund_transactions').insert({
                fund_id: fund.id,
                type: diff > 0 ? 'deposit' : 'withdrawal',
                amount: Math.abs(diff),
                reason: !existingFund ? 'Saldo Inicial' : 'Ajuste de Saldo Manual',
                description: `Ajuste realizado desde configuración por el administrador.`
            })
        }

        revalidatePath('/dashboard/contabilidad-inteligente')
        return { success: true, fund }
    } catch (error) {
        console.error('[ReserveFund] Error configuring fund:', error)
        return { success: false, error: 'Error al configurar el fondo' }
    }
}

/**
 * Record a manual transaction (Specialized for admin client to bypass RLS for automated deposits if needed)
 */
export async function recordFundTransaction(condominiumId: string, data: {
    type: 'deposit' | 'withdrawal',
    amount: number,
    reason: string,
    description?: string,
    expense_id?: string,
    invoice_id?: string
}) {
    const adminClient = createAdminClient()
    
    try {
        // 1. Get/Create the fund
        const { data: fund, error: fundError } = await adminClient
            .from('reserve_fund')
            .select('id, balance')
            .eq('condominium_id', condominiumId)
            .single()

        if (fundError) throw fundError

        // 2. Insert transaction
        const { error: txError } = await adminClient
            .from('reserve_fund_transactions')
            .insert({
                fund_id: fund.id,
                type: data.type,
                amount: data.amount,
                reason: data.reason,
                description: data.description,
                expense_id: data.expense_id,
                invoice_id: data.invoice_id
            })

        if (txError) throw txError

        // 3. Update balance
        const newBalance = data.type === 'deposit' 
            ? Number(fund.balance) + Number(data.amount)
            : Number(fund.balance) - Number(data.amount)

        const { error: updateError } = await adminClient
            .from('reserve_fund')
            .update({ 
                balance: newBalance,
                updated_at: new Date().toISOString()
            })
            .eq('id', fund.id)

        if (updateError) throw updateError

        revalidatePath('/dashboard/contabilidad-inteligente')
        return { success: true }
    } catch (error) {
        console.error('[ReserveFund] Error recording transaction:', error)
        return { success: false, error: 'Error al registrar movimiento' }
    }
}
