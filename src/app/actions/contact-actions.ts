'use server'

interface ContactInmobiGoPayload {
    organizationName?: string | null
    adminName?: string | null
    adminPhone?: string | null
    mensaje: string
}

export async function contactInmobiGoAction(payload: ContactInmobiGoPayload) {
    const mensaje = (payload.mensaje || '').trim()

    if (!mensaje) {
        return { success: false, error: 'Escribe un mensaje antes de enviarlo.' }
    }

    const n8nUrl = process.env.N8N_CONTACT_INMOBIGO_WEBHOOK_URL || process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL_CONTACT || 'https://n8n.inmobigo.mx/webhook/contact-inmobigo'

    try {
        const response = await fetch(n8nUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                organizationName: payload.organizationName || 'N/D',
                adminName: payload.adminName || 'N/D',
                adminPhone: payload.adminPhone || 'N/D',
                mensaje,
            }),
        })

        if (!response.ok) {
            throw new Error(`n8n respondió con estado ${response.status}`)
        }

        return { success: true }
    } catch (error: any) {
        console.error('[contactInmobiGoAction] Error enviando mensaje a n8n:', error)
        return { success: false, error: error?.message || 'No se pudo enviar el mensaje. Intenta de nuevo.' }
    }
}
