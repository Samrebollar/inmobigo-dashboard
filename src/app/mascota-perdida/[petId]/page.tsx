import { createAdminClient } from '@/utils/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { PawPrint, MapPin, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

export const metadata = {
    title: 'Mascota Perdida | InmobiGo',
    description: 'Alerta de mascota perdida'
}

const ESPECIES_LABEL: Record<string, string> = { perro: 'Perro', gato: 'Gato', otro: 'Otra mascota' }

export default async function MascotaPerdidaPage({ params }: { params: { petId: string } }) {
    const supabase = createAdminClient()

    const { data: pet, error } = await supabase
        .from('pets')
        .select('*, condominiums(name), units(unit_number)')
        .eq('id', params.petId)
        .maybeSingle()

    if (error || !pet) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-6 text-white font-sans">
                <Card className="bg-zinc-900 border-zinc-800 max-w-sm w-full mx-auto shadow-2xl overflow-hidden rounded-[2rem]">
                    <div className="bg-red-500/10 p-8 flex flex-col items-center border-b border-red-500/20">
                        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 ring-4 ring-red-500/30">
                            <XCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-2">Mascota no encontrada</h1>
                        <p className="text-zinc-400 text-center text-sm">Este enlace ya no es valido.</p>
                    </div>
                </Card>
            </div>
        )
    }

    const yaFueEncontrada = pet.status !== 'perdida'

    if (yaFueEncontrada) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-6 text-white font-sans relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/20 blur-[130px] rounded-full pointer-events-none" />
                <Card className="bg-zinc-900/60 backdrop-blur-2xl border-zinc-800 max-w-sm w-full mx-auto shadow-2xl relative z-10 overflow-hidden rounded-[2.5rem]">
                    <div className="bg-emerald-500/10 p-8 flex flex-col items-center border-b border-emerald-500/20">
                        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                            <CheckCircle2 className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight text-white mb-2 text-center">¡{pet.name} ya aparecio!</h1>
                        <p className="text-zinc-400 text-center text-sm">Gracias por tu ayuda. Este caso ya se cerro.</p>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-6 text-white font-sans relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/20 blur-[130px] rounded-full pointer-events-none" />
            <div className="max-w-md w-full relative z-10 space-y-6">
                <div className="text-center space-y-2 mb-4">
                    <div className="inline-flex items-center gap-2 justify-center py-1.5 px-4 bg-zinc-900 rounded-full border border-zinc-800 mb-4 shadow-xl">
                        <PawPrint className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Mascota Perdida</span>
                    </div>
                </div>

                <Card className="bg-zinc-900/60 backdrop-blur-2xl border-zinc-800 overflow-hidden shadow-2xl shadow-amber-900/20 rounded-[2.5rem]">
                    {pet.photo_url ? (
                        <div className="w-full aspect-square bg-zinc-950">
                            <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-full aspect-square bg-zinc-950 flex items-center justify-center">
                            <PawPrint className="w-20 h-20 text-zinc-700" />
                        </div>
                    )}

                    <CardContent className="p-8 space-y-6">
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white mb-1">{pet.name}</h1>
                            <p className="text-zinc-400 text-sm">
                                {ESPECIES_LABEL[pet.species] || pet.species}
                                {pet.breed ? ` · ${pet.breed}` : ''}
                                {pet.color ? ` · ${pet.color}` : ''}
                            </p>
                        </div>

                        <div className="p-6 bg-black/40 rounded-3xl border border-zinc-800/80 space-y-6 shadow-inner">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-zinc-800/80 rounded-xl"><MapPin className="w-5 h-5 text-amber-400" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Privada</p>
                                    <p className="text-lg font-bold text-white">{pet.condominiums?.name || 'N/D'}</p>
                                </div>
                            </div>

                            <div className="h-px bg-zinc-800/60 w-full" />

                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-zinc-800/80 rounded-xl"><Clock className="w-5 h-5 text-zinc-400" /></div>
                                <div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Perdida desde</p>
                                    <p className="text-sm font-bold text-white capitalize">
                                        {pet.lost_at ? format(new Date(pet.lost_at), "EEEE d, MMM - HH:mm", { locale: es }) : 'N/D'}
                                    </p>
                                </div>
                            </div>

                            {pet.lost_notes && (
                                <>
                                    <div className="h-px bg-zinc-800/60 w-full" />
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-zinc-800/80 rounded-xl"><PawPrint className="w-5 h-5 text-zinc-400" /></div>
                                        <div>
                                            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Notas</p>
                                            <p className="text-sm text-zinc-300">{pet.lost_notes}</p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <p className="text-center text-xs text-zinc-500">Si la ves, por favor contacta a la administracion de tu privada.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
