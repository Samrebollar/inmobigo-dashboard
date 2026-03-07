'use client'

import { useUserRole } from '@/hooks/use-user-role'
import { Role, Permission } from '@/types/auth'
import { Skeleton } from '@/components/ui/skeleton'

interface RoleGuardProps {
    children: React.ReactNode
    allowedRoles?: Role[]
    requiredPermissions?: Permission[]
    fallback?: React.ReactNode
    showLoading?: boolean
}

export function RoleGuard({
    children,
    allowedRoles,
    requiredPermissions,
    fallback = null,
    showLoading = false
}: RoleGuardProps) {
    const { role, permissions, loading } = useUserRole()

    if (loading) {
        return showLoading ? <Skeleton className="h-full w-full opacity-20" /> : null
    }

    if (!role) {
        return <>{fallback}</>
    }

    // Check Roles
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <>{fallback}</>
    }

    // Check Permissions
    if (requiredPermissions) {
        const hasAllPermissions = requiredPermissions.every(p => permissions.includes(p))
        if (!hasAllPermissions) {
            return <>{fallback}</>
        }
    }

    return <>{children}</>
}
