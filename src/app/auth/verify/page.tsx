import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react'

export default async function VerifyPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const code = params.get('code') as string
    const token_hash = params.get('token_hash') as string
    const type = params.get('type') as string

    if (!code && !token_hash) {
        return redirect('/login')
    }

    // El enlace para el botón humano que evitará el pre-click de Gmail
    const confirmationUrl = `/auth/confirm?${code ? `code=${code}` : `token_hash=${token_hash}&type=${type}`}&next=/reset-password`

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0F172A] p-4 overflow-hidden">
            {/* Fondo Estético */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.15)_0%,transparent_50%)]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            </div>

            <div className="relative z-10 w-full max-w-md animate-fade-in">
                <div className="backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-[2.5rem] p-8 shadow-[0_0_50px_-12px_rgba(79,70,229,0.5)] text-center space-y-8">
                    
                    {/* Icono Animado */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse" />
                            <div className="relative h-24 w-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                                <ShieldCheck className="h-12 w-12 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Verifica tu Identidad</h1>
                        <p className="text-zinc-400 text-sm leading-relaxed px-4">
                            Por seguridad, necesitamos confirmar que eres tú quien intenta acceder al portal de <span className="text-indigo-400 font-semibold">InmobiGo</span>.
                        </p>
                    </div>

                    <a 
                        href={confirmationUrl}
                        className="group relative flex items-center justify-center gap-3 w-full py-4 bg-white text-black rounded-2xl font-bold text-lg hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-xl"
                    >
                        <span>CONFIRMAR Y CONTINUAR</span>
                        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </a>

                    <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">
                            Protección de identidad activa &copy; 2026
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
