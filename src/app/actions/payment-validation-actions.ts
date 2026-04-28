'use server'

import { promises as fs } from 'fs'
import path from 'path'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const filePath = path.join(process.cwd(), 'src', 'data', 'payment-validations.json')

export async function getValidations() {
    try {
        const data = await fs.readFile(filePath, 'utf8')
        return { success: true, data: JSON.parse(data) }
    } catch (error: any) {
        console.error('Error reading validations:', error)
        return { success: false, error: 'Error al leer datos: ' + error.message }
    }
}

export async function updateValidationStatus(id: string, status: 'aprobado' | 'rechazado', observacion?: string) {
    try {
        const data = await fs.readFile(filePath, 'utf8')
        const validations = JSON.parse(data)
        
        const index = validations.findIndex((v: any) => v.id === id)
        if (index === -1) return { success: false, error: 'Registro no encontrado' }
        
        if (validations[index].status === 'aprobado' && status === 'aprobado') {
            return { success: true }
        }

        validations[index].status = status
        if (observacion) {
            validations[index].observacion = observacion
        }
        

        
        // Side Effects for Approval
        if (status === 'aprobado') {
            try {
                const supabase = createAdminClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )
                console.log(`[DEBUG] SUPABASE_SERVICE_ROLE_KEY is ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'AVAILABLE' : 'NOT AVAILABLE'}`)
                const validation = validations[index]
                
                // Evitar duplicados revisando si ya existe una factura con este ID de validación
                const { data: existingInv, error: dupErr } = await supabase
                    .from('invoices')
                    .select('id')
                    .eq('external_payment_id', validation.id)
                    .limit(1)
                    .maybeSingle()
                    
                if (dupErr) {
                    console.error("DB ERROR (Duplicate check):", dupErr)
                    return { success: false, error: "Error al verificar duplicados: " + dupErr.message }
                }
                    
                if (existingInv) {
                    revalidatePath('/dashboard/validacion-pagos')
                    return { success: true }
                }

                let resData = null
                if (validation.resident_id) {
                    const { data, error: resErr } = await supabase
                        .from('residents')
                        .select('id, condominium_id, unit_id, debt_amount')
                        .eq('id', validation.resident_id)
                        .maybeSingle()
                        
                    if (resErr) {
                        console.error("DB ERROR (Fetch resident by ID):", resErr)
                        return { success: false, error: "Error al buscar residente por ID: " + resErr.message }
                    }
                    resData = data
                }
                
                if (!resData && validation.resident_name) {
                    const nameParts = validation.resident_name.split(' ')
                    const firstName = nameParts[0]
                    const { data, error: nameErr } = await supabase
                        .from('residents')
                        .select('id, condominium_id, unit_id, debt_amount')
                        .ilike('first_name', `%${firstName}%`)
                        .limit(1)
                        .maybeSingle()
                        
                    if (nameErr) {
                        console.error("DB ERROR (Fetch resident by name):", nameErr)
                        return { success: false, error: "Error al buscar residente por nombre: " + nameErr.message }
                    }
                    resData = data
                }
                
                if (!resData) {
                    const { data: unitData, error: unitErr } = await supabase
                        .from('units')
                        .select('id, condominium_id')
                        .eq('unit_number', validation.unit)
                        .maybeSingle()
                        
                    if (unitErr) {
                        console.error("DB ERROR (Fetch unit):", unitErr)
                        return { success: false, error: "Error al buscar unidad: " + unitErr.message }
                    }
                    
                    if (unitData) {
                        const { data: resident, error: resUnitErr } = await supabase
                            .from('residents')
                            .select('id, condominium_id, unit_id, debt_amount')
                            .eq('unit_id', unitData.id)
                            .maybeSingle()
                            
                        if (resUnitErr) {
                            console.error("DB ERROR (Fetch resident by unit):", resUnitErr)
                            return { success: false, error: "Error al buscar residente por unidad: " + resUnitErr.message }
                        }
                        resData = resident
                    }
                }
                
                if (resData) {
                    const { data: condoData, error: condoErr } = await supabase
                        .from('condominiums')
                        .select('organization_id')
                        .eq('id', resData.condominium_id)
                        .maybeSingle()
                        
                    if (condoErr) {
                        console.error("DB ERROR (Fetch condo):", condoErr)
                        return { success: false, error: "Error al buscar condominio: " + condoErr.message }
                    }
                    
                    resData = {
                        ...resData,
                        organization_id: condoData?.organization_id
                    }
                }
                
                                if (resData) {
                    console.log(`[DEBUG] resident_id: ${resData.id}, condominium_id: ${resData.condominium_id}, amount: ${validation.amount}`)
                    
                    // Buscar deudas pendientes
                    let invoiceQuery = supabase
                        .from('invoices')
                        .select('*')
                        .in('status', ['pending', 'overdue'])
                        
                    if (resData.unit_id) {
                        invoiceQuery = invoiceQuery.or(`resident_id.eq.${resData.id},unit_id.eq.${resData.unit_id}`)
                    } else {
                        invoiceQuery = invoiceQuery.eq('resident_id', resData.id)
                    }
                    
                    console.log(`[DEBUG] Querying pending invoices...`)
                    const { data: pendingInvoices, error: queryErr } = await invoiceQuery.order('due_date', { ascending: true })
                    
                    if (queryErr) {
                        console.error("DB ERROR (Query invoices):", queryErr)
                        return { success: false, error: "Error al consultar facturas: " + queryErr.message }
                    }
                        
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
                            
                            console.log(`[DEBUG] Updating invoice ${invoice.id}...`)
                            const { data: updatedInv, error: updateErr } = await supabase
                                .from('invoices')
                                .update({
                                    paid_amount: newPaidAmount,
                                    balance_due: newBalanceDue,
                                    status: newStatus,
                                    paid_at: newBalanceDue <= 0 ? new Date().toISOString() : invoice.paid_at,
                                    payment_provider: 'Manual',
                                    external_payment_id: validation.id,
                                    description: invoice.description.includes('Pago manual validado') 
                                        ? invoice.description 
                                        : `${invoice.description} (Pago manual validado)`,
                                    resident_id: invoice.resident_id || resData.id
                                })
                                .eq('id', invoice.id)
                                .select()
                                
                            if (updateErr) {
                                console.error("DB ERROR (Update invoice):", updateErr)
                                return { success: false, error: "Error al actualizar factura: " + updateErr.message }
                            }
                            
                            if (!updatedInv || updatedInv.length === 0) {
                                console.error("DB ERROR (Update invoice): No data returned")
                                return { success: false, error: "Error al actualizar factura: No retornó datos" }
                            }
                            console.log(`[DEBUG] Invoice ${invoice.id} updated successfully:`, updatedInv[0])
                        }
                    }
                    
                    // Registrar el excedente como saldo a favor (Opción B)
                    if (remainingPayment > 0) {
                        const folio = `INV-${Math.floor(100000 + Math.random() * 900000)}`
                        console.log(`[DEBUG] Inserting excess invoice...`)
                        const { data: insertedInv, error: insertErr } = await supabase
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
                                external_payment_id: validation.id
                            })
                            .select()
                            
                        if (insertErr) {
                            console.error("DB ERROR (Insert invoice):", insertErr)
                            return { success: false, error: "Error al insertar factura de excedente: " + insertErr.message }
                        }
                        
                        if (!insertedInv || insertedInv.length === 0) {
                            console.error("DB ERROR (Insert invoice): No data returned")
                            return { success: false, error: "Error al insertar factura de excedente: No retornó datos" }
                        }
                        console.log(`[DEBUG] Excess invoice inserted successfully:`, insertedInv[0])
                    }
                    
                    // Recalcular deuda real del residente basada en facturas pendientes
                    let finalInvoiceQuery = supabase
                        .from('invoices')
                        .select('amount, balance_due')
                        .in('status', ['pending', 'overdue'])
                        
                    if (resData.unit_id) {
                        finalInvoiceQuery = finalInvoiceQuery.or(`resident_id.eq.${resData.id},unit_id.eq.${resData.unit_id}`)
                    } else {
                        finalInvoiceQuery = finalInvoiceQuery.eq('resident_id', resData.id)
                    }
                    
                    const { data: finalInvoices, error: finalQueryErr } = await finalInvoiceQuery
                    
                    if (finalQueryErr) {
                        console.error("DB ERROR (Final query invoices):", finalQueryErr)
                        return { success: false, error: "Error al recalcular deuda: " + finalQueryErr.message }
                    }
                    
                    let newDebt = 0
                    if (finalInvoices) {
                        newDebt = finalInvoices.reduce((sum, inv) => {
                            const balance = inv.balance_due !== null && inv.balance_due !== undefined 
                                ? inv.balance_due 
                                : inv.amount
                            return sum + balance
                        }, 0)
                    }
                    
                    console.log(`[DEBUG] Updating resident debt to ${newDebt}...`)
                    const { data: updatedResident, error: resUpdateErr } = await supabase
                        .from('residents')
                        .update({ debt_amount: newDebt })
                        .eq('id', resData.id)
                        .select()
                        
                    if (resUpdateErr) {
                        console.error("DB ERROR (Update resident):", resUpdateErr)
                        return { success: false, error: "Error al actualizar deuda del residente: " + resUpdateErr.message }
                    }
                    
                    if (!updatedResident || updatedResident.length === 0) {
                        console.error("DB ERROR (Update resident): No data returned")
                        return { success: false, error: "Error al actualizar deuda del residente: No retornó datos" }
                    }
                    console.log(`[DEBUG] Resident updated successfully:`, updatedResident[0])
                    console.log("PAGO APLICADO CORRECTAMENTE")
                        
                    revalidatePath('/dashboard/finance/billing')
                    revalidatePath(`/dashboard/residentes/${resData.id}`)
                }
            } catch (e: any) {
                console.error('Failed to execute side effects in Supabase:', e)
                return { success: false, error: 'Error en base de datos: ' + e.message }
            }
        }
        
        await fs.writeFile(filePath, JSON.stringify(validations, null, 2))
        revalidatePath('/dashboard/validacion-pagos')
        return { success: true }
    } catch (error: any) {
        console.error('Error updating validation status:', error)
        return { success: false, error: 'Error al actualizar: ' + error.message }
    }
}

export async function submitValidation(data: {
    resident_name: string
    unit: string
    amount: number
    date: string
    comprobante_url: string
    nota?: string
    resident_id?: string
}) {
    try {
        const fileContent = await fs.readFile(filePath, 'utf8')
        const validations = JSON.parse(fileContent)
        
        const newValidation = {
            id: `val-${Date.now()}`,
            resident_name: data.resident_name,
            unit: data.unit,
            amount: Number(data.amount),
            date: data.date,
            comprobante_url: data.comprobante_url || "https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=800&q=80",
            status: "pendiente",
            nota: data.nota || "",
            resident_id: data.resident_id
        }
        
        validations.push(newValidation)
        
        await fs.writeFile(filePath, JSON.stringify(validations, null, 2))
        
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
        const fileContent = await fs.readFile(filePath, 'utf8')
        const validations = JSON.parse(fileContent)
        
        const filtered = validations.filter((v: any) => v.id !== id)
        
        await fs.writeFile(filePath, JSON.stringify(filtered, null, 2))
        
        revalidatePath('/dashboard/validacion-pagos')
        revalidatePath('/residente/subir-comprobante')
        return { success: true }
    } catch (error: any) {
        console.error('Error deleting validation:', error)
        return { success: false, error: 'Error al eliminar: ' + error.message }
    }
}

export async function syncApprovedValidations() {
    try {
        const data = await fs.readFile(filePath, 'utf8')
        const validations = JSON.parse(data)
        const approvedValidations = validations.filter((v: any) => v.status === 'aprobado')
        
        if (approvedValidations.length === 0) return { success: true, count: 0 }
        
        const supabase = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        let syncedCount = 0
        
        for (const validation of approvedValidations) {
            try {
                let resData = null
                if (validation.resident_id) {
                    const { data } = await supabase
                        .from('residents')
                        .select('id, condominium_id, unit_id, debt_amount')
                        .eq('id', validation.resident_id)
                        .maybeSingle()
                    resData = data
                }
                
                if (!resData && validation.resident_name) {
                    const nameParts = validation.resident_name.split(' ')
                    const firstName = nameParts[0]
                    const { data } = await supabase
                        .from('residents')
                        .select('id, condominium_id, unit_id, debt_amount')
                        .ilike('first_name', `%${firstName}%`)
                        .limit(1)
                        .maybeSingle()
                    resData = data
                }
                
                if (!resData) {
                    const { data: unitData } = await supabase
                        .from('units')
                        .select('id, condominium_id')
                        .eq('unit_number', validation.unit)
                        .maybeSingle()
                    
                    if (unitData) {
                        const { data: resident } = await supabase
                            .from('residents')
                            .select('id, condominium_id, unit_id, debt_amount')
                            .eq('unit_id', unitData.id)
                            .maybeSingle()
                        resData = resident
                    }
                }
                
                if (resData) {
                    const { data: condoData } = await supabase
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
                    const { data: existingPaid } = await supabase
                        .from('invoices')
                        .select('id')
                        .eq('resident_id', resData.id)
                        .eq('amount', validation.amount)
                        .eq('status', 'paid')
                        .limit(1)
                        .maybeSingle()
                        
                    if (!existingPaid) {
                        const { data: pendingInv } = await supabase
                            .from('invoices')
                            .select('id')
                            .eq('resident_id', resData.id)
                            .in('status', ['pending', 'overdue'])
                            .order('created_at', { ascending: true })
                            .limit(1)
                            .maybeSingle()
                            
                        if (pendingInv) {
                            await supabase
                                .from('invoices')
                                .update({ 
                                    status: 'paid', 
                                    paid_amount: validation.amount, 
                                    paid_at: new Date().toISOString() 
                                })
                                .eq('id', pendingInv.id)
                        } else {
                            const folio = `INV-${Math.floor(100000 + Math.random() * 900000)}`
                            await supabase
                                .from('invoices')
                                .insert({
                                    organization_id: resData.organization_id,
                                    condominium_id: resData.condominium_id,
                                    unit_id: resData.unit_id,
                                    resident_id: resData.id,
                                    folio,
                                    amount: validation.amount,
                                    paid_amount: validation.amount,
                                    status: 'paid',
                                    due_date: validation.date || new Date().toISOString().split('T')[0],
                                    description: validation.nota || 'Abono a pagos pendientes de Mantenimiento',
                                    created_at: new Date().toISOString(),
                                    paid_at: new Date().toISOString()
                                })
                        }
                        
                        if (resData.debt_amount !== undefined) {
                            const newDebt = Math.max(0, (resData.debt_amount || 0) - validation.amount)
                            await supabase
                                .from('residents')
                                .update({ debt_amount: newDebt })
                                .eq('id', resData.id)
                        }
                        syncedCount++
                    }
                }
            } catch (e) {
                console.error(`Error syncing validation ${validation.id}:`, e)
            }
        }
        
        revalidatePath('/dashboard/validacion-pagos')
        return { success: true, count: syncedCount }
    } catch (error: any) {
        console.error('Error in syncApprovedValidations:', error)
        return { success: false, error: error.message }
    }
}
