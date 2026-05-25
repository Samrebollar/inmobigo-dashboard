/**
 * ──────────────────────────────────────────────────────────────────────────────
 * LEGACY SYNC SERVICE — Capa de Compatibilidad n8n
 * ──────────────────────────────────────────────────────────────────────────────
 *
 * PROPÓSITO:
 *   Mantener la tabla `invoices` sincronizada con `resident_invoices` para que
 *   n8n siga funcionando sin cambios mientras `resident_invoices` es la fuente
 *   de verdad internamente.
 *
 * ARQUITECTURA:
 *   resident_invoices (fuente de verdad)
 *       ↓ sync automático vía este servicio
 *   invoices (capa legacy para n8n — NO eliminar aún)
 *
 * CUANDO USAR:
 *   - Después de escribir en `resident_invoices`, llamar syncToLegacy()
 *   - El resultado permite que n8n lea/escriba en `invoices` sin problemas
 *
 * FASE 2 (futura): Migrar n8n a resident_invoices y retirar este servicio.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { SupabaseClient } from '@supabase/supabase-js'

/** Campos que existen en `invoices` pero NO en `resident_invoices` */
interface LegacyInvoiceFields {
    folio?: string
    paid_amount?: number
    paid_at?: string | null
    payment_provider?: string | null
    unit_id?: string | null
    external_payment_id?: string | null
    recargo_aplicado?: boolean
    recargo_monto?: number
}

/** Construye el folio legacy desde el id de resident_invoices */
export function buildFolio(residentInvoiceId: string): string {
    return `FAC-${residentInvoiceId.substring(0, 8).toUpperCase()}`
}

/** Construye el payment_link dinámico desde el id de resident_invoices */
export function buildPaymentLink(residentInvoiceId: string, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://inmobigo.com'
    return `${base}/residente/payments/${residentInvoiceId}`
}

/**
 * Calcula el paid_amount equivalente para la tabla legacy.
 * resident_invoices usa balance_due; invoices usa paid_amount.
 */
export function calcPaidAmount(amount: number, balanceDue: number): number {
    return Math.max(0, Number(amount) - Number(balanceDue))
}

/**
 * Sincroniza un registro de `resident_invoices` hacia `invoices` (tabla legacy).
 *
 * Si ya existe una entrada con el mismo `resident_invoice_id` (en external_payment_id
 * o folio), la ACTUALIZA. Si no existe, la INSERTA.
 *
 * @param supabase - cliente Supabase con permisos de admin
 * @param residentInvoice - datos del registro en resident_invoices
 * @param extra - campos legacy adicionales (unit_id, external_payment_id, etc.)
 */
export async function syncToLegacy(
    supabase: SupabaseClient,
    residentInvoice: {
        id: string
        organization_id: string
        condominium_id: string
        resident_id: string
        amount: number
        balance_due: number
        status: string
        invoice_type?: string
        due_date: string
        description?: string
        created_at: string
        updated_at?: string
    },
    extra: LegacyInvoiceFields = {}
): Promise<{ success: boolean; error?: string }> {
    try {
        const folio = extra.folio || buildFolio(residentInvoice.id)
        const paidAmount = calcPaidAmount(residentInvoice.amount, residentInvoice.balance_due)
        const isPaid = residentInvoice.status === 'paid'

        const legacyPayload = {
            // Identidad compartida
            organization_id: residentInvoice.organization_id,
            condominium_id: residentInvoice.condominium_id,
            resident_id: residentInvoice.resident_id,
            // Financiero
            amount: residentInvoice.amount,
            balance_due: residentInvoice.balance_due,
            paid_amount: extra.paid_amount ?? paidAmount,
            status: residentInvoice.status,
            due_date: residentInvoice.due_date,
            description: residentInvoice.description || 'Cuota de Mantenimiento',
            // Legacy fields
            folio,
            unit_id: extra.unit_id ?? null,
            paid_at: extra.paid_at ?? (isPaid ? (residentInvoice.updated_at || new Date().toISOString()) : null),
            payment_provider: extra.payment_provider ?? null,
            external_payment_id: extra.external_payment_id ?? residentInvoice.id, // ref cruzada
            updated_at: new Date().toISOString(),
        }

        // Verificar si ya existe una entrada legacy para este resident_invoice
        const { data: existing } = await supabase
            .from('invoices')
            .select('id')
            .eq('external_payment_id', residentInvoice.id)
            .limit(1)
            .maybeSingle()

        if (existing?.id) {
            // ACTUALIZAR entrada existente
            const { error } = await supabase
                .from('invoices')
                .update(legacyPayload)
                .eq('id', existing.id)

            if (error) {
                console.error('[LegacySync] Error updating invoices:', error)
                return { success: false, error: error.message }
            }
        } else {
            // INSERTAR nueva entrada
            const { error } = await supabase
                .from('invoices')
                .insert({
                    ...legacyPayload,
                    created_at: residentInvoice.created_at,
                })

            if (error) {
                // No es crítico si falla (puede existir ya con otro campo)
                console.warn('[LegacySync] Could not insert into invoices (non-critical):', error.message)
                return { success: false, error: error.message }
            }
        }

        return { success: true }
    } catch (err: any) {
        console.error('[LegacySync] Unexpected error:', err)
        return { success: false, error: err.message }
    }
}

/**
 * Marca una invoice legacy como pagada basándose en el pago aplicado a resident_invoices.
 * Para usarse después de actualizar resident_invoices con status='paid'.
 */
export async function syncPaymentToLegacy(
    supabase: SupabaseClient,
    residentInvoiceId: string,
    paymentData: {
        paidAmount: number
        newBalanceDue: number
        newStatus: string
        paymentProvider?: string
        externalPaymentId?: string
    }
): Promise<void> {
    try {
        const isPaid = paymentData.newStatus === 'paid'

        await supabase
            .from('invoices')
            .update({
                paid_amount: paymentData.paidAmount,
                balance_due: paymentData.newBalanceDue,
                status: paymentData.newStatus,
                paid_at: isPaid ? new Date().toISOString() : null,
                payment_provider: paymentData.paymentProvider || null,
                external_payment_id: paymentData.externalPaymentId || residentInvoiceId,
                updated_at: new Date().toISOString(),
            })
            .eq('external_payment_id', residentInvoiceId)

        // No lanzamos error si falla — la tabla invoices es legacy, no crítica
    } catch (err: any) {
        console.warn('[LegacySync] syncPaymentToLegacy failed (non-critical):', err.message)
    }
}

/**
 * Construye el payload estándar para n8n/WhatsApp desde un resident_invoice.
 * Mantiene exactamente la misma estructura de payload que n8n espera.
 */
export function buildN8NPayload(params: {
    tipo?: 'recordatorio' | 'morosidad' | 'convenio'
    residentName: string
    phone: string
    amount: number
    dueDate: string
    residentInvoiceId: string
    condominiumName?: string
    unitNumber?: string
    daysOverdue?: number
}): Record<string, unknown> {
    return {
        tipo: params.tipo || 'recordatorio',
        first_name: params.residentName,
        phone: params.phone,
        amount: params.amount,
        due_date: params.dueDate,
        // payment_link generado dinámicamente — sin columna en BD
        payment_link: buildPaymentLink(params.residentInvoiceId),
        condominium: params.condominiumName || '',
        unit: params.unitNumber || 'S/N',
        days_overdue: params.daysOverdue || 0,
        // folio compatible con el formato legacy que n8n puede mostrar
        folio: buildFolio(params.residentInvoiceId),
    }
}
