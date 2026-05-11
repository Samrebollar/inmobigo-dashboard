'use client'

import { usePathname } from 'next/navigation'
import { SubscriptionLock } from './SubscriptionLock'

interface SubscriptionLockWrapperProps {
    children: React.ReactNode
    daysRemaining: number
    role: string
}

export function SubscriptionLockWrapper({ children, daysRemaining, role }: SubscriptionLockWrapperProps) {
    const pathname = usePathname()
    const isExpired = daysRemaining <= 0

    // Allow access to billing settings for admins to renew
    const isBillingRoute = pathname?.includes('/configuracion') || pathname?.includes('/billing')
    
    // Always lock if expired, UNLESS it's an admin on the billing route
    const shouldLock = isExpired && !(role !== 'resident' && role !== 'security' && isBillingRoute)

    if (shouldLock) {
        return (
            <div className="relative min-h-screen w-full bg-zinc-950">
                {/* The lock component is fixed and covers everything, but here we just render it in place of children to prevent any sensitive data from rendering underneath */}
                <SubscriptionLock role={role} />
            </div>
        )
    }

    return <>{children}</>
}
