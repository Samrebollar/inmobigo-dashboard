'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function getValidations() {
    try {
        const supabase = await createClient()
        const { data, error } = await supabase
            .from('payment_validations')
            .select('*, condominiums(name)')
            .order('created_at', { ascending: false })

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error reading validations:', error)
        return { success: false, error: 'Error al leer datos: ' + error.message }
    }
}

export async function updateValidationStatus(id: string, status: 'aprobado' | 'rechazado', observacion?: string) {
    try {
        const supabase = await createClient()
        
        // 1. Get current validation
        const { data: validation, error: fetchErr } = await supabase
            .from('payment_validations')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchErr || !validation) return { success: false, error: 'Registro no encontrado' }
        
        if (validation.status === 'aprobado' && status === 'aprobado') {
            return { success: true }
        }

        // 2. Update status in database
        const { error: updateStatusErr } = await supabase
            .from('payment_validations')
            .update({ 
                status, 
                observacion: observacion || validation.observacion 
            })
            .eq('id', id)

        if (updateStatusErr) throw updateStatusErr
        
        // 3. Side Effects for Approval
        if (status === 'aprobado') {
            try {
                const adminClient = createAdminClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )
                
                // Evitar duplicados revisando si ya existe una factura con este ID de validación
                const { data: existingInv } = await adminClient
                    .from('invoices')
                    .select('id')
                    .eq('external_payment_id', id)
                    .limit(1)
                    .maybeSingle()
                    
                if (existingInv) {
                    revalidatePath('/dashboard/validacion-pagos')
                    return { success: true }
                }

                let resData = null
                if (validation.resident_id) {
                    const { data } = await adminClient
                        .from('residents')
                        .select('id, condominium_id, unit_id, debt_amount')
                        .eq('id', validation.resident_id)
                        .maybeSingle()
                    resData = data
                }
                
                if (!resData && validation.resident_name) {
                    const nameParts = validation.resident_name.split(' ')
                    const firstName = nameParts[0]
                    const { data } = await adminClient
                        .from('residents')
                        .select('id, condominium_id, unit_id, debt_amount')
                        .ilike('first_name', `%${firstName}%`)
                        .limit(1)
                        .maybeSingle()
                    resData = data
                }
                
                if (!resData) {
                    const { data: unitData } = await adminClient
                        .from('units')
                        .select('id, condominium_id')
                        .eq('unit_number', validation.unit)
                        .maybeSingle()
                    
                    if (unitData) {
                        const { data: resident } = await adminClient
                            .from('residents')
                            .select('id, condominium_id, unit_id, debt_amount')
                            .eq('unit_id', unitData.id)
                            .maybeSingle()
                        resData = resident
                    }
                }
                
                if (resData) {
                    const { data: condoData } = await adminClient
                        .from('condominiums')
                        .select('organization_id')
                        .eq('id', resData.condominium_id)
                        .maybeSingle()
                    
                    resData = {
                        ...resData,
                        organization_id: condoData?.organization_id
                    }
                }
                
                if (resData) {
                    // Buscar deudas pendientes
                    let invoiceQuery = adminClient
                        .from('invoices')
                        .select('*')
                        .in('status', ['pending', 'overdue'])
                        
                    if (resData.unit_id) {
                        invoiceQuery = invoiceQuery.or(`resident_id.eq.${resData.id},unit_id.eq.${resData.unit_id}`)
                    } else {
                        invoiceQuery = invoiceQuery.eq('resident_id', resData.id)
                    }
                    
                    const { data: pendingInvoices } = await invoiceQuery.order('due_date', { ascending: true })
                    let remainingPayment = validation.amount
                    
                    if (pendingInvoices && pendingInvoices.length > 0) {
                        for (const invoice of pendingInvoices) {
                            if (remainingPayment <= 0) break
                            
                            const currentBalance = invoice.balance_due !== null && invoice.balance_due !== undefined 
                                ? invoice.balance_due 
                                : invoice.amount
                                
                            const amountToApply = Math.min(remainingPayment, currentBalance)
                            remainingPayment -= amountToApply
                            
                            const newPaidAmount = (invoice.paid_amount || 0) + amountToApply
                            const newBalanceDue = Math.max(0, currentBalance - amountToApply)
                            const newStatus = newBalanceDue <= 0 ? 'paid' : invoice.status
                            
                            await adminClient
                                .from('invoices')
                                .update({
                                    paid_amount: newPaidAmount,
                                    balance_due: newBalanceDue,
                                    status: newStatus,
                                    paid_at: newBalanceDue <= 0 ? new Date().toISOString() : invoice.paid_at,
                                    payment_provider: 'Manual',
                                    external_payment_id: id,
                                    description: invoice.description.includes('Pago manual validado') 
                                        ? invoice.description 
                                        : `${invoice.description} (Pago manual validado)`,
                                    resident_id: invoice.resident_id || resData.id
                                })
                                .eq('id', invoice.id)
                        }
                    }
                    
                    // Registrar el excedente como saldo a favor
                    if (remainingPayment > 0) {
                        const folio = `INV-${Math.floor(100000 + Math.random() * 900000)}`
                        await adminClient
                            .from('invoices')
                            .insert({
                                organization_id: resData.organization_id,
                                condominium_id: resData.condominium_id,
                                unit_id: resData.unit_id,
                                resident_id: resData.id,
                                folio,
                                amount: remainingPayment,
                                paid_amount: remainingPayment,
                                balance_due: 0,
                                status: 'paid',
                                due_date: validation.date || new Date().toISOString().split('T')[0],
                                description: validation.nota ? `Pago manual validado - ${validation.nota}` : 'Pago manual validado',
                                created_at: new Date().toISOString(),
                                paid_at: new Date().toISOString(),
                                payment_provider: 'Manual',
                                external_payment_id: id
                            })
                    }
                    
                    // Recalcular deuda real
                    let finalInvoiceQuery = adminClient
                        .from('invoices')
                        .select('amount, balance_due')
                        .in('status', ['pending', 'overdue'])
                        
                    if (resData.unit_id) {
                        finalInvoiceQuery = finalInvoiceQuery.or(`resident_id.eq.${resData.id},unit_id.eq.${resData.unit_id}`)
                    } else {
                        finalInvoiceQuery = finalInvoiceQuery.eq('resident_id', resData.id)
                    }
                    
                    const { data: finalInvoices } = await finalInvoiceQuery
                    
                    let newDebt = 0
                    if (finalInvoices) {
                        newDebt = finalInvoices.reduce((sum, inv) => {
                            const balance = inv.balance_due !== null && inv.balance_due !== undefined 
                                ? inv.balance_due 
                                : inv.amount
                            return sum + balance
                        }, 0)
                    }
                    
                    await adminClient
                        .from('residents')
                        .update({ debt_amount: newDebt })
                        .eq('id', resData.id)
                        
                    revalidatePath('/dashboard/finance/billing')
                    revalidatePath(`/dashboard/residentes/${resData.id}`)
                }
            } catch (e: any) {
                console.error('Failed to execute side effects in Supabase:', e)
                return { success: false, error: 'Error en base de datos: ' + e.message }
            }
        }
        
        revalidatePath('/dashboard/validacion-pagos')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating validation status:', error)
        return { success: false, error: 'Error al actualizar: ' + error.message }
    }
}

export async function submitValidation(data: {
    nota?: string
    resident_id?: string
    condominium_id?: string
}) {
    try {
        const supabase = await createClient()
        
        const { data: newValidation, error } = await supabase
            .from('payment_validations')
            .insert({
                resident_name: data.resident_name,
                unit: data.unit,
                amount: Number(data.amount),
                date: data.date,
                comprobante_url: data.comprobante_url || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=800&q=80",
                status: "pendiente",
                nota: data.nota || "",
                resident_id: data.resident_id,
                condominium_id: data.condominium_id
            })
            .select()
            .single()
        
        if (error) throw error
        
        revalidatePath('/dashboard/validacion-pagos')
        revalidatePath('/residente/subir-comprobante')
        return { success: true, data: newValidation }
    } catch (error: any) {
        console.error('Error submitting validation:', error)
        return { success: false, error: 'Error al enviar comprobante: ' + error.message }
    }
}

export async function deleteValidation(id: string) {
    try {
        const supabase = await createClient()
        const { error } = await supabase
            .from('payment_validations')
            .delete()
            .eq('id', id)
        
        if (error) throw error
        
        revalidatePath('/dashboard/validacion-pagos')
        revalidatePath('/residente/subir-comprobante')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting validation:', error)
        return { success: false, error: 'Error al eliminar: ' + error.message }
    }
}

export async function syncApprovedValidations() {
    // This function can be kept as a no-op or removed if the migration handles everything real-time
    // For safety, let's keep it but make it work with Supabase
    return { success: true, count: 0 }
}
