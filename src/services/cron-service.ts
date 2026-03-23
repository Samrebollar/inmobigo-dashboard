import { createAdminClient } from '@/utils/supabase/admin'
import { SettingsCondominio } from '@/types/properties'
import { Invoice } from '@/types/finance'
import axios from 'axios'

export const cronService = {
  
  /**
   * Calcula la diferencia en días entre hoy y la fecha de vencimiento.
   * Negativo = Días antes del vencimiento (Recordatorio)
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
   * Evalúa y aplica el recargo por mora si cumple las condiciones establecidas.
   */
  async aplicarRecargo(factura: Invoice, config: SettingsCondominio) {
    if (factura.recargo_aplicado || !config.recargo_activo) return

    const diasAtraso = this.calcularDiasDiferencia(factura.due_date)
    
    if (diasAtraso >= config.recargo_dias_aplicar) {
      const supabase = createAdminClient()
      let recargoMonto = 0
      
      if (config.recargo_tipo === 'fijo') {
        recargoMonto = config.recargo_valor
      } else if (config.recargo_tipo === 'porcentaje') {
        recargoMonto = factura.amount * (config.recargo_valor / 100)
      }

      const nuevoMonto = factura.amount + recargoMonto

      // Actualizar la factura marcándola como vencida y con recargo aplicado
      const { error } = await supabase
        .from('invoices')
        .update({
          amount: nuevoMonto,
          status: 'overdue',
          recargo_aplicado: true,
          recargo_monto: recargoMonto,
          updated_at: new Date().toISOString()
        })
        .eq('id', factura.id)
      
      if (error) {
        console.error(`Error aplicando recargo a factura ${factura.id}:`, error)
      } else {
        console.log(`[Cron] Recargo de $${recargoMonto} aplicado a factura ${factura.id}`)
      }
    }
  },

  /**
   * Dispara el webhook hacia n8n o la API de automatización.
   */
  async dispararWebhookN8N(factura: any, tipo: 'recordatorio' | 'morosidad', dias: number) {
    // Ejemplo de Payload para WhatsApp / n8n
    const payload = {
      phone: factura.residents?.telefono || factura.residents?.phone,
      resident_name: factura.residents?.nombre || factura.residents?.name,
      condominium_name: factura.condominiums?.name,
      amount: factura.amount,
      due_date: factura.due_date,
      notification_type: tipo,
      days_difference: dias,
      payment_link: `https://inmobigo.com/pagar/${factura.id}`,
    }

    try {
      // Reemplazar con URL de n8n o endpoint preferido
      const n8nUrl = process.env.N8N_WEBHOOK_URL
      if (!n8nUrl) {
        console.log(`[Cron Mock] Payload ${tipo} generado para ${factura.id}`, payload)
        return
      }

      await axios.post(n8nUrl, payload)
      console.log(`[Cron] Webhook enviado a n8n para factura ${factura.id} (${tipo})`)
    } catch (error) {
       console.error(`Error enviando webhook para factura ${factura.id}:`, error)
    }
  }
}
