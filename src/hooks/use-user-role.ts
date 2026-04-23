'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Role, Permission, ROLE_PERMISSIONS, UserRoleContext } from '@/types/auth'

export function useUserRole(): UserRoleContext {
    const [context, setContext] = useState<UserRoleContext>({
        role: null,
        loading: true,
        organizationId: null,
        businessType: null,
        isPropiedades: false,
        permissions: [],
        isOwner: false,
        isAdmin: false,
        can: () => false
    })

    const supabase = createClient()

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    setContext(prev => ({ ...prev, loading: false }))
                    return
                }

                // Fetch org user to get role and organization business type
                const { data: orgUser, error } = await supabase
                    .from('organization_users')
                    .select(`
                        role_new, 
                        organization_id,
                        organizations (
                            business_type
                        )
                    `)
                    .eq('user_id', user.id)
                    .single()

                if (orgUser && !error) {
                    const role = orgUser.role_new as Role
                    const permissions = ROLE_PERMISSIONS[role] || []
                    const businessType = (orgUser.organizations as any)?.business_type || 'condominio'

                    setContext({
                        role,
                        loading: false,
                        organizationId: orgUser.organization_id,
                        businessType,
                        isPropiedades: businessType === 'propiedades',
                        permissions,
                        isOwner: role === 'owner' || role === 'admin_propiedad',
                        isAdmin: ['owner', 'admin', 'admin_condominio', 'admin_propiedad'].includes(role),
                        can: (permission: Permission) => permissions.includes(permission)
                    })
                } else {
                    // Fallback if no org user found (or error)
                    setContext(prev => ({ ...prev, loading: false }))
                }
            } catch (error) {
                console.error('Error fetching user role:', error)
                setContext(prev => ({ ...prev, loading: false }))
            }
        }

        fetchRole()
    }, [])

    return context
}
