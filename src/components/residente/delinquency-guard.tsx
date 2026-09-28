import Link from 'next/link'
import { Lock, CreditCard, ClipboardList, AlertTriangle } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { getEffectiveResidentDelinquency } from '@/lib/resident-delinquency'

const formatMoney = (value: number) =>
    value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })

/**
 * Bloquea una sección del panel del residente (Amenidades, Servicios,
 * Contacto) mientras tenga pagos vencidos. Solo aplica con la suscripción
 * del administrador activa.
 */
export async function DelinquencyGuard({ section, children }: { section: string; children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return <>{children}</>

    const admin = createAdminClient()
    const { data: resident } = await admin
        .from('residents')
        .select('id, condominium_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

    const status = await getEffectiveResidentDelinquency(admin, resident)
    if (!status.delinquent) return <>{children}</>

    return (
        <div className="flex min-h-[70vh] items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-3xl border border-rose-500/20 bg-zinc-950 p-8 text-center shadow-[0_0_80px_-20px_rgba(244,63,94,0.25)]">
                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-white/5 bg-zinc-900">
                    <Lock className="h-8 w-8 text-rose-400" />
                </div>
                <h1 className="mb-3 text-2xl font-black tracking-tight text-white">{section}</h1>
                <p className="mb-6 text-sm leading-relaxed text-zinc-400">
                    Tienes pagos vencidos, por eso <strong className="text-zinc-300">Amenidades, Servicios y Contacto</strong> están
                    bloqueados. Ponte al corriente o solicita un convenio de pago para volver a usarlos.
                </p>

                <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-left text-sm">
                    {status.overdueCount > 0 && (
                        <div className="flex items-center justify-between text-zinc-300">
                            <span>Adeudo vencido ({status.overdueCount} {status.overdueCount === 1 ? 'cargo' : 'cargos'})</span>
                            <span className="font-bold text-rose-300">{formatMoney(status.overdueAmount)}</span>
                        </div>
                    )}
                    {status.hasOverdueInstallment && (
                        <div className="mt-2 flex items-center gap-2 text-amber-300">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            <span>Tienes una parcialidad de tu convenio vencida.</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <Link
                        href="/residente/payments"
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
                    >
                        <CreditCard className="h-4 w-4" />
                        Pagar ahora
                    </Link>
                    <Link
                        href="/residente/convenios"
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-800"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Solicitar convenio
                    </Link>
                </div>
            </div>
        </div>
    )
}
