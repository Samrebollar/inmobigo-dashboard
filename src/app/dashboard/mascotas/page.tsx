import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PawPrint, AlertTriangle, CheckCircle2, Home, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Mascotas | InmobiGo',
    description: 'Registro de mascotas por privada y bitacora de mascotas perdidas/encontradas.',
}

const ESPECIES_LABEL: Record<string, string> = { perro: 'Perro', gato: 'Gato', otro: 'Otro' }
const ACCION_LABEL: Record<string, string> = { registrada: 'Registrada', perdida: 'Reportada perdida', encontrada: 'Encontrada' }

function KPICard({ label, value, icon: Icon, color, sub }: { label: string; value: number | string; icon: any; color: string; sub?: string }) {
    return (
        <div className={`relative overflow-hidden p-4 rounded-2xl bg-white/[0.03] border ${color.replace('text-', 'border-').replace('400', '500/40')} hover:bg-white/[0.05] transition-all`}>
            <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl ${color.replace('text-', 'bg-').replace('400', '500/10')}`}>
                    <Icon size={18} className={color} />
                </div>
            </div>
            <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{label}</p>
            {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
        </div>
    )
}

export default async function MascotasAdminPage({ searchParams }: { searchParams: Promise<{ condominio?: string }> }) {
    const params = await searchParams
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const adminSupabase = createAdminClient()

    const { data: orgUser } = await adminSupabase
        .from('organization_users')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle()

    let orgId = orgUser?.organization_id

    if (!orgId) {
        const { data: owned } = await adminSupabase
            .from('organizations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle()
        orgId = owned?.id
    }

    if (!orgId) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-zinc-500">
                No se encontro un contexto de organizacion para este usuario.
            </div>
        )
    }

    const { data: condos } = await adminSupabase
        .from('condominiums')
        .select('id, name')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('name')

    const condominiumFilter = (condos || []).find(c => c.name === params.condominio)

    let petsQuery = adminSupabase
        .from('pets')
        .select('*, residents(first_name, last_name), units(unit_number), condominiums(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })

    if (condominiumFilter) {
        petsQuery = petsQuery.eq('condominium_id', condominiumFilter.id)
    }

    const { data: petsRaw } = await petsQuery

    const pets = (petsRaw || []).map((p: any) => ({
        ...p,
        owner_name: p.residents ? `${p.residents.first_name || ''} ${p.residents.last_name || ''}`.trim() : 'N/D',
        unit_number: p.units?.unit_number || 'N/D',
        condominium_name: p.condominiums?.name || 'N/D',
    }))

    let eventsQuery = adminSupabase
        .from('pet_events')
        .select('*, pets(name), condominiums(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(30)

    if (condominiumFilter) {
        eventsQuery = eventsQuery.eq('condominium_id', condominiumFilter.id)
    }

    const { data: eventsRaw } = await eventsQuery

    const events = (eventsRaw || []).map((e: any) => ({
        ...e,
        pet_name: e.pets?.name || 'N/D',
        condominium_name: e.condominiums?.name || 'N/D',
    }))

    const totalMascotas = pets.length
    const totalPerdidas = pets.filter(p => p.status === 'perdida').length
    const inicioMes = new Date()
    inicioMes.setDate(1)
    inicioMes.setHours(0, 0, 0, 0)
    const registradasEsteMes = pets.filter(p => new Date(p.created_at) >= inicioMes).length

    return (
        <div className="mx-auto max-w-7xl space-y-8 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <PawPrint className="h-7 w-7 text-amber-400" />
                    Mascotas
                </h1>
                <p className="text-zinc-400">Registro de mascotas y bitacora de perdidas/encontradas por privada.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <KPICard label="Mascotas registradas" value={totalMascotas} icon={PawPrint} color="text-amber-400" />
                <KPICard label="Perdidas ahora" value={totalPerdidas} icon={AlertTriangle} color="text-rose-400" />
                <KPICard label="Registradas este mes" value={registradasEsteMes} icon={CheckCircle2} color="text-emerald-400" />
            </div>

            {condos && condos.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/dashboard/mascotas"
                        className={cn(
                            'px-4 py-2 text-xs font-bold rounded-xl border transition-all',
                            !condominiumFilter ? 'bg-amber-600/20 text-amber-400 border-amber-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        )}
                    >
                        Todas las privadas
                    </Link>
                    {condos.map(c => (
                        <Link
                            key={c.id}
                            href={`/dashboard/mascotas?condominio=${encodeURIComponent(c.name)}`}
                            className={cn(
                                'px-4 py-2 text-xs font-bold rounded-xl border transition-all',
                                condominiumFilter?.id === c.id ? 'bg-amber-600/20 text-amber-400 border-amber-500/40' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                            )}
                        >
                            {c.name}
                        </Link>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-900/40 border border-amber-500/20 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-amber-500/20">
                        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Home className="h-4 w-4 text-amber-400" />
                            Mascotas registradas
                        </h2>
                    </div>
                    {pets.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500 text-sm">No hay mascotas registradas.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-800/50">
                                        <th className="px-6 py-3">Mascota</th>
                                        <th className="px-6 py-3">Dueno</th>
                                        <th className="px-6 py-3">Unidad</th>
                                        <th className="px-6 py-3">Privada</th>
                                        <th className="px-6 py-3">Estatus</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/30">
                                    {pets.map((pet: any) => (
                                        <tr key={pet.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    {pet.photo_url ? (
                                                        <img src={pet.photo_url} alt={pet.name} className="w-8 h-8 rounded-lg object-cover" />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                            <PawPrint className="h-4 w-4 text-zinc-600" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-bold text-white">{pet.name}</p>
                                                        <p className="text-[11px] text-zinc-500">{ESPECIES_LABEL[pet.species] || pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-zinc-300">{pet.owner_name}</td>
                                            <td className="px-6 py-3 text-zinc-400">{pet.unit_number}</td>
                                            <td className="px-6 py-3 text-zinc-400">{pet.condominium_name}</td>
                                            <td className="px-6 py-3">
                                                {pet.status === 'perdida' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                                        <AlertTriangle size={10} /> Perdida
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                        <CheckCircle2 size={10} /> Activa
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="bg-zinc-900/40 border border-amber-500/20 rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-amber-500/20">
                        <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                            <Clock className="h-4 w-4 text-amber-400" />
                            Bitacora de eventos
                        </h2>
                    </div>
                    {events.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500 text-sm">Sin eventos registrados.</div>
                    ) : (
                        <div className="divide-y divide-zinc-800/30 max-h-[500px] overflow-y-auto">
                            {events.map((e: any) => (
                                <div key={e.id} className="px-6 py-3">
                                    <p className="text-sm text-white">
                                        <span className="font-bold">{e.pet_name}</span> — {ACCION_LABEL[e.action] || e.action}
                                    </p>
                                    <p className="text-[11px] text-zinc-500">
                                        {e.condominium_name} · {new Date(e.created_at).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
