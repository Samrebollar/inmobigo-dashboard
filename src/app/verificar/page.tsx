import { redirect } from 'next/navigation'
import { ShieldCheck, Search, XCircle } from 'lucide-react'
import { findTokenByShortCode } from '@/services/receipt-verification-service'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Verificar recibo | InmobiGo',
    description: 'Verifica la autenticidad de un recibo de pago emitido por la administración del condominio',
}

export default async function VerificarPage({ searchParams }: { searchParams: Promise<{ codigo?: string }> }) {
    const { codigo } = await searchParams
    let notFound = false
    if (codigo) {
        const token = await findTokenByShortCode(codigo)
        if (token) redirect(`/verificar/${token}`)
        notFound = true
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans px-4 py-12 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-[130px] rounded-full pointer-events-none" />
            <main className="relative z-10 w-full max-w-md rounded-[2rem] border border-zinc-800 bg-zinc-900/70 backdrop-blur-2xl p-8 shadow-2xl">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mb-5">
                    <ShieldCheck className="h-7 w-7 text-indigo-300" />
                </div>
                <h1 className="text-2xl font-black tracking-tight">Verificar recibo</h1>
                <p className="text-sm text-zinc-400 mt-2">
                    Escribe el código de verificación que aparece junto al QR del recibo para confirmar que fue emitido y validado por la administración.
                </p>
                <form method="get" className="mt-6 space-y-3">
                    <input
                        name="codigo"
                        defaultValue={codigo || ''}
                        placeholder="XXXX-XXXX"
                        autoComplete="off"
                        maxLength={9}
                        className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-indigo-500 focus:outline-none text-center text-lg font-mono tracking-[0.3em] uppercase"
                    />
                    <button type="submit" className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold flex items-center justify-center gap-2 transition-colors">
                        <Search className="h-4 w-4" /> Verificar
                    </button>
                </form>
                {notFound && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-red-400">
                        <XCircle className="h-4 w-4 shrink-0" /> No existe ningún recibo con ese código. Revisa que esté bien escrito.
                    </p>
                )}
            </main>
        </div>
    )
}
