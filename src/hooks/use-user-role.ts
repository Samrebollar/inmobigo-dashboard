'use client'

import { useState, useEffect } from 'react'
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

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const response = await fetch('/api/auth/org-user')
                if (!response.ok) {
                    setContext(prev => ({ ...prev, loading: false }))
                    return
                }

                const { orgUser } = await response.json()

                if (orgUser) {
                    const role = (orgUser.role_new || 'viewer') as Role
                    const permissions = ROLE_PERMISSIONS[role] || []
                    const businessType = orgUser.organizations?.business_type || 'condominio'

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
