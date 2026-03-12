import OwnerDashboardClient from '@/components/owner/owner-dashboard-client'

export const metadata = {
    title: 'Owner Dashboard | InmobiGo Platform',
    description: 'Platform-wide analytics and management for InmobiGo owners.',
}

export default function OwnerDashboardPage() {
    // This will be a server component that could fetch initial global stats
    // For now, it just renders the high-fidelity client component
    return <OwnerDashboardClient />
}
