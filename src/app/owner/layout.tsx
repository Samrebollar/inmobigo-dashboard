import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { OwnerSidebar } from '@/components/owner/owner-sidebar'
import { OwnerHeader } from '@/components/owner/owner-header'

export default async function OwnerLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // STRICT OWNER SECURITY: Only specialized email can access /owner
    const OWNER_EMAIL = 'acostasamuel947@gmail.com'

    if (!user || user.email !== OWNER_EMAIL) {
        redirect('/dashboard')
    }

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden font-sans antialiased">
            {/* Sidebar */}
            <OwnerSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                {/* Header */}
                <OwnerHeader />

                {/* Dashboard Scroll Area */}
                <main className="flex-1 overflow-y-auto bg-zinc-950 p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
