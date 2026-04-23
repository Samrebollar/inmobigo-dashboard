import { createClient } from '@/utils/supabase/server'
import ResetPasswordClient from './ResetPasswordClient'
import { ShieldCheck, ArrowRight } from 'lucide-react'

export default async function ResetPasswordPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const params = await searchParams
    
    // En Next.js, searchParams es un objeto plano, no un URLSearchParams
    const code = params.code as string | undefined
    const token_hash = params.token_hash as string | undefined
    const type = params.type as string | undefined
    const isVerified = params.verified === 'true'

    // 2. Si viene del correo pero aún no ha hecho el "clic humano" para evitar el pre-click de Gmail
    if ((code || token_hash) && !isVerified) {
        const confirmUrl = `/auth/confirm?${code ? `code=${code}` : `token_hash=${token_hash}&type=${type}`}&next=/reset-password?verified=true`
        
        return (
            <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0F172A] p-4 text-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.15)_0%,transparent_50%)] z-0" />
                
                <div className="relative z-10 w-full max-w-sm backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-fade-in-up">
                    <div className="flex justify-center">
                        <div className="h-20 w-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                            <ShieldCheck className="h-10 w-10 text-indigo-400" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold text-white">Verificación de Acceso</h1>
                        <p className="text-zinc-400 text-sm">
                            Haga clic en el botón de abajo para activar su invitación y configurar su contraseña.
                        </p>
                    </div>

                    <a 
                        href={confirmUrl}
                        className="group relative flex items-center justify-center gap-3 w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20"
                    >
                        <span>ACTIVAR MI CUENTA</span>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </a>
                </div>
            </div>
        )
    }

    // 3. Verificar la sesión real
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        return (
            <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0F172A] p-4 text-center">
                <div className="max-w-sm space-y-6 animate-fade-in">
                    <div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 mx-auto font-bold text-red-500">
                        !
                    </div>
                    <h1 className="text-xl font-bold text-white">Acceso no autorizado</h1>
                    <p className="text-zinc-400 text-sm">
                        No se detectó una sesión activa. Si acabas de recibir un correo, asegúrate de usar el botón de activación.
                    </p>
                    <a href="/login" className="block w-full py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors">
                        Volver al inicio
                    </a>
                </div>
            </div>
        )
    }

    // 4. Si todo está validado, mostrar el formulario final de contraseña
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0F172A]">
            <ResetPasswordClient />
        </div>
    )
}
