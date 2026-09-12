import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agreement_id, admin_user_id } = body

    if (!agreement_id) {
      return NextResponse.json(
        { success: false, error: 'agreement_id es requerido' },
        { status: 400 }
      )
    }

    // 1️⃣ Actualizar el estado en la base de datos PRIMERO (Operación Principal)
    const supabase = createAdminClient()
    const { data: updatedAgreement, error: dbError } = await supabase
      .from('payment_agreements')
      .update({
        status: 'approved',
        approved_by: admin_user_id || null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', agreement_id)
      .select()
      .single()

    if (dbError) {
      console.error('❌ [approved] Error al actualizar estado en Supabase:', dbError)
      return NextResponse.json(
        { success: false, error: dbError.message || 'Error al actualizar el convenio en base de datos' },
        { status: 500 }
      )
    }

    // 2️⃣ Notificar al Webhook de n8n de forma opcional (sin romper si falla o no está configurado)
    const webhookUrl = process.env.N8N_CONVENIO_ADMIN_WEBHOOK || 'https://n8n.srv1286224.hstgr.cloud/webhook/convenio-admin'
    let webhookSuccess = false
    let webhookError = ''

    if (webhookUrl) {
      try {
        console.log(`📤 [approved] Enviando agreement_id=${agreement_id} a webhook: ${webhookUrl}`)
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agreement_id,
            action: 'approved',
          }),
        })

        webhookSuccess = webhookResponse.ok
        if (!webhookSuccess) {
          webhookError = `Webhook respondió con status ${webhookResponse.status}`
        }
      } catch (fetchError: any) {
        console.error('❌ [approved] Error de red al contactar webhook:', fetchError.message)
        webhookError = fetchError.message || 'Error de red al contactar webhook'
      }
    } else {
      console.warn('⚠️ N8N_CONVENIO_ADMIN_WEBHOOK no configurado, omitiendo notificación')
      webhookError = 'Webhook no configurado'
    }

    return NextResponse.json({
      success: true,
      data: updatedAgreement,
      webhook_sent: webhookSuccess,
      webhook_error: webhookError || undefined,
    })
  } catch (error: any) {
    console.error('❌ Excepción en endpoint approved:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
