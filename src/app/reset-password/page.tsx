import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ResetPasswordClient from './ResetPasswordClient'

export default async function ResetPasswordPage() {
    const supabase = await createClient()
    
    // 1. Verificar la sesión directamente en el SERVIDOR (usando cookies)
    const { data: { session } } = await supabase.auth.getSession()

    // 2. Si no hay sesión en el servidor, el enlace es realmente inválido o expiró
    if (!session) {
        console.error('❌ [ResetPasswordPage] No session found in cookies')
        return (
            <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0F172A] p-4 text-center">
                <div className="max-w-sm space-y-6 animate-fade-in">
                    <div className="h-20 w-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 mx-auto">
                        <span className="text-3xl">⚠️</span>
                    </div>
                    <h1 className="text-xl font-bold text-white">Enlace inválido o expirado</h1>
                    <p className="text-zinc-400 text-sm">
                        Tu sesión de seguridad no pudo ser validada. Por favor, solicita un nuevo acceso desde el portal o contacta a soporte.
                    </p>
                    <a href="/login" className="block w-full py-3 bg-zinc-800 text-white rounded-xl font-medium hover:bg-zinc-700 transition-colors">
                        Volver al inicio
                    </a>
                </div>
            </div>
        )
    }

    // 3. Si hay sesión, renderizar el componente de cliente pasándole el contexto
    return (
        <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#0F172A]">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1)_0%,transparent_50%)]" />
            </div>
            <ResetPasswordClient />
        </div>
    )
}
