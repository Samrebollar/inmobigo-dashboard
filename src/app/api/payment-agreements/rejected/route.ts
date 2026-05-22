import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { agreement_id, reason } = body

    if (!agreement_id) {
      return NextResponse.json(
        { success: false, error: 'agreement_id es requerido' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'reason es requerido' },
        { status: 400 }
      )
    }

    const webhookUrl = process.env.N8N_CONVENIO_ADMIN_WEBHOOK
    if (!webhookUrl) {
      console.error('❌ N8N_CONVENIO_ADMIN_WEBHOOK no está configurado')
      return NextResponse.json(
        { success: false, error: 'Webhook no configurado' },
        { status: 500 }
      )
    }

    console.log(`📤 [rejected] Enviando agreement_id=${agreement_id} a webhook: ${webhookUrl}`)

    let webhookSuccess = false
    let webhookError = ''

    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreement_id,
          action: 'rejected',
          reason,
        }),
      })

      const responseStatus = webhookResponse.status
      let responseBody = ''
      try {
        responseBody = await webhookResponse.text()
      } catch {
        responseBody = '(no se pudo leer el cuerpo de la respuesta)'
      }

      console.log(`📥 [rejected] Webhook respondió con status ${responseStatus}: ${responseBody}`)

      webhookSuccess = webhookResponse.ok
      if (!webhookSuccess) {
        webhookError = `Webhook respondió con status ${responseStatus}`
      }
    } catch (fetchError: any) {
      console.error('❌ [rejected] Error de red al contactar webhook:', fetchError.message)
      webhookError = fetchError.message || 'Error de red al contactar webhook'
    }

    return NextResponse.json({
      success: true,
      webhook_sent: webhookSuccess,
      webhook_error: webhookError || undefined,
    })
  } catch (error: any) {
    console.error('❌ Excepción en endpoint rejected:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
