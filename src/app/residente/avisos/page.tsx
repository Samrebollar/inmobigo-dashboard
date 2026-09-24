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

    const adminSupabase = createAdminClient()

    const { data: resident } = await adminSupabase
        .from('residents')
        .select('*, condominiums(organization_id, name)')
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

    const propertyName = resident?.condominiums?.name

    // Los avisos son por organización, pero un administrador puede tener
    // varios condominios — sin filtrar por el propio (o los marcados como
    // "Todos"), el residente veía también los avisos de otros condominios
    // de la misma organización.
    let query = adminSupabase
        .from('announcements')
        .select('*')
        .eq('organization_id', finalOrganizationId)
        .eq('is_active', true)

    if (propertyName) {
        query = query.or(`visibility.eq.Todos,visibility.eq."${propertyName}"`)
    }

    const { data: initialAnnouncements } = await query
        .order('created_at', { ascending: false })
        .limit(50)

    return (
        <ResidentAnnouncementsClient 
            initialAnnouncements={initialAnnouncements || []}
        />
    )
}
