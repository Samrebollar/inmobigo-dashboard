import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { redirect } from 'next/navigation'
import { ResidentAnnouncementsClient } from '@/components/residente/resident-announcements-client'

export const dynamic = 'force-dynamic'

export default async function AvisosPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(organization_id)')
        .eq('user_id', user.id)
        .maybeSingle()

    let finalOrganizationId = resident?.condominiums?.organization_id

    if (!finalOrganizationId) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-zinc-500">
                No se encontró un contexto de organización para este usuario.
            </div>
        )
    }

    const adminSupabase = createAdminClient()
    
    const { data: initialAnnouncements } = await adminSupabase
        .from('announcements')
        .select('*')
        .eq('organization_id', finalOrganizationId)
        .order('created_at', { ascending: false })
        .limit(50)

    return (
        <ResidentAnnouncementsClient 
            initialAnnouncements={initialAnnouncements || []}
        />
    )
}
