import { createClient } from '@/utils/supabase/server'
import { getTransparencyData } from '@/app/actions/accounting-server-actions'
import { TransparencyClient } from '@/components/dashboard/transparency/transparency-client'
import { redirect } from 'next/navigation'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function TransparencyPage() {
    const supabase = await createClient()

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Resolve Resident's Condominium
    const { data: resident } = await supabase
        .from('residents')
        .select('condominium_id')
        .eq('user_id', user.id)
        .maybeSingle()

    const { data: orgUser } = await supabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    const isAdmin = !!orgUser;

    // Para la vista de transparencia, necesitamos un condominio id.
    // Si es admin testeando, obtendremos el primero disponible o 'all'
    let targetCondoId = resident?.condominium_id

    if (!targetCondoId) {
        if (orgUser) {
            targetCondoId = 'all' // Admin view fallback
        }
    }

    if (!targetCondoId) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-6 text-center">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-rose-500 shadow-2xl relative overflow-hidden">
                    <AlertCircle size={32} />
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">Acceso No Vinculado</h2>
                    <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed">
                        No hemos podido identificar tu condominio. Asegúrate de que tu cuenta esté vinculada a una propiedad activa.
                    </p>
                </div>
                <Link 
                    href="/dashboard"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-zinc-700 transition-all text-sm group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Volver al Dashboard</span>
                </Link>
            </div>
        )
    }

    const data = await getTransparencyData(targetCondoId)

    if (!data.success) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-6 text-center">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-amber-500 shadow-2xl relative overflow-hidden">
                    <AlertCircle size={32} />
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">Sin Datos Disponibles</h2>
                    <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed">
                        La administración aún no ha publicado movimientos financieros para tu condominio este mes.
                    </p>
                </div>
                <Link 
                    href="/dashboard"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-zinc-700 transition-all text-sm group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Volver al Dashboard</span>
                </Link>
            </div>
        )
    }

    return (
        <div className="max-w-[1400px] mx-auto p-4 md:p-8">
            <TransparencyClient data={data} condominiumId={targetCondoId} isAdmin={isAdmin} />
        </div>
    )
}
