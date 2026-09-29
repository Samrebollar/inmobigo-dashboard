import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { MisTareasClient } from '@/components/seguridad/mis-tareas-client'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Mis Tareas | InmobiGo',
    description: 'Tareas que te asignó la administración.',
}

export default async function MisTareasPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    return <MisTareasClient />
}
