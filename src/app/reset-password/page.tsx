import { createClient } from '@/utils/supabase/server'
import ResetPasswordClient from './ResetPasswordClient'

export default async function ResetPasswordPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const params = await searchParams
    
    // Obtenemos los parámetros de invitación si existen
    const code = params.code as string | undefined
    const token_hash = params.token_hash as string | undefined
    const type = params.type as string | undefined

    // Verificamos si ya existe sesión (por ejemplo, si el usuario ya activó)
    const { data: { session } } = await supabase.auth.getSession()

    // Solo mostramos error si NO hay sesión Y TAMPOCO hay parámetros de invitación
    if (!session && !code && !token_hash) {
        return (
            <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0F172A] p-4 text-center">
                <div className="max-w-sm space-y-6 animate-fade-in">
                    <div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 mx-auto font-bold text-red-500">
                        !
                    </div>
                    <h1 className="text-xl font-bold text-white">Enlace inválido o expirado</h1>
                    <p className="text-zinc-400 text-sm">
                        No se detectó una invitación válida. Por favor, usa el enlace enviado a tu correo o solicita uno nuevo.
                    </p>
                    <a href="/login" className="block w-full py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors">
                        Volver al inicio
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0F172A]">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1)_0%,transparent_50%)]" />
            </div>
            <ResetPasswordClient />
        </div>
    )
}
