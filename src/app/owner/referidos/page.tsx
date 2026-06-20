import { ownerGetRewardPaymentsAction } from '@/app/actions/benefit-actions'
import { ReferidosClient } from './referidos-client'
import { AlertCircle, Database, Terminal } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Gestión de Referidos | InmobiGo Platform Owner',
    description: 'Aprobación y pago de comisiones de referidos para administradores.',
}

export default async function OwnerReferidosPage() {
    // Fetch all reward payments
    const result = await ownerGetRewardPaymentsAction()

    // Handle DB Not Ready
    if (!result.success && (result.error === '42P01' || (result.error && result.error.includes('relation')))) {
        return (
            <div className="mx-auto max-w-3xl p-6 md:p-12">
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-8 md:p-10 space-y-6 backdrop-blur-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
                    
                    <div className="flex items-center gap-4 border-b border-zinc-800 pb-5">
                        <div className="h-12 w-12 bg-amber-500/10 text-amber-500 rounded-2xl flex items-center justify-center">
                            <Database size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Configuración de Base de Datos requerida</h2>
                            <p className="text-xs text-zinc-500">Módulo de Referidos & Recompensas 🎁</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            Las tablas y columnas del Sistema de Recompensas de Referidos no han sido creadas en tu base de datos de Supabase.
                        </p>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                            Por favor, copia y ejecuta la migración SQL contenida en el siguiente archivo en el **Editor SQL de Supabase** (o aplícala mediante la CLI de Supabase si está enlazada):
                        </p>

                        {/* Path box */}
                        <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-850 flex items-center gap-3 text-xs font-mono text-zinc-300">
                            <Terminal size={14} className="text-indigo-400" />
                            <span>supabase/migrations/20260620_referral_rewards.sql</span>
                        </div>

                        <div className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800 text-xs text-zinc-500 space-y-2">
                            <p className="font-bold text-zinc-400 uppercase tracking-widest text-[9px]">Instrucciones para aplicar:</p>
                            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                                <li>Ve al panel de control de tu proyecto en <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Supabase</a>.</li>
                                <li>Selecciona **SQL Editor** en el menú de la izquierda.</li>
                                <li>Haz clic en **New query** (Nueva consulta).</li>
                                <li>Copia el contenido del archivo de migración creado localmente y pégalo en el editor.</li>
                                <li>Haz clic en **Run** (Ejecutar) en la esquina inferior derecha.</li>
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (!result.success) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center text-zinc-500 p-6 text-center max-w-md mx-auto">
                <AlertCircle size={40} className="text-rose-500/80 mb-3" />
                <h3 className="font-bold text-white text-lg">Error al Cargar Referidos</h3>
                <p className="text-sm text-zinc-500 mt-1">{result.error || 'Ocurrió un error inesperado al consultar los datos.'}</p>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <ReferidosClient initialPayments={result.data || []} />
        </div>
    )
}
