import { CheckCircle2, ShieldCheck } from 'lucide-react'

interface SuccessPageProps {
    searchParams: Promise<{ condo?: string }>
}

export const metadata = {
    title: 'Conexión Exitosa — InmobiGo',
    description: 'Mercado Pago ha sido conectado con éxito.',
}

export default async function PublicSuccessPage(props: SuccessPageProps) {
    const searchParams = await props.searchParams
    const condoName = searchParams.condo || 'el condominio'

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-zinc-950 to-zinc-950 pointer-events-none" />

            <main className="relative z-10 w-full max-w-md bg-zinc-900/90 border border-zinc-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto mb-6 shadow-xl shadow-emerald-500/10">
                    <CheckCircle2 className="h-10 w-10" />
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold mb-3">
                    ¡Conexión Exitosa!
                </span>

                <h1 className="text-2xl font-bold text-white tracking-tight">
                    Cuenta de Mercado Pago Vinculada
                </h1>

                <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                    La cuenta de Mercado Pago Business para <strong className="text-zinc-200">{condoName}</strong> se ha conectado correctamente.
                </p>

                <div className="mt-6 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-left space-y-2">
                    <p className="text-xs text-zinc-400">
                        • Los cobros de cuotas realizados desde la app se depositarán directamente en tu cuenta bancaria asociada.
                    </p>
                    <p className="text-xs text-zinc-400">
                        • Ya puedes cerrar esta ventana con seguridad.
                    </p>
                </div>

                <div className="mt-8 pt-5 border-t border-zinc-800/60 flex items-center justify-center gap-2 text-xs text-zinc-500">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>InmobiGo — Gestión Segura de Condominios</span>
                </div>
            </main>
        </div>
    )
}
