import { createAdminClient } from '@/utils/supabase/admin'
import { SettingsCondominio } from '@/types/properties'
import { syncToLegacy, buildPaymentLink, buildFolio } from './legacy-sync-service'

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
     * Evalúa y aplica recargo por mora si cumple las condiciones.
     *
     * MIGRADO: Actualiza `resident_invoices` (fuente de verdad).
     * Luego sincroniza a `invoices` para compatibilidad n8n.
     *
     * NOTA: resident_invoices no tiene recargo_aplicado/recargo_monto —
     * el recargo se suma directamente al balance_due.
     */
    async aplicarRecargo(
        factura: {
            id: string
            amount: number
            balance_due: number
            status: string
            due_date: string
            resident_id: string
            condominium_id: string
            organization_id: string
            description?: string
            created_at: string
        },
        config: SettingsCondominio
    ) {
        // No aplicar si ya está pagado o si recargos están desactivados
        if (factura.status === 'paid' || !config.recargo_activo) return

        const diasAtraso = this.calcularDiasDiferencia(factura.due_date)
        if (diasAtraso < config.recargo_dias_aplicar) return

        const supabase = createAdminClient()
        let recargoMonto = 0

        if (config.recargo_tipo === 'fijo') {
            recargoMonto = config.recargo_valor
        } else if (config.recargo_tipo === 'porcentaje') {
            recargoMonto = factura.amount * (config.recargo_valor / 100)
        }

        if (recargoMonto <= 0) return

        // El recargo incrementa el balance_due actual
        const currentBalance = Number(factura.balance_due ?? factura.amount)
        const nuevoBalance = currentBalance + recargoMonto

        // 1. Actualizar resident_invoices (fuente de verdad)
        const { error: riError } = await supabase
            .from('resident_invoices')
            .update({
                balance_due: nuevoBalance,
                status: 'overdue',
                updated_at: new Date().toISOString(),
            })
            .eq('id', factura.id)

        if (riError) {
            console.error(`[Cron] Error aplicando recargo a resident_invoice ${factura.id}:`, riError)
            return
        }

        console.log(`[Cron] Recargo de $${recargoMonto} aplicado a resident_invoice ${factura.id}`)

        // 2. Sync a invoices legacy (para n8n)
        await syncToLegacy(supabase, {
            ...factura,
            balance_due: nuevoBalance,
            status: 'overdue',
            updated_at: new Date().toISOString(),
        })
    },

    /**
     * Dispara el webhook hacia n8n con el payload legacy compatible.
     * El payload mantiene la misma estructura que n8n ya conoce.
     */
    async dispararWebhookN8N(
        factura: {
            id: string
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
        }

        try {
            const n8nUrl = process.env.N8N_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL
            if (!n8nUrl) {
                console.log(`[Cron Mock] Payload ${tipo} generado:`, JSON.stringify(payload, null, 2))
                return
            }
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
