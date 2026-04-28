import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { SubirComprobanteClient } from '@/components/residente/subir-comprobante-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SubirComprobantePage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Get Resident Data
    const { data: resident } = await supabase
        .from('residents')
        .select('*, condominiums(name, organization_id), units(unit_number)')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!resident) {
        return (
            <div className="container mx-auto px-6 py-8 text-center text-white">
                <p>No se encontró información de residente vinculada a tu cuenta.</p>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-2xl font-black text-white">Subir Comprobante de Pago</h1>
                <p className="text-zinc-400 text-sm">Envía tus comprobantes de transferencias para que el administrador los valide.</p>
            </div>

            <SubirComprobanteClient resident={resident} />
        </div>
    )
}
