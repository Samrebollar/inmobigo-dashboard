'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { Role } from '@/types/auth'

export async function inviteTeamMemberAction(fullName: string, email: string, role: Role, organizationId: string) {
    if (!email || !role || !organizationId || !fullName) {
        return { success: false, error: 'Datos incompletos para enviar la invitación' }
    }

    try {
        const adminClient = createAdminClient()
        
        console.log(`✉️ [inviteTeamMemberAction] Invitando a ${email} con rol ${role} a la organización ${organizationId}`);

        // 1. Invitar al usuario vía Supabase Auth
        // Incluimos metadata para que el template de email de Supabase pueda usar variables dinámicas
        const roleLabels: Record<Role, string> = {
            admin_condominio: 'Admin. de Condominio',
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
            // Si el usuario ya existe, podríamos intentar simplemente agregarlo a la organización
            if (inviteError.message.includes('already exists') || inviteError.status === 422) {
                console.log('⚠️ [inviteTeamMemberAction] El usuario ya existe en Auth, intentando vinculación directa...');
                
                // Buscar el ID del usuario existente
                const { data: existingUsers } = await adminClient.auth.admin.listUsers()
                const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
                
                if (existingUser) {
                    // Vincular directamente
                    const { error: linkError } = await adminClient
                        .from('organization_users')
                        .upsert({
                            organization_id: organizationId,
                            user_id: existingUser.id,
                            role_new: role,
                            status: 'active', // Si ya existe, lo activamos directo? O pendiente?
                            invited_at: new Date().toISOString()
                        }, { onConflict: 'organization_id, user_id' })

                    if (linkError) throw linkError
                    
                    revalidatePath('/dashboard/configuracion')
                    return { success: true, message: 'Usuario existente vinculado a la organización' }
                }
            }
            throw inviteError
        }

        const newUser = inviteData.user
        if (!newUser) throw new Error('No se pudo crear el usuario de invitación')

        // 2. Crear entrada en organization_users como pendiente
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
            // No lanzamos error aquí porque la invitación de Auth ya se envió
        }

        revalidatePath('/dashboard/configuracion')

        return { success: true }
    } catch (error: any) {
        console.error('🔴 [inviteTeamMemberAction] ERROR:', error.message)
        return { success: false, error: error.message || 'Error desconocido al enviar invitación' }
    }
}
