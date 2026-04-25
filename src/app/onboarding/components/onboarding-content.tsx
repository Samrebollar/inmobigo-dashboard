'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserTypeSelection } from './user-type-selection'
import { createClient } from '@/utils/supabase/client'
import { updateUserRoleAdminAction } from '@/app/actions/auth-actions'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type UserType = 'admin_condominio' | 'admin_propiedades'

interface OnboardingContentProps {
    userId: string
    initialUserType?: UserType
}

export function OnboardingContent({ userId, initialUserType }: OnboardingContentProps) {
    const router = useRouter()
    const [step, setStep] = useState<number>(initialUserType ? 2 : 1)
    const [userType, setUserType] = useState<UserType | null>(initialUserType || null)
    const [loading, setLoading] = useState(false)

    const handleTypeSelection = async (type: UserType) => {
        setLoading(true)
        const supabase = createClient()
        
        try {
            console.log('--- INICIO ONBOARDING FLOW ---')
            console.log('Tipo seleccionado:', type)
            console.log('User ID:', userId)

            // 1. Ensure profile exists and save selection (Upsert)
            // We use upsert to handle legacy users without a profile record
            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({ 
                    id: userId,
                    user_type: type,
                    role_new: 'owner'
                }, { onConflict: 'id' })

            if (profileError) {
                console.error('ERROR PERFIL (UPSERT) MESSAGE:', profileError.message)
                toast.error(`Error al actualizar perfil: ${profileError.message}`)
                throw profileError
            }

            // 2. Check if owner already has an organization
            console.log('Verificando si el usuario ya tiene una organización...')
            const { data: existingOrg, error: checkError } = await supabase
                .from('organizations')
                .select('id')
                .eq('owner_id', userId)
                .maybeSingle()

            if (checkError) {
                console.error('ERROR CHECK ORG MESSAGE:', checkError.message)
            }

            let orgId = existingOrg?.id

            if (!orgId) {
                console.log('No se encontró organización previa, creando una nueva...')
                const defaultName = type === 'admin_condominio' ? 'Mi Condominio' : 'Mi Portafolio de Propiedades'
                const businessType = type === 'admin_condominio' ? 'condominio' : 'propiedades'
                
                const { data: newOrg, error: orgError } = await supabase
                    .from('organizations')
                    .insert({
                        name: defaultName,
                        owner_id: userId,
                        plan: 'free',
                        status: 'active',
                        type: type, // admin_condominio o admin_propiedades
                        business_type: businessType, // condominio o propiedades
                        address: 'Por configurar',
                        total_units: 0,
                        units_limit: 10,
                        portfolio_type: type === 'admin_propiedades' ? 'mixto' : null
                    })
                    .select()
                    .single()

                if (orgError) {
                    console.error('!!! ERROR INSERT ORG !!!')
                    toast.error(`Error al crear organización: ${orgError.message}`)
                    throw orgError
                }
                orgId = newOrg.id
                console.log('Organización creada exitosamente:', orgId)
            } else {
                console.log('Utilizando organización existente:', orgId)
                // Aseguramos que la organización existente tenga el business_type correcto
                const businessType = type === 'admin_condominio' ? 'condominio' : 'propiedades'
                await supabase
                    .from('organizations')
                    .update({ 
                        type: type,
                        business_type: businessType 
                    })
                    .eq('id', orgId)
            }

            // 3. Create Membership (if not exists)
            console.log('Vinculando membresía...')
            const { data: existingMember } = await supabase
                .from('organization_users')
                .select('id')
                .eq('organization_id', orgId)
                .eq('user_id', userId)
                .maybeSingle()

            if (!existingMember) {
                const { error: memberError } = await supabase
                    .from('organization_users')
                    .insert({
                        organization_id: orgId,
                        user_id: userId,
                        role_new: 'owner',
                        status: 'active'
                    })

                if (memberError) {
                    console.error('ERROR MEMBRESIA MESSAGE:', memberError.message)
                    throw memberError
                }
                console.log('Membresía creada.')
            }

            // 4. Update public.users and public.profiles for backward compatibility and role assignment
            console.log('Actualizando datos de usuario y perfil...')
            
            const commonRole = type // 'admin_condominio' o 'admin_propiedades'
            
            // Actualizar tabla public.users usando Server Action para saltar reglas RLS infinitas
            const roleUpdateResult = await updateUserRoleAdminAction(userId, commonRole)

            if (!roleUpdateResult.success) {
                console.error('ERROR TABLA USERS MESSAGE:', roleUpdateResult.error)
            }

            // Actualizar tabla public.profiles (usada para el contexto del frontend)
            const { error: finalProfileError } = await supabase
                .from('profiles')
                .update({ 
                    organization_id: orgId,
                    user_type: type,
                    role_new: 'owner'
                })
                .eq('id', userId)

            if (finalProfileError) {
                console.error('ERROR VINCULACION MESSAGE:', finalProfileError.message)
                throw finalProfileError
            }

            // Update user metadata in Auth (for middleware/RBAC sync)
            console.log('Actualizando metadatos de Auth...')
            await supabase.auth.updateUser({
                data: { 
                    user_type: type, 
                    role: commonRole, // Sincronizamos el rol para el middleware
                    organization_id: orgId
                }
            })

            console.log('Onboarding completado con éxito.')
            toast.success('Entorno configurado correctamente')
            
            // Forzar actualización total para que useUserRole capture los cambios desde organization_users
            window.location.href = '/dashboard'
        } catch (err: any) {
            console.error('--- FALLO CRITICO EN ONBOARDING ---')
            console.error('OBJETO ERROR:', err)
            if (err.message) {
                console.error('MENSAJE:', err.message)
                toast.error(`Error al configurar: ${err.message}`)
            } else {
                toast.error('Ocurrió un error inesperado al guardar tu selección.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="w-full">
            <div className="max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-white mb-2">¿Cómo usarás InmobiGo?</h2>
                    <p className="text-zinc-400">Selecciona el perfil que mejor se adapte a tus necesidades.</p>
                </div>
                <UserTypeSelection onSelect={handleTypeSelection} loading={loading} />
            </div>
            
            {/* Step indicator simplified */}
            <div className="mt-12 flex justify-center gap-2">
                <div className="h-1.5 w-12 rounded-full bg-indigo-500" />
                <div className="h-1.5 w-12 rounded-full bg-zinc-800" />
            </div>
        </div>
    )
}
