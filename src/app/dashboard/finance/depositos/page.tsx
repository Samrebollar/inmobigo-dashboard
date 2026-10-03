import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { canOperateOrgFinance } from '@/lib/finance-auth'

export const dynamic = 'force-dynamic'

const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDate = (iso: string | null) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—')
const METHOD: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', saldo_a_favor: 'Saldo a favor' }
const STATUS: Record<string, { label: string; cls: string }> = {
    pendiente_pago: { label: 'Por pagar', cls: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
    en_resguardo: { label: 'En resguardo', cls: 'text-indigo-300 bg-indigo-500/10 border-indigo-500/20' },
    devuelto: { label: 'Devuelto', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    retenido_parcial: { label: 'Retenido parcial', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    retenido: { label: 'Retenido', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
}

/**
 * Depósitos en garantía de reservas de amenidades: dinero de los residentes
 * en resguardo (no es ingreso). Muestra lo que se tiene, lo que falta
 * devolver y lo devuelto o retenido por daños.
 */
export default async function DepositosPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const admin = createAdminClient()
    const [{ data: member }, { data: ownedOrg }] = await Promise.all([
        admin.from('organization_users').select('organization_id').eq('user_id', user.id).maybeSingle(),
        admin.from('organizations').select('id').eq('owner_id', user.id).limit(1).maybeSingle(),
    ])
    const organizationId = member?.organization_id || ownedOrg?.id
    if (!organizationId || !(await canOperateOrgFinance(admin, user.id, organizationId))) redirect('/dashboard')

    const { data } = await admin
        .from('amenity_reservations')
        .select('id, reservation_date, resident_id, deposit_amount, deposit_status, deposit_refunded_amount, deposit_retained_amount, deposit_refund_method, deposit_settled_at, deposit_notes, deposit_photo_paths, amenities(name), profiles:resident_id(full_name)')
        .eq('organization_id', organizationId)
        .neq('deposit_status', 'none')
        .order('reservation_date', { ascending: false })
        .limit(500)
    const rows = (data || []) as any[]

    // Fotos de los daños (bucket privado): URLs firmadas por 1 hora
    const allPaths = rows.flatMap((r) => r.deposit_photo_paths || [])
    const signed = allPaths.length
        ? (await admin.storage.from('amenity_damage_evidence').createSignedUrls(allPaths, 3600)).data || []
        : []
    const urlByPath = new Map(signed.map((s: any) => [s.path, s.signedUrl]))

    const sum = (list: any[], key: string) => list.reduce((acc, r) => acc + Number(r[key] || 0), 0)
    const held = rows.filter((r) => r.deposit_status === 'en_resguardo')
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const toSettle = held.filter((r) => r.reservation_date <= today)
    const settled = rows.filter((r) => ['devuelto', 'retenido', 'retenido_parcial'].includes(r.deposit_status))

    const cards = [
        { label: 'En resguardo', value: money(sum(held, 'deposit_amount')), hint: `${held.length} depósito${held.length === 1 ? '' : 's'}`, cls: 'text-indigo-300' },
        { label: 'Por liquidar (evento ya pasó)', value: money(sum(toSettle, 'deposit_amount')), hint: `${toSettle.length} pendiente${toSettle.length === 1 ? '' : 's'}`, cls: 'text-amber-400' },
        { label: 'Devuelto', value: money(sum(settled, 'deposit_refunded_amount')), hint: 'A los residentes', cls: 'text-emerald-400' },
        { label: 'Retenido por daños', value: money(sum(settled, 'deposit_retained_amount')), hint: 'Ingreso del condominio', cls: 'text-rose-400' },
    ]

    return (
        <div className="mx-auto max-w-7xl space-y-6 p-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/finance" className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                        <ShieldCheck className="h-6 w-6 text-indigo-400" /> Depósitos en garantía
                    </h1>
                    <p className="text-zinc-400 text-sm">Depósitos de reservas de amenidades. No son ingreso: se devuelven después del evento o se retienen por daños. Se liquidan desde Avisos → Reservas.</p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((c) => (
                    <div key={c.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
                        <p className="text-xs font-semibold text-zinc-400">{c.label}</p>
                        <p className={`mt-2 text-2xl font-black ${c.cls}`}>{c.value}</p>
                        <p className="mt-1 text-xs text-zinc-500">{c.hint}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-left text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
                            <th className="px-4 py-3">Amenidad / Evento</th>
                            <th className="px-4 py-3">Residente</th>
                            <th className="px-4 py-3 text-right">Depósito</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Liquidación</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/70">
                        {rows.length === 0 && (
                            <tr><td colSpan={5} className="px-4 py-10 text-center text-zinc-500">Aún no hay depósitos en garantía.</td></tr>
                        )}
                        {rows.map((r) => {
                            const st = STATUS[r.deposit_status] || { label: r.deposit_status, cls: 'text-zinc-400 bg-zinc-800 border-zinc-700' }
                            return (
                                <tr key={r.id} className="text-zinc-300">
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-white">{r.amenities?.name || 'Amenidad'}</p>
                                        <p className="text-xs text-zinc-500">{fmtDate(r.reservation_date)}</p>
                                    </td>
                                    <td className="px-4 py-3">{r.profiles?.full_name || '—'}</td>
                                    <td className="px-4 py-3 text-right font-semibold text-white">{money(Number(r.deposit_amount || 0))}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>{st.label}</span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-zinc-400">
                                        {r.deposit_settled_at ? (
                                            <>
                                                <p>
                                                    {Number(r.deposit_refunded_amount || 0) > 0 && `Devuelto ${money(Number(r.deposit_refunded_amount))} (${METHOD[r.deposit_refund_method] || r.deposit_refund_method})`}
                                                    {Number(r.deposit_refunded_amount || 0) > 0 && Number(r.deposit_retained_amount || 0) > 0 && ' · '}
                                                    {Number(r.deposit_retained_amount || 0) > 0 && `Retenido ${money(Number(r.deposit_retained_amount))}`}
                                                </p>
                                                <p className="text-zinc-500">{fmtDate(r.deposit_settled_at)}{r.deposit_notes ? ` · ${r.deposit_notes}` : ''}</p>
                                                {(r.deposit_photo_paths || []).length > 0 && (
                                                    <div className="mt-1.5 flex gap-1.5">
                                                        {(r.deposit_photo_paths as string[]).map((path) => urlByPath.get(path) && (
                                                            <a key={path} href={urlByPath.get(path)} target="_blank" rel="noopener noreferrer" className="block h-10 w-10 rounded-md overflow-hidden border border-zinc-700">
                                                                <img src={urlByPath.get(path)} alt="Daño" className="h-full w-full object-cover" />
                                                            </a>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : r.deposit_status === 'en_resguardo' && r.reservation_date <= today ? (
                                            <span className="text-amber-400">Pendiente de liquidar</span>
                                        ) : '—'}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
