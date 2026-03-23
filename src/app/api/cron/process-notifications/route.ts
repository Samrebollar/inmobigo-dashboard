import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cronService } from '@/services/cron-service'
import { Invoice } from '@/types/finance'

// Vercel / Next.js configurations for Cron
// export const maxDuration = 60 // Allows the function to run longer
// export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    // SECURITY: Usually Vercel Cron jobs send a secret header: `Authorization: Bearer CRON_SECRET`
    // You should uncomment and implement this to prevent unauthorized triggers.
    /*
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    */

    const supabase = createAdminClient()

    // 1. Obtener todas las facturas pendientes o vencidas, incluyendo datos relacionales
    const { data: facturas, error } = await supabase
      .from('invoices')
      .select(`
        *,
        residents (
          id, name, phone
        ),
        condominiums (
          id, name
        )
      `)
      .in('status', ['pending', 'overdue'])

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!facturas || facturas.length === 0) {
      return NextResponse.json({ message: 'No pending invoices to process' }, { status: 200 })
    }

    // Usamos un mapa en memoria para no obtener la configuración del mismo condominio múltiples veces
    const configMap = new Map<string, any>()
    let procesadas = 0
    let recargos = 0
    let recordatorios = 0
    let morosidades = 0

    // 2. Iterar facturas para procesar
    for (const factura of facturas as any[]) {
      // Lazy load configuraciones por condominio
      if (!configMap.has(factura.condominium_id)) {
        const configData = await cronService.obtenerConfiguracion(factura.condominium_id)
        configMap.set(factura.condominium_id, configData)
      }

      const config = configMap.get(factura.condominium_id)
      if (!config) continue // El condominio no tiene configuraciones guardadas

      const diasDif = cronService.calcularDiasDiferencia(factura.due_date)

      // a) Eavaluar Recargo por Mora (Si es positivo y superó límite d/ días)
      if (diasDif >= config.recargo_dias_aplicar && config.recargo_activo && !factura.recargo_aplicado && factura.status !== 'paid') {
        await cronService.aplicarRecargo(factura as Invoice, config)
        recargos++
      }

      // b) RECORDATORIOS: Días antes (negativo)
      if (diasDif < 0) {
        const diasAntes = Math.abs(diasDif)
        if (config.recordatorios_dias_antes && config.recordatorios_dias_antes.includes(diasAntes)) {
          await cronService.dispararWebhookN8N(factura, 'recordatorio', diasAntes)
          recordatorios++
        }
      }

      // c) AVISOS DE MOROSIDAD: Días después (positivo, pero no ha rebasado el límte para causar recargo)
      if (diasDif > 0) {
        if (config.morosidad_dias_despues && config.morosidad_dias_despues.includes(diasDif)) {
          await cronService.dispararWebhookN8N(factura, 'morosidad', diasDif)
          morosidades++
        }
      }

      procesadas++
    }

    // 3. Respuesta OK
    return NextResponse.json({ 
      message: 'Cron Job Ejecutado Exitosamente',
      stats: {
        total_evaluadas: facturas.length,
        procesadas,
        recargos_aplicados: recargos,
        recordatorios_enviados: recordatorios,
        alertas_morosidad_enviadas: morosidades
      }
    }, { status: 200 })

  } catch (err: any) {
    console.error('CRON ERROR:', err)
    return NextResponse.json({ error: 'System Error', details: err.message }, { status: 500 })
  }
}
