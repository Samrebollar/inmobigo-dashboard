import { ShieldCheck, ArrowRight } from 'lucide-react'

export default async function AccesoResidentePage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const code = params.code as string
    const token_hash = params.token_hash as string
    const type = params.type as string

    // Creamos la URL real de confirmación que SOLO se activará cuando el RESIDENTE haga clic
    const realConfirmationUrl = `/reset-password?${code ? `code=${code}` : `token_hash=${token_hash}&type=${type}`}`

    return (
        <div className="relative flex min-h-screen w-full items-center justify-center bg-[#0F172A] p-4 overflow-hidden">
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.15)_0%,transparent_50%)]" />
            </div>

            <div className="relative z-10 w-full max-w-sm backdrop-blur-2xl bg-white/[0.04] border border-white/15 rounded-[2.5rem] p-8 shadow-2xl space-y-8 animate-fade-in-up uppercase tracking-tighter">
                <div className="flex justify-center">
                    <div className="h-20 w-20 rounded-3xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                        <ShieldCheck className="h-10 w-10 text-indigo-400" />
                    </div>
                </div>

                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold text-white uppercase tracking-widest text-[10px] opacity-50 mb-2">Seguridad InmobiGo</h1>
                    <h2 className="text-xl font-bold text-white leading-tight">Confirmar Acceso</h2>
                    <p className="text-zinc-400 text-sm normal-case tracking-normal">
                        Para activar tu cuenta en tu celular, por favor pulsa el botón de abajo.
                    </p>
                </div>

                <a 
                    href={realConfirmationUrl}
                    className="group relative flex items-center justify-center gap-3 w-full py-5 bg-white text-black rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all active:scale-[0.95] shadow-xl"
                >
                    <span>CONFIRMAR AHORA</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </a>

                <p className="text-[10px] text-zinc-500 text-center uppercase tracking-widest">
                    Paso de verificación humana requerido
                </p>
            </div>
        </div>
    )
}
