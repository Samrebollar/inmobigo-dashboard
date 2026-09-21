'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { syncToLegacy, syncPaymentToLegacy, buildFolio } from '@/services/legacy-sync-service'

/**
 * @param residentId - Cuando se pasa (pantalla del residente), acota el
 * resultado a sus propios comprobantes. Sin este parámetro (pantalla del
 * admin, ya protegida por rol en su página) devuelve todos los de su
 * organización. Antes esta función siempre devolvía TODOS los comprobantes
 * de la plataforma sin filtro, y la pantalla del residente los filtraba
 * en el cliente por nombre/unidad (con OR en vez de AND) — cualquier
 * residente autenticado podía ver comprobantes de otras personas.
 */
export async function getValidations(residentId?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        let data, error

        if (residentId) {
            ({ data, error } = await supabase
                .from('payment_validations')
                .select('*, condominiums(name)')
                .eq('resident_id', residentId)
                .order('created_at', { ascending: false }))
        } else {
            const { organizationId, isStaff } = await resolveStaffOrganization(supabase, user.id)
            if (!isStaff || !organizationId) {
                return { success: false, error: 'No tienes permiso para ver estos comprobantes.' }
            }
            ;({ data, error } = await supabase
                .from('payment_validations')
                .select('*, condominiums!inner(name, organization_id)')
                .eq('condominiums.organization_id', organizationId)
                .order('created_at', { ascending: false }))
        }

        if (error) throw error
        return { success: true, data }
    } catch (error: any) {
        console.error('Error reading validations:', error)
        return { success: false, error: 'Error al leer datos: ' + error.message }
    }
}

async function resolveStaffOrganization(supabase: any, userId: string): Promise<{ organizationId: string | null, isStaff: boolean }> {
    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id, role_new')
        .eq('user_id', userId)
        .maybeSingle()

    const staffRoles = ['owner', 'admin', 'super_admin', 'manager', 'accountant', 'admin_condominio', 'admin_propiedad', 'staff', 'security']
    if (orgUser?.organization_id && staffRoles.includes(orgUser.role_new || '')) {
        return { organizationId: orgUser.organization_id, isStaff: true }
    }

    const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle()

    if (ownedOrg) {
        return { organizationId: ownedOrg.id, isStaff: true }
    }

    return { organizationId: null, isStaff: false }
}

export async function updateValidationStatus(
    id: string,
    status: 'aprobado' | 'rechazado',
    observacion?: string,
    periodMonth?: string
) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        // 1. Obtener la validación actual
        const { data: validation, error: fetchErr } = await supabase
            .from('payment_validations')
            .select('*, condominiums(organization_id)')
            .eq('id', id)
            .single()

        if (fetchErr || !validation) return { success: false, error: 'Registro no encontrado' }

        // Aprobar/rechazar genera una factura pagada real y reduce la deuda
        // real del residente — solo el staff de la organización del
        // condominio puede hacerlo. Antes cualquier usuario autenticado
        // podía llamar esto directamente (sin pasar por la UI de admin) y
        // auto-aprobar su propio comprobante falso.
        const { organizationId, isStaff } = await resolveStaffOrganization(supabase, user.id)
        const belongsToOrg = validation.condominiums?.organization_id
        if (!isStaff || !belongsToOrg || organizationId !== belongsToOrg) {
            return { success: false, error: 'No tienes permiso para validar este comprobante.' }
        }

        if (validation.status === 'aprobado' && status === 'aprobado') {
            return { success: true }
        }

        // 2. Actualizar estado de la validación
        const { error: updateStatusErr } = await supabase
            .from('payment_validations')
            .update({
                status,
                observacion: observacion || validation.observacion,
                nota: observacion || validation.nota,
            })
            .eq('id', id)

        if (updateStatusErr) throw updateStatusErr

        let approvedFolio: string | undefined = validation.folio

        // 3. Efectos secundarios al APROBAR
        if (status === 'aprobado') {
            const folioRes = await ensureValidationFolioAction(id)
            if (folioRes.success && folioRes.folio) {
                approvedFolio = folioRes.folio
            }

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
                    return { success: true, folio: approvedFolio }
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

        // ── Notificar a n8n de forma no bloqueante ────────────────────────────
        const pagoDecisionWebhook =
            process.env.N8N_PAGO_DECISION_WEBHOOK || 'https://n8n.inmobigo.mx/webhook/pago-decision'
        fetch(pagoDecisionWebhook, { method: 'POST' }).catch((err: Error) =>
            console.error('[Validation] Error al notificar webhook pago-decision:', err.message)
        )

        revalidatePath('/dashboard/validacion-pagos')
        return { success: true, folio: approvedFolio }
    } catch (error: any) {
        console.error('Error updating validation status:', error)
        return { success: false, error: 'Error al actualizar: ' + error.message }
    }
}

/**
 * Asegura que un registro de comprobante tenga un folio único (REC-XXXXXX) asignado en payment_validations.
 * Revisa primero si payment_validations.folio ya tiene valor. Si está vacío, genera uno mediante la secuencia
 * o fallback y actualiza la misma fila.
 */
export async function ensureValidationFolioAction(id: string): Promise<{ success: boolean; folio?: string; error?: string }> {
    try {
        const adminClient = createAdminClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // 1. Revisar si ya existe un folio guardado en DB
        const { data: current } = await adminClient
            .from('payment_validations')
            .select('folio')
            .eq('id', id)
            .maybeSingle()

        if (current?.folio && current.folio.trim() !== '') {
            return { success: true, folio: current.folio }
        }

        // 2. Intentar llamar a la función RPC 'ensure_payment_validation_folio'
        const { data: rpcFolio, error: rpcErr } = await adminClient
            .rpc('ensure_payment_validation_folio', { p_validation_id: id })

        if (!rpcErr && rpcFolio && typeof rpcFolio === 'string' && rpcFolio.trim() !== '') {
            return { success: true, folio: rpcFolio }
        }

        // 3. Fallback en JS si el RPC no se encuentra desplegado
        const fallbackFolio = `REC-${Date.now().toString().slice(-6)}`
        const { data: updated } = await adminClient
            .from('payment_validations')
            .update({ folio: fallbackFolio })
            .eq('id', id)
            .is('folio', null)
            .select('folio')
            .maybeSingle()

        const finalFolio = updated?.folio || current?.folio || fallbackFolio
        return { success: true, folio: finalFolio }
    } catch (err: any) {
        console.error('[Validation] Error al asegurar folio:', err)
        return { success: false, error: err.message }
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
        if (!data.comprobante_url) {
            return { success: false, error: 'Debes adjuntar el comprobante de pago.' }
        }

        const supabase = await createClient()

        const { data: newValidation, error } = await supabase
            .from('payment_validations')
            .insert({
                resident_name: data.resident_name || '',
                unit: data.unit || '',
                amount: Number(data.amount) || 0,
                date: data.date || new Date().toISOString().split('T')[0],
                comprobante_url: data.comprobante_url,
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
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'No autenticado' }

        const { data: validation, error: fetchErr } = await supabase
            .from('payment_validations')
            .select('status, resident_id, condominiums(organization_id)')
            .eq('id', id)
            .maybeSingle()

        if (fetchErr || !validation) return { success: false, error: 'Registro no encontrado' }

        const { data: ownResident } = await supabase
            .from('residents')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

        const isOwnPendingSubmission = validation.status === 'pendiente' && ownResident?.id === validation.resident_id
        const { organizationId, isStaff } = await resolveStaffOrganization(supabase, user.id)
        const isOrgStaff = isStaff && organizationId === (validation.condominiums as any)?.organization_id

        if (!isOwnPendingSubmission && !isOrgStaff) {
            return { success: false, error: 'No tienes permiso para eliminar este comprobante.' }
        }

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
