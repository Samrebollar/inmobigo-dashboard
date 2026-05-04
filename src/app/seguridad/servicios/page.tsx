import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ServiciosClient from '@/components/seguridad/servicios/servicios-client'

export const metadata = {
    title: 'Servicios | InmobiGo',
    description: 'Generación de QRs y Avisos de Paquetería',
}

export default async function ServiciosPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Obtener los datos del residente
    const { data: resident, error: residentError } = await supabase
        .from('residents')
        .select(`
            *,
            condominiums(name, organization_id),
            units(unit_number)
        `)
        .eq('user_id', user.id)
        .single()

    // Si no es un residente, bloquear acceso
    if (residentError || !resident) {
        redirect('/seguridad') // Redirigir al dashboard general
    }

    return <ServiciosClient resident={resident} />
}
