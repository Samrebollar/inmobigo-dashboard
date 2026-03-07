'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Role, Permission, ROLE_PERMISSIONS, UserRoleContext } from '@/types/auth'

export function useUserRole(): UserRoleContext {
    const [context, setContext] = useState<UserRoleContext>({
        role: null,
        loading: true,
        organizationId: null,
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

                // Fetch org user to get role
                const { data: orgUser, error } = await supabase
                    .from('organization_users')
                    .select('role, organization_id')
                    .eq('user_id', user.id)
                    .single()

                if (orgUser && !error) {
                    const role = orgUser.role as Role
                    const permissions = ROLE_PERMISSIONS[role] || []

                    setContext({
                        role,
                        loading: false,
                        organizationId: orgUser.organization_id,
                        permissions,
                        isOwner: role === 'owner',
                        isAdmin: role === 'admin' || role === 'owner',
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
