'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Role } from '@/types/auth'

async function findAuthUserByEmail(adminClient: ReturnType<typeof createAdminClient>, email: string) {
    const target = email.toLowerCase()
    const { data: profile } = await adminClient
        .from('profiles')
        .select('id')
        .ilike('email', target)
        .maybeSingle()
    if (profile?.id) {
        const { data } = await adminClient.auth.admin.getUserById(profile.id)
        if (data?.user) return data.user
    }
    // listUsers es paginado: recorremos las páginas hasta encontrarlo
    for (let page = 1; page <= 20; page++) {
        const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
        if (error || !data?.users?.length) break
        const found = data.users.find(u => u.email?.toLowerCase() === target)
        if (found) return found
        if (data.users.length < 1000) break
    }
    return null
}

async function notifyExistingMemberAdded(payload: Record<string, string>) {
    try {
        const base = process.env.N8N_BASE_URL || 'https://n8n.inmobigo.mx'
        const res = await fetch(`${base}/webhook/equipo-acceso-agregado`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        return res.ok
    } catch (err) {
        console.error('🔴 [notifyExistingMemberAdded]', err)
        return false
    }
}

export async function inviteTeamMemberAction(fullName: string, email: string, role: Role, organizationId: string) {
    if (!email || !role || !organizationId || !fullName) {
        return { success: false, error: 'Datos incompletos para enviar la invitación' }
    }

    try {
        const adminClient = createAdminClient()
        
        console.log(`✉️ [inviteTeamMemberAction] Invitando a ${email} con rol ${role} a la organización ${organizationId}`);

        // 1. Invitar al usuario vía Supabase Auth
        const roleLabels: Record<Role, string> = {
            admin_condominio: 'Auxiliar de Condominio',
            security: 'Vigilante/Seguridad',
            owner: 'Propietario',
            admin: 'Administrador',
            manager: 'Gerente',
            accountant: 'Contador',
            staff: 'Personal',
            viewer: 'Observador',
            resident: 'Residente',
            tenant: 'Inquilino',
            admin_propiedad: 'Administrador de Propiedad'
        }

        const roleDescriptions: Record<Role, string> = {
            admin_condominio: 'Podrás gestionar unidades, residentes y reportes del condominio.',
            security: 'Tendrás acceso al control de visitas, paquetería y alertas de seguridad.',
            owner: 'Acceso total a la organización.',
            admin: 'Gestión total del sistema.',
            manager: 'Gestión operativa del sitio.',
            accountant: 'Acceso a finanzas y reportes.',
            staff: 'Apoyo operativo.',
            viewer: 'Acceso de solo lectura.',
            resident: 'Acceso al panel de residente.',
            tenant: 'Acceso al panel de inquilino.',
            admin_propiedad: 'Gestión total de propiedades.'
        }

        const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
            data: {
                full_name: fullName,
                organization_id: organizationId,
                role: role,
                role_name: roleLabels[role] || role,
                role_description: roleDescriptions[role] || '',
                user_type: role 
            },
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`
        })

        if (inviteError) {
            if (inviteError.message.includes('already exists') || inviteError.status === 422) {
                console.log('⚠️ [inviteTeamMemberAction] El usuario ya existe en Auth, intentando vinculación directa...');
                
                const existingUser = await findAuthUserByEmail(adminClient, email)

                if (existingUser) {
                    const { data: org } = await adminClient
                        .from('organizations')
                        .select('name, owner_id')
                        .eq('id', organizationId)
                        .maybeSingle()

                    if (org?.owner_id === existingUser.id) {
                        return { success: false, error: 'Ese correo es del administrador de la organización' }
                    }

                    const { error: linkError } = await adminClient
                        .from('organization_users')
                        .upsert({
                            organization_id: organizationId,
                            user_id: existingUser.id,
                            role_new: role,
                            status: 'active',
                            invited_at: new Date().toISOString()
                        }, { onConflict: 'organization_id, user_id' })

                    if (linkError) throw linkError

                    // Supabase no manda correo de invitación a cuentas que ya existen: avisamos por n8n
                    const emailSent = await notifyExistingMemberAdded({
                        email,
                        nombre: fullName.split(' ')[0] || fullName,
                        organizacion: org?.name || 'tu organización',
                        rol: roleLabels[role] || role,
                        descripcion: roleDescriptions[role] || '',
                        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.inmobigo.mx'}/login`
                    })

                    revalidatePath('/dashboard/configuracion')
                    return {
                        success: true,
                        message: emailSent
                            ? 'El correo ya tenía cuenta: se agregó al equipo y se le avisó por correo'
                            : 'El correo ya tenía cuenta: se agregó al equipo, pero no se pudo enviar el aviso por correo'
                    }
                }
            }
            throw inviteError
        }

        const newUser = inviteData.user
        if (!newUser) throw new Error('No se pudo crear el usuario de invitación')

        const { error: orgUserError } = await adminClient
            .from('organization_users')
            .insert({
                organization_id: organizationId,
                user_id: newUser.id,
                role_new: role,
                status: 'pending',
                invited_at: new Date().toISOString()
            })

        if (orgUserError) {
            console.error('Error creating organization_user:', orgUserError)
        }

        revalidatePath('/dashboard/configuracion')

        return { success: true }
    } catch (error: any) {
        console.error('🔴 [inviteTeamMemberAction] ERROR:', error.message)
        return { success: false, error: error.message || 'Error desconocido al enviar invitación' }
    }
}

export async function removeTeamMemberAction(memberId: string, userId: string) {
    if (!memberId || !userId) {
        return { success: false, error: 'Datos insuficientes para eliminar el miembro' }
    }

    try {
        const adminClient = createAdminClient()
        
        // 1. Obtener información antes de borrar para saber si es pendiente
        const { data: member } = await adminClient
            .from('organization_users')
            .select('status')
            .eq('id', memberId)
            .single()

        // 2. Eliminar de la organización
        const { error: deleteOrgError } = await adminClient
            .from('organization_users')
            .delete()
            .eq('id', memberId)

        if (deleteOrgError) throw deleteOrgError

        // 3. Si estaba pendiente, eliminar de Auth para limpiar invitaciones no aceptadas
        if (member?.status === 'pending') {
            console.log(`🧹 [removeTeamMemberAction] Eliminando invitación pendiente de Auth para ${userId}`);
            await adminClient.auth.admin.deleteUser(userId)
        }

        revalidatePath('/dashboard/configuracion')
        return { success: true }
    } catch (error: any) {
        console.error('🔴 [removeTeamMemberAction] ERROR:', error.message)
        return { success: false, error: error.message || 'Error al eliminar miembro' }
    }
}
