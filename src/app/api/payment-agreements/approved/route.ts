import { NextResponse } from 'next/server'
import { updatePaymentAgreementStatusAction } from '@/app/actions/payment-agreement-actions'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agreement_id } = body

    if (!agreement_id) {
      return NextResponse.json(
        { success: false, error: 'agreement_id es requerido' },
        { status: 400 }
      )
    }

    // La verificación de sesión y de pertenencia a la organización del
    // residente ocurre dentro de la Server Action — este endpoint ya no
    // actualiza la base de datos directamente sin autorización.
    const result = await updatePaymentAgreementStatusAction({
      id: agreement_id,
      status: 'approved',
    })

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Error al actualizar el convenio' },
        { status: 403 }
      )
    }

    // Notificar al Webhook de n8n de forma opcional (sin romper si falla o no está configurado)
    const webhookUrl = process.env.N8N_CONVENIO_ADMIN_WEBHOOK || 'https://n8n.inmobigo.mx/webhook/convenio-decision'
    let webhookSuccess = false
    let webhookError = ''

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

    return NextResponse.json({
      success: true,
      data: result.data,
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
