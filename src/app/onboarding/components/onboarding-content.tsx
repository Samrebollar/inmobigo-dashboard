'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserTypeSelection } from './user-type-selection'
import { createClient } from '@/utils/supabase/client'
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
                const { data: newOrg, error: orgError } = await supabase
                    .from('organizations')
                    .insert({
                        name: defaultName,
                        owner_id: userId,
                        plan: 'free',
                        status: 'active',
                        type: type,
                        address: 'Por configurar',
                        total_units: 0,
                        units_limit: 10,
                        portfolio_type: type === 'admin_propiedades' ? 'mixto' : null
                    })
                    .select()
                    .single()

                if (orgError) {
                    console.error('!!! ERROR INSERT ORG !!!')
                    console.error('CODE:', orgError.code)
                    console.error('MESSAGE:', orgError.message)
                    console.error('DETAILS:', orgError.details)
                    console.error('HINT:', orgError.hint)
                    throw orgError
                }
                orgId = newOrg.id
                console.log('Organización creada exitosamente:', orgId)
            } else {
                console.log('Utilizando organización existente:', orgId)
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

            // 4. Update profile to link organization
            console.log('Actualizando perfil final...')
            const { error: finalProfileError } = await supabase
                .from('profiles')
                .update({ organization_id: orgId })
                .eq('id', userId)

            if (finalProfileError) {
                console.error('ERROR VINCULACION MESSAGE:', finalProfileError.message)
                throw finalProfileError
            }

            // Update user metadata in Auth (for middleware/RBAC sync)
            console.log('Actualizando metadatos de Auth...')
            await supabase.auth.updateUser({
                data: { user_type: type, role: 'admin' }
            })

            console.log('Onboarding completado con éxito.')
            router.push('/dashboard')
            router.refresh()
        } catch (err: any) {
            console.error('--- FALLO CRITICO EN ONBOARDING ---')
            console.error('OBJETO ERROR:', err)
            if (err.message) console.error('MENSAJE:', err.message)
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
