import { createAdminClient } from '@/utils/supabase/admin'

/**
 * Invitación de residentes SIN depender del correo de Supabase Auth.
 *
 * El SMTP configurado en Supabase rechaza la autenticación ("535 5.7.8
 * authentication failed"), así que inviteUserByEmail / resetPasswordForEmail
 * nunca entregaban el correo. Aquí se genera el enlace de activación con
 * generateLink (no envía nada) y el correo sale por n8n (flujo 36,
 * webhook residente-invitacion) con el SMTP de contacto@inmobigo.mx.
 *
 * Solo debe llamarse desde código de servidor ya autorizado.
 */

type AdminClient = ReturnType<typeof createAdminClient>

const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL || 'https://app.inmobigo.mx'

export async function findAuthUserIdByEmail(admin: AdminClient, email: string): Promise<string | null> {
    const target = email.toLowerCase()
    const { data: profile } = await admin.from('profiles').select('id').ilike('email', target).maybeSingle()
    if (profile?.id) return profile.id
    for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
        if (error || !data?.users?.length) break
        const found = data.users.find(u => u.email?.toLowerCase() === target)
        if (found) return found.id
        if (data.users.length < 1000) break
    }
    return null
}

/** Crea (sin enviar correo) la cuenta de acceso del residente si aún no existe. */
export async function ensureResidentAuthUser(admin: AdminClient, params: {
    email: string
    firstName?: string | null
    lastName?: string | null
    phone?: string | null
    /** Cuenta del Portal de Propietarios y Gestores en lugar de residente */
    portal?: 'propietario'
}): Promise<string> {
    const email = params.email.trim().toLowerCase()
    const existing = await findAuthUserIdByEmail(admin, email)
    if (existing) return existing

    const firstName = params.firstName || ''
    const lastName = params.lastName || ''
    const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        // Contraseña temporal aleatoria: el residente define la suya con el enlace de activación
        password: `${crypto.randomUUID()}Aa1!`,
        user_metadata: {
            first_name: firstName,
            last_name: lastName,
            full_name: `${firstName} ${lastName}`.trim(),
            phone: params.phone || null,
            ...(params.portal === 'propietario'
                ? {
                    role: 'propietario',
                    role_name: 'Propietario',
                    role_description: 'Podrás ver el estado de cuenta de tus unidades, a tus inquilinos y pagar la cuota.',
                    user_type: 'propietario',
                }
                : {
                    role: 'resident',
                    role_name: 'Residente',
                    role_description: 'Podrás reservar amenidades, ver tus estados de cuenta y reportar incidencias.',
                    user_type: 'resident',
                }),
        },
    })
    if (error || !data?.user) throw new Error(error?.message || 'No se pudo crear la cuenta de acceso')
    return data.user.id
}

/**
 * Envía (o reenvía) la invitación a un residente: asegura su cuenta de acceso,
 * la liga a residents.user_id, genera el enlace y manda el correo por n8n.
 */
export async function deliverResidentInvitation(admin: AdminClient, residentId: string): Promise<{ success: boolean; error?: string }> {
    const { data: resident } = await admin
        .from('residents')
        .select('id, email, first_name, last_name, phone, user_id, units(unit_number), condominiums(name)')
        .eq('id', residentId)
        .maybeSingle()

    if (!resident) return { success: false, error: 'Residente no encontrado' }
    const email = String(resident.email || '').trim().toLowerCase()
    if (!email) return { success: false, error: 'Este residente no tiene un correo electrónico configurado.' }

    try {
        const userId = resident.user_id || await ensureResidentAuthUser(admin, {
            email,
            firstName: resident.first_name,
            lastName: resident.last_name,
            phone: resident.phone,
        })
        if (!resident.user_id) {
            await admin.from('residents').update({ user_id: userId }).eq('id', resident.id)
        }

        const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({ type: 'recovery', email })
        const tokenHash = linkData?.properties?.hashed_token
        if (linkError || !tokenHash) throw new Error(linkError?.message || 'No se pudo generar el enlace de activación')

        const link = `${APP_URL()}/activar-residente?e=${encodeURIComponent(email)}&token_hash=${encodeURIComponent(tokenHash)}&type=recovery`
        const base = process.env.N8N_BASE_URL || 'https://n8n.inmobigo.mx'
        const res = await fetch(`${base}/webhook/residente-invitacion`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email,
                nombre: resident.first_name || 'Residente',
                condominio: (resident.condominiums as { name?: string } | null)?.name || 'tu condominio',
                unidad: (resident.units as { unit_number?: string } | null)?.unit_number || '',
                link,
            }),
        })
        if (!res.ok) throw new Error(`El servicio de correo respondió ${res.status}`)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Error desconocido'
        console.error('🔴 [deliverResidentInvitation]', residentId, message)
        return { success: false, error: `No se pudo enviar la invitación: ${message}` }
    }
}
