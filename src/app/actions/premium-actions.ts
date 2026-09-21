'use server'

import { createClient } from '@/utils/supabase/server'
import { contactInmobiGoAction } from './contact-actions'

/**
 * Premium Services lead — envía la solicitud de cotización a InmobiGo por
 * WhatsApp (mismo flujo n8n que "Contactar a InmobiGo"). Antes solo hacía
 * console.log en el servidor y le decía al residente/admin que su
 * solicitud se había enviado, sin mandar nada a ningún lado.
 */
export async function preparePremiumLead(data: {
    serviceName: string
    category: string
    userName: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let organizationName: string | null = null
    let phone: string | null = null

    if (user) {
        const { data: resident } = await supabase
            .from('residents')
            .select('phone, condominiums(name, organization_id)')
            .eq('user_id', user.id)
            .maybeSingle()

        if (resident) {
            organizationName = (resident.condominiums as any)?.name || null
            phone = resident.phone || null
        } else {
            const { data: orgUser } = await supabase
                .from('organization_users')
                .select('organization_id, organizations(name)')
                .eq('user_id', user.id)
                .maybeSingle()
            organizationName = (orgUser?.organizations as any)?.name || null

            const { data: profile } = await supabase
                .from('profiles')
                .select('phone')
                .eq('id', user.id)
                .maybeSingle()
            phone = profile?.phone || null
        }
    }

    const mensaje = `Solicitud de cotización — Servicios Premium\n\nServicio: ${data.serviceName}\nCategoría: ${data.category}\n\nHola, quiero cotizar el servicio de ${data.serviceName} para mi condominio. ¿Me pueden dar más información?`

    const result = await contactInmobiGoAction({
        organizationName,
        adminName: data.userName,
        adminPhone: phone,
        mensaje,
    })

    if (!result.success) {
        return { success: false, error: result.error || 'No se pudo enviar la solicitud.' }
    }

    return {
        success: true,
        message: 'Solicitud enviada a InmobiGo por WhatsApp.',
    }
}
