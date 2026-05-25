'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncToLegacy, syncPaymentToLegacy, buildFolio } from '@/services/legacy-sync-service'

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

export async function updateValidationStatus(
    id: string,
    status: 'aprobado' | 'rechazado',
    observacion?: string,
    periodMonth?: string
) {
    try {
        const supabase = await createClient()

        // 1. Obtener la validación actual
        const { data: validation, error: fetchErr } = await supabase
            .from('payment_validations')
            .select('*')
            .eq('id', id)
            .single()

        if (fetchErr || !validation) return { success: false, error: 'Registro no encontrado' }

        if (validation.status === 'aprobado' && status === 'aprobado') {
            return { success: true }
        }

        // 2. Actualizar estado de la validación
        const { error: updateStatusErr } = await supabase
            .from('payment_validations')
            .update({
                status,
                observacion: observacion || validation.observacion,
            })
            .eq('id', id)

        if (updateStatusErr) throw updateStatusErr

        // 3. Efectos secundarios al APROBAR
        if (status === 'aprobado') {
            try {
                const adminClient = createAdminClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                )

                // ── Prevenir duplicados ───────────────────────────────────────────
                // Chequeamos si ya procesamos esta validación en resident_invoices
                const { data: existingRI } = await adminClient
                    .from('resident_invoices')
                    .select('id')
                    .eq('notes', `validation:${id}`)
                    .limit(1)
                    .maybeSingle()

                if (existingRI) {
                    revalidatePath('/dashboard/validacion-pagos')
                    return { success: true }
                }

                // ── Resolver el residente ─────────────────────────────────────────
                let resData: {
                    id: string
                    condominium_id: string
                    organization_id?: string
                } | null = null

                if (validation.resident_id) {
                    const { data } = await adminClient
                        .from('residents')
                        .select('id, condominium_id, debt_amount')
                        .eq('id', validation.resident_id)
                        .maybeSingle()
                    if (data) resData = data
                }

                if (!resData && validation.resident_name) {
                    const nameParts = validation.resident_name.split(' ')
                    const { data } = await adminClient
                        .from('residents')
                        .select('id, condominium_id, debt_amount')
                        .ilike('first_name', `%${nameParts[0]}%`)
                        .limit(1)
                        .maybeSingle()
                    if (data) resData = data
                }

                if (!resData && validation.unit) {
                    const { data: unitData } = await adminClient
                        .from('units')
                        .select('id, condominium_id')
                        .eq('unit_number', validation.unit)
                        .maybeSingle()
                    if (unitData) {
                        const { data: resident } = await adminClient
                            .from('residents')
                            .select('id, condominium_id, debt_amount')
                            .eq('unit_id', unitData.id)
                            .maybeSingle()
                        if (resident) resData = resident
                    }
                }

                if (!resData) {
                    console.warn('[Validation] No se encontró residente para la validación', id)
                    revalidatePath('/dashboard/validacion-pagos')
                    return { success: true }
                }

                // Resolver organization_id
                const { data: condoData } = await adminClient
                    .from('condominiums')
                    .select('organization_id')
                    .eq('id', resData.condominium_id)
                    .maybeSingle()

                const organizationId = condoData?.organization_id || null

                // ── Buscar deudas pendientes en resident_invoices ─────────────────
                const { data: pendingInvoices } = await adminClient
                    .from('resident_invoices')
                    .select('id, amount, balance_due, status, due_date, description, created_at')
                    .eq('resident_id', resData.id)
                    .in('status', ['pending', 'overdue'])
                    .order('due_date', { ascending: true })

                let remainingPayment = Number(validation.amount) || 0

                // ── Aplicar pago a facturas existentes ────────────────────────────
                if (pendingInvoices && pendingInvoices.length > 0) {
                    for (const invoice of pendingInvoices) {
                        if (remainingPayment <= 0) break

                        const currentBalance = Number(invoice.balance_due ?? invoice.amount)
                        const amountToApply = Math.min(remainingPayment, currentBalance)
                        remainingPayment -= amountToApply

                        const newBalanceDue = Math.max(0, currentBalance - amountToApply)
                        const newStatus = newBalanceDue <= 0 ? 'paid' : invoice.status
                        const paidAmount = Math.max(0, Number(invoice.amount) - newBalanceDue)

                        // Actualizar resident_invoices (fuente de verdad)
                        await adminClient
                            .from('resident_invoices')
                            .update({
                                balance_due: newBalanceDue,
                                status: newStatus,
                                updated_at: new Date().toISOString(),
                                notes: `validation:${id}`,
                            })
                            .eq('id', invoice.id)

                        // Sync al legacy invoices para n8n
                        await syncPaymentToLegacy(adminClient as any, invoice.id, {
                            paidAmount,
                            newBalanceDue,
                            newStatus,
                            paymentProvider: 'Manual',
                            externalPaymentId: id,
                        })
                    }
                }

                // ── Registrar excedente como nueva factura pagada ─────────────────
                if (remainingPayment > 0) {
                    // Calcular due_date correcto
                    let dueDateStr = validation.date || new Date().toISOString().split('T')[0]

                    if (periodMonth) {
                        let deadlineDay = 10
                        const { data: unitInfo } = await adminClient
                            .from('units')
                            .select('payment_deadline')
                            .eq('resident_id', resData.id)
                            .maybeSingle()
                        if (unitInfo?.payment_deadline) deadlineDay = unitInfo.payment_deadline

                        const [year, month] = periodMonth.split('-').map(Number)
                        dueDateStr = new Date(year, month - 1, deadlineDay).toISOString().split('T')[0]
                    }

                    const description = validation.nota
                        ? `Pago manual validado - ${validation.nota}`
                        : 'Pago manual validado'

                    // Insertar en resident_invoices (fuente de verdad)
                    const { data: newRI, error: insertRIErr } = await adminClient
                        .from('resident_invoices')
                        .insert({
                            organization_id: organizationId,
                            condominium_id: resData.condominium_id,
                            resident_id: resData.id,
                            amount: remainingPayment,
                            balance_due: 0,
                            status: 'paid',
                            invoice_type: 'manual_payment',
                            due_date: dueDateStr,
                            description,
                            notes: `validation:${id}`,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        })
                        .select()
                        .single()

                    if (!insertRIErr && newRI) {
                        // Sync al legacy invoices para n8n
                        await syncToLegacy(adminClient as any, {
                            id: newRI.id,
                            organization_id: organizationId || '',
                            condominium_id: resData.condominium_id,
                            resident_id: resData.id,
                            amount: remainingPayment,
                            balance_due: 0,
                            status: 'paid',
                            due_date: dueDateStr,
                            description,
                            created_at: newRI.created_at,
                            updated_at: newRI.updated_at,
                        }, {
                            paid_amount: remainingPayment,
                            paid_at: new Date().toISOString(),
                            payment_provider: 'Manual',
                            external_payment_id: id,
                            folio: buildFolio(newRI.id),
                        })
                    }
                }

                // ── Recalcular deuda real del residente ───────────────────────────
                const { data: finalInvoices } = await adminClient
                    .from('resident_invoices')
                    .select('balance_due')
                    .eq('resident_id', resData.id)
                    .in('status', ['pending', 'overdue'])

                const newDebt = (finalInvoices || []).reduce(
                    (sum, inv) => sum + Number(inv.balance_due ?? 0),
                    0
                )

                await adminClient
                    .from('residents')
                    .update({ debt_amount: newDebt })
                    .eq('id', resData.id)

                revalidatePath('/dashboard/finance/billing')
                revalidatePath(`/dashboard/residentes/${resData.id}`)
            } catch (e: any) {
                console.error('[Validation] Side effect error:', e)
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
    resident_name?: string
    unit?: string
    amount?: number
    date?: string
    comprobante_url?: string
}) {
    try {
        const supabase = await createClient()

        const { data: newValidation, error } = await supabase
            .from('payment_validations')
            .insert({
                resident_name: data.resident_name || '',
                unit: data.unit || '',
                amount: Number(data.amount) || 0,
                date: data.date || new Date().toISOString().split('T')[0],
                comprobante_url:
                    data.comprobante_url ||
                    'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&w=800&q=80',
                status: 'pendiente',
                nota: data.nota || '',
                resident_id: data.resident_id || null,
                condominium_id: data.condominium_id || null,
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
    return { success: true, count: 0 }
}
