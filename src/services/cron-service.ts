import { createAdminClient } from '@/utils/supabase/admin'
import { SettingsCondominio } from '@/types/properties'
import { buildPaymentLink, buildFolio } from './legacy-sync-service'

/**
 * Cron Service — Gestión de recargos, morosidad y disparos a n8n
 *
 * MIGRADO: Ahora usa `resident_invoices` como fuente de verdad.
 * La tabla `invoices` se mantiene en sync vía legacy-sync-service para n8n.
 */
export const cronService = {
    /**
     * Calcula la diferencia en días entre hoy y la fecha de vencimiento.
     * Negativo = Días antes del vencimiento (Recordatorio preventivo)
     * Positivo = Días después del vencimiento (Atraso/Morosidad)
     */
    calcularDiasDiferencia(fechaVencimiento: string): number {
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const vencimiento = new Date(fechaVencimiento)
        vencimiento.setHours(0, 0, 0, 0)
        const diffTime = hoy.getTime() - vencimiento.getTime()
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    },

    /**
     * Obtiene la configuración de notificaciones de un condominio.
     */
    async obtenerConfiguracion(condominiumId: string): Promise<SettingsCondominio | null> {
        const supabase = createAdminClient()
        const { data, error } = await supabase
            .from('settings_condominio')
            .select('*')
            .eq('condominio_id', condominiumId)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error(`Error obteniendo configuración para ${condominiumId}:`, error)
        }
        return data
    },

    /**
     * Recargo por mora: UNA sola vez por cuota de mantenimiento vencida, cuando
     * cumple los días configurados (settings_condominio.recargo_*). Se genera
     * como un cargo aparte ("Recargo por mora · ...", invoice_type 'fine') y la
     * cuota original queda marcada con recargo_aplicado = true.
     *
     * Antes el recargo se sumaba al balance_due de la misma factura CADA DÍA que
     * corría el cron (no se revisaba recargo_aplicado) y además se "sincronizaba"
     * insertando otra fila en invoices — que hoy es la misma tabla que
     * resident_invoices —, duplicando la deuda.
     *
     * Devuelve true si aplicó el recargo.
     */
    async aplicarRecargo(
        factura: {
            id: string
            amount: number
            status: string
            due_date: string
            resident_id: string
            condominium_id: string
            organization_id: string
            unit_id?: string | null
            invoice_type?: string | null
            recargo_aplicado?: boolean | null
            description?: string
        },
        config: SettingsCondominio
    ): Promise<boolean> {
        if (!config.recargo_activo) return false
        if (factura.status === 'paid' || factura.status === 'cancelled') return false
        if (factura.recargo_aplicado) return false
        if ((factura.invoice_type || 'maintenance') !== 'maintenance') return false

        const diasAtraso = this.calcularDiasDiferencia(factura.due_date)
        const diasAplicar = Number(config.recargo_dias_aplicar ?? 0)
        if (diasAtraso <= 0 || diasAtraso < diasAplicar) return false

        let recargoMonto = 0
        if (config.recargo_tipo === 'fijo') {
            recargoMonto = Number(config.recargo_valor || 0)
        } else if (config.recargo_tipo === 'porcentaje') {
            recargoMonto = Number(factura.amount) * (Number(config.recargo_valor || 0) / 100)
        }
        recargoMonto = Math.round(recargoMonto * 100) / 100
        if (recargoMonto <= 0) return false

        const supabase = createAdminClient()

        // Se "reserva" la factura primero: si otra corrida ya la marcó, no hace nada
        const { data: claimed, error: claimError } = await supabase
            .from('resident_invoices')
            .update({ recargo_aplicado: true })
            .eq('id', factura.id)
            .eq('recargo_aplicado', false)
            .select('id')
        if (claimError || !claimed || claimed.length === 0) return false

        const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
        const { error: insertError } = await supabase.from('resident_invoices').insert({
            condominium_id: factura.condominium_id,
            organization_id: factura.organization_id,
            resident_id: factura.resident_id,
            unit_id: factura.unit_id ?? null,
            invoice_type: 'fine',
            invoice_scope: 'resident',
            status: 'pending',
            amount: recargoMonto,
            balance_due: recargoMonto,
            currency: 'MXN',
            due_date: hoy,
            description: `Recargo por mora · ${factura.description || 'Cuota de Mantenimiento'}`,
            folio: `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            reminder_sent: false,
            recargo_aplicado: true,
        })

        if (insertError) {
            console.error(`[Cron] Error creando recargo para ${factura.id}:`, insertError)
            await supabase.from('resident_invoices').update({ recargo_aplicado: false }).eq('id', factura.id)
            return false
        }

        console.log(`[Cron] Recargo de $${recargoMonto} generado para la cuota ${factura.id}`)
        return true
    },

    /**
     * Dispara el webhook hacia n8n con el payload legacy compatible.
     * El payload mantiene la misma estructura que n8n ya conoce.
     */
    async dispararWebhookN8N(
        factura: {
            id: string
            resident_id?: string
            organization_id?: string
            amount: number
            balance_due?: number
            due_date: string
            residents?: {
                first_name?: string
                last_name?: string
                telefono?: string
                phone?: string
            }
            condominiums?: { name?: string }
            unit_number?: string
        },
        tipo: 'recordatorio' | 'morosidad',
        dias: number
    ) {
        const residentName = [
            factura.residents?.first_name || '',
            factura.residents?.last_name || '',
        ].filter(Boolean).join(' ') || 'Residente'

        // Payload compatible con lo que n8n ya espera — NO cambiamos la estructura
        const payload = {
            tipo,
            first_name: residentName,
            phone: factura.residents?.telefono || factura.residents?.phone || '',
            amount: factura.amount,
            due_date: factura.due_date,
            // payment_link generado dinámicamente (sin columna en BD)
            payment_link: buildPaymentLink(factura.id),
            // folio compatible en formato legacy
            folio: buildFolio(factura.id),
            condominium: factura.condominiums?.name || '',
            unit: factura.unit_number || 'S/N',
            days_overdue: dias,
            // Para que n8n registre el envío en communication_logs
            balance_due: factura.balance_due ?? factura.amount,
            resident_id: factura.resident_id || null,
            organization_id: factura.organization_id || null,
        }

        try {
            const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL || 'https://n8n.inmobigo.mx/webhook/send-morosidad-whatsapp'
            await fetch(n8nUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            })
            console.log(`[Cron] Webhook enviado a n8n para resident_invoice ${factura.id} (${tipo})`)
        } catch (error) {
            console.error(`Error enviando webhook para resident_invoice ${factura.id}:`, error)
        }
    },
}
