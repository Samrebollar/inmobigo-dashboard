import { getAccountingData } from '@/app/actions/accounting-server-actions'
import { RegimeSelector } from '@/components/dashboard/accounting/regime-selector'
import { AccountingClient } from '@/components/dashboard/accounting/accounting-client'
import { Suspense } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowLeft } from 'lucide-react'

export default async function ContabilidadInteligentePage() {
    const data = await getAccountingData()

    if (!data.organizationId) {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 space-y-6 text-center">
                <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-600 shadow-2xl relative overflow-hidden">
                    <Sparkles size={32} className="text-zinc-700" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent animate-pulse" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white tracking-tight">Organización no encontrada</h2>
                    <p className="text-zinc-500 max-w-sm mx-auto leading-relaxed">
                        Parece que no tienes una organización vinculada a tu cuenta. Contacta a soporte o al dueño del sistema para que te asignen a un condominio.
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

    if (!data.regime) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-4">
                <RegimeSelector />
            </div>
        )
    }

    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="h-10 w-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            </div>
        }>
            <AccountingClient 
                initialData={data.records} 
                regime={data.regime}
                organizationId={data.organizationId} 
            />
        </Suspense>
    )
}
