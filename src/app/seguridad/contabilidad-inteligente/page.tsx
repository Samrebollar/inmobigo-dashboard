import { getAccountingData } from '@/app/actions/accounting-server-actions'
import { RegimeSelector } from '@/components/seguridad/accounting/regime-selector'
import { AccountingClient } from '@/components/seguridad/accounting/accounting-client'
import { Suspense } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'

export default async function ContabilidadInteligentePage({
    searchParams
}: {
    searchParams: Promise<{ condo?: string }>
}) {
    const params = await searchParams
    const selectedCondoId = params?.condo || 'all'
    const data = await getAccountingData(selectedCondoId)

    if (!data.success) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-6 text-center">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-600 shadow-2xl relative overflow-hidden">
                    <Sparkles size={32} className="text-zinc-700" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">Acceso Restringido</h2>
                    <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed">
                        No se pudo cargar la información financiera. Asegúrate de tener una organización activa y permisos de administrador.
                    </p>
                </div>
                <Link 
                    href="/seguridad"
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-zinc-700 transition-all text-sm group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Volver al Dashboard</span>
                </Link>
            </div>
        )
    }

    return (
        <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="h-12 w-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
                <p className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em] animate-pulse">Sincronizando Libro Financiero...</p>
            </div>
        }>
            <AccountingClient 
                data={data}
                organizationId={data.organizationId as string}
            />
        </Suspense>
    )
}
